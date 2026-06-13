import {
  Update,
  Start,
  Command,
  Ctx,
  InjectBot,
  Action,
  On,
} from 'nestjs-telegraf';
import { OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Telegraf, Markup } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { TestsService } from '../tests/tests.service';
import { GroupsService } from '../groups/groups.service';
import { QuestionsService } from '../questions/questions.service';
import { SessionsService } from '../sessions/sessions.service';
import { ResultsService } from '../results/results.service';
import { AdminService } from '../admin/admin.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Test } from '../tests/entities/test.entity';
import { Group } from '../groups/entities/group.entity';
import { Question } from '../questions/entities/question.entity';

// ── State machine ────────────────────────────────────────────────────────────

type ConvStep =
  | 'idle'
  | 'creating_test_name'
  | 'creating_test_desc'
  | 'creating_test_time'
  | 'creating_group_name'
  | 'creating_group_desc'
  | 'joining_group'
  | 'adding_question_body'
  | 'adding_option'
  | 'picking_correct_option'
  | 'taking_test'
  | 'changing_password_old'
  | 'changing_password_new'
  | 'admin_user_search'
  | 'editing_plan_price';

interface ConvState {
  step: ConvStep;
  // Cached lists for index-based callbacks (avoids 64-byte callback data limit)
  tests?: Test[];
  groups?: Group[];
  questions?: Question[];
  // Draft objects for multi-step creation
  draftTestName?: string;
  draftTestDesc?: string;
  draftGroupName?: string;
  // Currently focused IDs
  focusTestId?: string;
  focusGroupId?: string;
  // Question creation
  draftQuestionBody?: string;
  draftOptions?: string[];
  // Test-taking
  sessionId?: string;
  testId?: string;
  questionOrder?: string[];
  questionIdx?: number;
  // Option IDs for current question (to save answers)
  currentOptionIds?: string[];
  // Password change
  oldPassword?: string;
  // Admin: cached user list / plan list
  adminUsers?: any[];
  adminPlans?: any[];
  focusPlanId?: string;
  focusPlanName?: string;
}

const MAX_RETRY_ATTEMPTS = 8;
const BASE_RETRY_MS = 2000;
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

@Update()
export class TelegramUpdate implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramUpdate.name);
  private stopped = false;
  private frontendUrl: string;
  private readonly states = new Map<number, ConvState>();

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    private authService: AuthService,
    private testsService: TestsService,
    private groupsService: GroupsService,
    private questionsService: QuestionsService,
    private sessionsService: SessionsService,
    private resultsService: ResultsService,
    private adminService: AdminService,
    private analyticsService: AnalyticsService,
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
    private config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async onApplicationBootstrap() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN') || '';
    const username = this.config.get<string>('TELEGRAM_BOT_USERNAME') || '';
    const webhookUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL') || '';

    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
      return;
    }

    if (webhookUrl) {
      await this.startWebhook(username, webhookUrl);
    } else {
      this.startPollingWithRetry(username, 0);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private state(chatId: number): ConvState {
    if (!this.states.has(chatId)) this.states.set(chatId, { step: 'idle' });
    return this.states.get(chatId)!;
  }

  private setState(chatId: number, patch: Partial<ConvState>) {
    this.states.set(chatId, { ...this.state(chatId), ...patch });
  }

  private resetState(chatId: number) {
    this.states.set(chatId, { step: 'idle' });
  }

  private openAppButton() {
    return Markup.button.url('🌐 Open App', this.frontendUrl);
  }

  private async getLinkedUser(ctx: Context): Promise<User | null> {
    const telegramId = String(ctx.from?.id);
    return this.usersRepo.findOne({ where: { telegramId } }) ?? null;
  }

  private async requireLinkedUser(ctx: Context): Promise<User | null> {
    const user = await this.getLinkedUser(ctx);
    if (!user) {
      await this.editOrReply(ctx, 
        '⚠️ Your Telegram is not linked to any CheckLab account.\n\n' +
          'Use <code>/link TOKEN</code> to connect your account.',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔗 How to Link', 'action_link_help')],
          ]),
        },
      );
      return null;
    }
    return user;
  }

  private isAdmin(user: User) {
    return [UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPPORT].includes(
      user.role,
    );
  }

  private mainMenu(user: User) {
    if (this.isAdmin(user)) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('📊 Platform Stats', 'adm_stats'),
          Markup.button.callback('👥 Users', 'adm_users'),
        ],
        [
          Markup.button.callback('💳 Payments', 'adm_payments'),
          Markup.button.callback('📋 Subscriptions', 'adm_subs'),
        ],
        [
          Markup.button.callback('💎 Plan Prices', 'adm_plans'),
          Markup.button.callback('👤 Profile', 'prof_menu'),
        ],
        [this.openAppButton()],
      ]);
    }
    if (user.role === UserRole.TEACHER) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('📋 My Tests', 't_list'),
          Markup.button.callback('➕ New Test', 't_new'),
        ],
        [
          Markup.button.callback('👥 My Groups', 'g_list'),
          Markup.button.callback('➕ New Group', 'g_new'),
        ],
        [
          Markup.button.callback('📈 Analytics', 'ana_overview'),
          Markup.button.callback('👤 Profile', 'prof_menu'),
        ],
        [this.openAppButton()],
      ]);
    }
    // student
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📋 My Tests', 's_tests'),
        Markup.button.callback('📊 My Results', 's_results'),
      ],
      [
        Markup.button.callback('👥 My Groups', 's_groups'),
        Markup.button.callback('🔗 Join Group', 's_join'),
      ],
      [Markup.button.callback('👤 Profile', 'prof_menu'), this.openAppButton()],
    ]);
  }

  private fmt(n: number | null | undefined): string {
    return n != null ? Number(n).toFixed(1) : '–';
  }

  private async editOrReply(ctx: Context, text: string, extra?: any) {
    try {
      await ctx.editMessageText(text, extra);
    } catch {
      await this.editOrReply(ctx, text, extra);
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  private async startWebhook(username: string, webhookUrl: string) {
    try {
      await this.bot.telegram.setWebhook(webhookUrl);
      this.logger.log(`Telegram bot @${username} using webhook: ${webhookUrl}`);
    } catch (err: any) {
      this.logger.warn(
        `Telegram webhook setup failed for @${username} (${err?.code ?? err?.message}). Bot will not receive messages.`,
      );
    }
  }

  private startPollingWithRetry(username: string, attempt: number) {
    if (this.stopped) return;

    this.bot
      .launch({ dropPendingUpdates: true }, () => {
        this.logger.log(`✅ Telegram bot @${username} connected via polling.`);
      })
      .catch((err: any) => {
        if (this.stopped) return;
        const code = err?.response?.error_code ?? err?.code ?? err?.message;
        if (code === 409) {
          this.logger.warn(
            `Telegram bot @${username} conflict (409): another instance is already polling.`,
          );
          return;
        }
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          this.logger.warn(
            `Telegram bot @${username} gave up after ${MAX_RETRY_ATTEMPTS} attempts (${code}).`,
          );
          return;
        }
        const delaySec = Math.min(
          (BASE_RETRY_MS * Math.pow(2, attempt)) / 1000,
          120,
        );
        this.logger.warn(
          `Telegram polling failed (${code}). Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} in ${delaySec}s…`,
        );
        setTimeout(
          () => this.startPollingWithRetry(username, attempt + 1),
          delaySec * 1000,
        );
      });
  }

  // ── /start ──────────────────────────────────────────────────────────────────

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id;
    this.resetState(chatId);

    const name = ctx.from?.first_name || 'there';
    const user = await this.getLinkedUser(ctx);

    if (!user) {
      await this.editOrReply(ctx, 
        `👋 Hello, <b>${name}</b>!\n\n` +
          `I'm the <b>CheckLab</b> bot. I can do everything you can on the website.\n\n` +
          `First, link your account:\n` +
          `1. Open CheckLab → <b>Profile → Connect Telegram</b>\n` +
          `2. Copy your link token\n` +
          `3. Send: <code>/link YOUR_TOKEN</code>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔗 How to Link', 'action_link_help')],
            [this.openAppButton()],
          ]),
        },
      );
      return;
    }

    const roleLabel =
      user.role === UserRole.TEACHER ? '👨‍🏫 Teacher' : '🎓 Student';
    await this.editOrReply(ctx, 
      `👋 Welcome back, <b>${user.firstName}</b>!\n` +
        `${roleLabel} · ${user.email}\n\n` +
        `What would you like to do?`,
      { parse_mode: 'HTML', ...this.mainMenu(user) },
    );
  }

  @Command('help')
  async onHelp(@Ctx() ctx: Context) {
    await this.editOrReply(ctx, 
      `📚 <b>CheckLab Bot Commands</b>\n\n` +
        `/start — Main menu\n` +
        `/link TOKEN — Connect your account\n` +
        `/me — Show linked account\n` +
        `/tests — List tests\n` +
        `/groups — List groups\n` +
        `/results — Your results\n` +
        `/unlink — Disconnect account\n` +
        `/cancel — Cancel current action`,
      { parse_mode: 'HTML' },
    );
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step === 'idle') {
      await this.editOrReply(ctx, 'Nothing to cancel.');
      return;
    }
    this.resetState(chatId);
    await this.editOrReply(ctx, '❌ Cancelled.', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Main Menu', 'menu')],
      ]),
    });
  }

  // ── /link, /me, /unlink ──────────────────────────────────────────────────────

  @Command('link')
  async onLink(@Ctx() ctx: Context) {
    const msg = ctx.message as any;
    const token = (msg?.text || '').split(' ')[1]?.trim().toUpperCase();

    if (!token) {
      return void ctx.reply(
        '🔗 <b>How to Link Your Account</b>\n\n' +
          '1. Open CheckLab → <b>Profile → Connect Telegram</b>\n' +
          '2. Copy your link token\n' +
          '3. Send: <code>/link YOUR_TOKEN</code>',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[this.openAppButton()]]),
        },
      );
    }

    const from = ctx.from!;
    try {
      const user = await this.authService.linkTelegramAccount(
        token,
        String(from.id),
        from.username || '',
        String(ctx.chat?.id || from.id),
      );
      await this.editOrReply(ctx, 
        `✅ <b>Linked!</b>\n\n📧 ${user.email}\n👤 ${user.firstName} ${user.lastName}\n\nWhat would you like to do?`,
        { parse_mode: 'HTML', ...this.mainMenu(user) },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to link. Try again.'}`);
    }
  }

  @Command('me')
  async onMe(@Ctx() ctx: Context) {
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.editOrReply(ctx, 
      `👤 <b>Your Account</b>\n\n📧 ${user.email}\n👤 ${user.firstName} ${user.lastName}\n🎓 Role: ${user.role}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🏠 Main Menu', 'menu'),
            Markup.button.callback('🔓 Unlink', 'action_unlink'),
          ],
        ]),
      },
    );
  }

  @Command('unlink')
  async onUnlink(@Ctx() ctx: Context) {
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.editOrReply(ctx, '⚠️ Unlink your Telegram from CheckLab?', {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Yes', 'action_unlink_confirm'),
          Markup.button.callback('❌ No', 'menu'),
        ],
      ]),
    });
  }

  // ── /tests, /groups, /results ────────────────────────────────────────────────

  @Command('tests')
  async onTests(@Ctx() ctx: Context) {
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    if (user.role === UserRole.TEACHER) {
      await this.showTeacherTests(ctx, user);
    } else {
      await this.showStudentTests(ctx, user);
    }
  }

  @Command('groups')
  async onGroups(@Ctx() ctx: Context) {
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    if (user.role === UserRole.TEACHER) {
      await this.showTeacherGroups(ctx, user);
    } else {
      await this.showStudentGroups(ctx, user);
    }
  }

  @Command('results')
  async onResults(@Ctx() ctx: Context) {
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showResults(ctx, user);
  }

  // ── Inline actions ───────────────────────────────────────────────────────────

  @Action('menu')
  async actionMenu(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.getLinkedUser(ctx);
    if (!user) {
      await this.onStart(ctx);
      return;
    }
    this.resetState(ctx.chat!.id);
    await this.editOrReply(ctx, '🏠 Main Menu:', { ...this.mainMenu(user) });
  }

  @Action('action_me')
  async actionMe(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    await this.onMe(ctx);
  }

  @Action('action_link_help')
  async actionLinkHelp(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    await this.editOrReply(ctx, 
      '1. Open CheckLab → <b>Profile → Connect Telegram</b>\n' +
        '2. Copy your link token\n' +
        '3. Send: <code>/link YOUR_TOKEN</code>',
      { parse_mode: 'HTML' },
    );
  }

  @Action('action_unlink')
  async actionUnlink(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    await this.editOrReply(ctx, '⚠️ Unlink your Telegram from CheckLab?', {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Yes', 'action_unlink_confirm'),
          Markup.button.callback('❌ No', 'menu'),
        ],
      ]),
    });
  }

  @Action('action_unlink_confirm')
  async actionUnlinkConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const telegramId = String(ctx.from?.id);
    const user = await this.usersRepo.findOne({ where: { telegramId } });
    if (!user) {
      await this.editOrReply(ctx, 'No linked account.');
      return;
    }
    await this.usersRepo.update(user.id, {
      telegramId: null,
      telegramUsername: null,
      telegramChatId: null,
    });
    await this.editOrReply(ctx, '✅ Unlinked. Use /link TOKEN to reconnect.');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TEACHER — Tests
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('t_list')
  async actionTList(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showTeacherTests(ctx, user);
  }

  @Action('t_new')
  async actionTNew(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    this.setState(ctx.chat!.id, { step: 'creating_test_name' });
    await this.editOrReply(ctx, '📝 <b>New Test</b>\n\nEnter the test <b>title</b>:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'menu')]]),
    });
  }

  @Action(/^t_view:(\d+)$/)
  async actionTView(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found. Try /tests again.');
      return;
    }
    this.setState(ctx.chat!.id, { focusTestId: test.id });
    await this.showTestDetail(ctx, test, idx);
  }

  @Action(/^t_pub:(\d+)$/)
  async actionTPub(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    try {
      const res = await this.testsService.publish(test.id, user.id);
      await this.editOrReply(ctx, 
        `✅ <b>Test Published!</b>\n\n🔑 Access Code: <code>${res.accessCode}</code>\n\nStudents can use this code at ${this.frontendUrl}/t`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', 't_list')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to publish'}`);
    }
  }

  @Action(/^t_del:(\d+)$/)
  async actionTDel(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    await this.editOrReply(ctx, `🗑️ Delete <b>${test.title}</b>? This cannot be undone.`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`✅ Yes, delete`, `t_del_c:${idx}`),
          Markup.button.callback('❌ Cancel', `t_view:${idx}`),
        ],
      ]),
    });
  }

  @Action(/^t_del_c:(\d+)$/)
  async actionTDelConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    try {
      await this.testsService.remove(test.id, user.id);
      await this.editOrReply(ctx, `✅ Test "<b>${test.title}</b>" deleted.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 My Tests', 't_list')],
        ]),
      });
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to delete'}`);
    }
  }

  @Action(/^t_qs:(\d+)$/)
  async actionTQuestions(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    await this.showQuestions(ctx, test, idx, user);
  }

  @Action(/^t_addq:(\d+)$/)
  async actionTAddQuestion(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    this.setState(ctx.chat!.id, {
      step: 'adding_question_body',
      focusTestId: test.id,
      draftOptions: [],
    });
    await this.editOrReply(ctx, 
      `📝 <b>Add Question to "${test.title}"</b>\n\nEnter the <b>question text</b>:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', `t_qs:${idx}`)],
        ]),
      },
    );
  }

  @Action(/^t_ag:(\d+)$/)
  async actionTAssignGroups(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }

    const groups = await this.groupsService.findAll(user.id, UserRole.TEACHER);
    if (!groups.length) {
      await this.editOrReply(ctx, 'You have no groups yet. Create a group first.', {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👥 Groups', 'g_list')],
        ]),
      });
      return;
    }

    this.setState(ctx.chat!.id, {
      focusTestId: test.id,
      groups: groups as Group[],
    });
    const buttons = (groups as Group[]).map((g, i) => [
      Markup.button.callback(`${g.name}`, `tg_c:${idx}:${i}`),
    ]);
    buttons.push([Markup.button.callback('⬅️ Back', `t_view:${idx}`)]);
    await this.editOrReply(ctx, `👥 Assign a group to <b>${test.title}</b>:`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action(/^tg_c:(\d+):(\d+)$/)
  async actionTAssignGroupConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const testIdx = parseInt((ctx as any).match[1], 10);
    const groupIdx = parseInt((ctx as any).match[2], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const groups = this.state(ctx.chat!.id).groups || [];
    const test = tests[testIdx];
    const group = groups[groupIdx];
    if (!test || !group) {
      await this.editOrReply(ctx, 'Not found.');
      return;
    }
    try {
      await this.testsService.assignGroups(test.id, user.id, {
        groupIds: [group.id],
      });
      await this.editOrReply(ctx, 
        `✅ Group "<b>${group.name}</b>" assigned to "<b>${test.title}</b>"!`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Test', `t_view:${testIdx}`)],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to assign'}`);
    }
  }

  @Action(/^t_res:(\d+)$/)
  async actionTResults(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    try {
      const results = await this.resultsService.getTestResults(
        test.id,
        user.id,
      );
      if (!results.length) {
        await this.editOrReply(ctx, `📊 No results for "<b>${test.title}</b>" yet.`, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', `t_view:${idx}`)],
          ]),
        });
        return;
      }
      const lines = results.slice(0, 15).map((r, i) => {
        const pct = Number(r.percentage).toFixed(1);
        const emoji =
          Number(r.percentage) >= 70
            ? '🟢'
            : Number(r.percentage) >= 50
              ? '🟡'
              : '🔴';
        const name = (r as any).student
          ? `${(r as any).student.firstName} ${(r as any).student.lastName}`
          : 'Unknown';
        return `${i + 1}. ${emoji} <b>${name}</b> — ${pct}%`;
      });
      await this.editOrReply(ctx, 
        `📊 <b>Results: ${test.title}</b> (${results.length} total)\n\n` +
          lines.join('\n'),
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', `t_view:${idx}`)],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to load results'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TEACHER — Groups
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('g_list')
  async actionGList(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showTeacherGroups(ctx, user);
  }

  @Action('g_new')
  async actionGNew(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    this.setState(ctx.chat!.id, { step: 'creating_group_name' });
    await this.editOrReply(ctx, '👥 <b>New Group</b>\n\nEnter the group <b>name</b>:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'menu')]]),
    });
  }

  @Action(/^g_view:(\d+)$/)
  async actionGView(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found. Try /groups again.');
      return;
    }
    this.setState(ctx.chat!.id, { focusGroupId: group.id });
    await this.showGroupDetail(ctx, group, idx);
  }

  @Action(/^g_mem:(\d+)$/)
  async actionGMembers(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    try {
      const members = await this.groupsService.getMembers(group.id, user.id);
      if (!members.length) {
        await this.editOrReply(ctx, `👥 <b>${group.name}</b> has no members yet.`, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', `g_view:${idx}`)],
          ]),
        });
        return;
      }
      const lines = members.map((m, i) => {
        const s = (m as any).student;
        return `${i + 1}. ${s?.firstName || ''} ${s?.lastName || ''} — ${s?.email || ''}`;
      });
      const kickButtons = members.slice(0, 6).map((m, i) => {
        const s = (m as any).student;
        return [
          Markup.button.callback(
            `🚫 Remove ${s?.firstName || i + 1}`,
            `g_kick:${idx}:${i}`,
          ),
        ];
      });
      this.setState(ctx.chat!.id, { questions: members as any });
      await this.editOrReply(ctx, 
        `👥 <b>${group.name}</b> — ${members.length} member(s)\n\n` +
          lines.join('\n'),
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            ...kickButtons,
            [Markup.button.callback('⬅️ Back', `g_view:${idx}`)],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to load members'}`);
    }
  }

  @Action(/^g_inv:(\d+)$/)
  async actionGInvite(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    await this.editOrReply(ctx, 
      `🔗 <b>Invite Code for "${group.name}"</b>\n\n<code>${group.inviteCode}</code>\n\nStudents can join with /joingroup or on the website.`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Regenerate', `g_regen:${idx}`)],
          [Markup.button.callback('⬅️ Back', `g_view:${idx}`)],
        ]),
      },
    );
  }

  @Action(/^g_regen:(\d+)$/)
  async actionGRegen(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    try {
      const res = await this.groupsService.regenerateInviteCode(
        group.id,
        user.id,
      );
      group.inviteCode = res.inviteCode;
      await this.editOrReply(ctx, `✅ New invite code: <code>${res.inviteCode}</code>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back', `g_view:${idx}`)],
        ]),
      });
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action(/^g_del:(\d+)$/)
  async actionGDel(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    await this.editOrReply(ctx, `🗑️ Delete group <b>${group.name}</b>?`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Yes', `g_del_c:${idx}`),
          Markup.button.callback('❌ No', `g_view:${idx}`),
        ],
      ]),
    });
  }

  @Action(/^g_del_c:(\d+)$/)
  async actionGDelConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    try {
      await this.groupsService.remove(group.id, user.id);
      await this.editOrReply(ctx, `✅ Group "<b>${group.name}</b>" deleted.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👥 My Groups', 'g_list')],
        ]),
      });
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to delete'}`);
    }
  }

  @Action(/^g_kick:(\d+):(\d+)$/)
  async actionGKick(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const groupIdx = parseInt((ctx as any).match[1], 10);
    const memberIdx = parseInt((ctx as any).match[2], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const members = this.state(ctx.chat!.id).questions || [];
    const group = groups[groupIdx];
    const member = members[memberIdx] as any;
    if (!group || !member) {
      await this.editOrReply(ctx, 'Not found.');
      return;
    }
    try {
      await this.groupsService.removeMember(
        group.id,
        user.id,
        member.student?.id || member.studentId,
      );
      await this.editOrReply(ctx, 
        `✅ Removed <b>${member.student?.firstName || 'member'}</b> from ${group.name}.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('👥 Members', `g_mem:${groupIdx}`)],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STUDENT — Tests
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('s_tests')
  async actionSTests(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showStudentTests(ctx, user);
  }

  @Action(/^s_start:(\d+)$/)
  async actionSStart(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found. Try /tests again.');
      return;
    }

    await this.editOrReply(ctx, `⏳ Starting test "<b>${test.title}</b>"…`, {
      parse_mode: 'HTML',
    });
    try {
      const data = await this.sessionsService.startSession(
        user.id,
        { testId: test.id },
        'telegram',
        'telegram-bot',
      );
      const questionOrder = (data.questions as any[]).map((q: any) => q.id);
      this.setState(ctx.chat!.id, {
        step: 'taking_test',
        sessionId: data.session.id,
        testId: test.id,
        questionOrder,
        questionIdx: 0,
      });
      await this.showQuestion(ctx, data, 0);
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to start test.'}`);
    }
  }

  // ── Answer: sa:optionIndex ────────────────────────────────────────────────────

  @Action(/^sa:(\d+)$/)
  async actionSAnswer(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery('Answer saved ✓');
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'taking_test' || !st.sessionId) {
      return;
    }

    const optionIdx = parseInt((ctx as any).match[1], 10);
    const optionId = st.currentOptionIds?.[optionIdx];
    const questionId = st.questionOrder?.[st.questionIdx ?? 0];

    if (optionId && questionId) {
      try {
        await this.sessionsService.saveAnswer(st.sessionId, user.id, {
          questionId,
          optionIds: [optionId],
        });
      } catch {
        /* ignore save errors, continue */
      }
    }

    // Auto-advance
    const nextIdx = (st.questionIdx ?? 0) + 1;
    const total = st.questionOrder?.length ?? 0;
    if (nextIdx >= total) {
      await this.showSubmitPrompt(ctx, st);
    } else {
      this.setState(chatId, { questionIdx: nextIdx });
      const sessionData = await this.sessionsService.getSession(
        st.sessionId,
        user.id,
      );
      await this.showQuestion(ctx, sessionData, nextIdx);
    }
  }

  @Action(/^sq:(\d+)$/)
  async actionSSkipToQuestion(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'taking_test' || !st.sessionId) return;

    const idx = parseInt((ctx as any).match[1], 10);
    this.setState(chatId, { questionIdx: idx });
    const sessionData = await this.sessionsService.getSession(
      st.sessionId,
      user.id,
    );
    await this.showQuestion(ctx, sessionData, idx);
  }

  @Action('s_submit')
  async actionSSubmit(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'taking_test' || !st.sessionId) return;
    await this.showSubmitPrompt(ctx, st);
  }

  @Action('s_submit_c')
  async actionSSubmitConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery('Submitting…');
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'taking_test' || !st.sessionId) return;

    try {
      const result = await this.sessionsService.submitSession(
        st.sessionId,
        user.id,
      );
      this.resetState(chatId);
      const pct = Number(result.percentage).toFixed(1);
      const emoji =
        Number(result.percentage) >= 70
          ? '🟢'
          : Number(result.percentage) >= 50
            ? '🟡'
            : '🔴';
      const passed =
        result.passed != null
          ? result.passed
            ? ' ✅ Passed'
            : ' ❌ Failed'
          : '';
      await this.editOrReply(ctx, 
        `${emoji} <b>Test Submitted!</b>${passed}\n\n` +
          `📊 Score: <b>${pct}%</b>\n` +
          `✅ Correct: ${result.correctCount}\n` +
          `❌ Wrong: ${result.incorrectCount}\n` +
          `⬜ Skipped: ${result.unansweredCount}\n` +
          `⏱ Time: ${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('📊 All Results', 's_results'),
              Markup.button.callback('🏠 Menu', 'menu'),
            ],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to submit.'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STUDENT — Groups & Results
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('s_groups')
  async actionSGroups(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showStudentGroups(ctx, user);
  }

  @Action('s_join')
  async actionSJoin(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    this.setState(ctx.chat!.id, { step: 'joining_group' });
    await this.editOrReply(ctx, 
      '🔗 <b>Join a Group</b>\n\nEnter the <b>invite code</b> given to you by your teacher:',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'menu')],
        ]),
      },
    );
  }

  @Action(/^s_leave:(\d+)$/)
  async actionSLeave(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    await this.editOrReply(ctx, `Leave group <b>${group.name}</b>?`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Yes, leave', `s_leave_c:${idx}`),
          Markup.button.callback('❌ Cancel', 's_groups'),
        ],
      ]),
    });
  }

  @Action(/^s_leave_c:(\d+)$/)
  async actionSLeaveConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const groups = this.state(ctx.chat!.id).groups || [];
    const group = groups[idx];
    if (!group) {
      await this.editOrReply(ctx, 'Group not found.');
      return;
    }
    try {
      await this.groupsService.leave(user.id, group.id);
      await this.editOrReply(ctx, `✅ Left group "<b>${group.name}</b>".`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👥 My Groups', 's_groups')],
        ]),
      });
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action('s_results')
  async actionSResults(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.showResults(ctx, user);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Option-adding flow actions
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('aq_done')
  async actionAqDone(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'adding_option' || !st.draftOptions?.length) {
      await this.editOrReply(ctx, 'Add at least one option first.');
      return;
    }
    this.setState(chatId, { step: 'picking_correct_option' });
    const buttons = (st.draftOptions || []).map((opt, i) => [
      Markup.button.callback(
        `${OPTION_LABELS[i]}) ${opt.slice(0, 30)}`,
        `aq_correct:${i}`,
      ),
    ]);
    await this.editOrReply(ctx, '✅ Which option is the <b>correct answer</b>?', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action(/^aq_correct:(\d+)$/)
  async actionAqCorrect(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    if (st.step !== 'picking_correct_option') return;

    const correctIdx = parseInt((ctx as any).match[1], 10);
    const options = (st.draftOptions || []).map((body, i) => ({
      body,
      isCorrect: i === correctIdx,
    }));

    try {
      const tests = this.state(chatId).tests || [];
      const _test = tests.find((t) => t.id === st.focusTestId);
      await this.questionsService.create(st.focusTestId!, user.id, {
        body: st.draftQuestionBody!,
        options,
      });
      this.setState(chatId, {
        step: 'idle',
        draftQuestionBody: undefined,
        draftOptions: [],
      });
      const testIdx = tests.findIndex((t) => t.id === st.focusTestId);
      await this.editOrReply(ctx, 
        `✅ <b>Question added!</b>\n\n<i>${st.draftQuestionBody}</i>\n\n${options.map((o, i) => `${OPTION_LABELS[i]}) ${o.body}${o.isCorrect ? ' ✓' : ''}`).join('\n')}`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '➕ Add Another',
                `t_addq:${testIdx >= 0 ? testIdx : 0}`,
              ),
              Markup.button.callback(
                '📋 Questions',
                `t_qs:${testIdx >= 0 ? testIdx : 0}`,
              ),
            ],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to save question'}`);
      this.resetState(chatId);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Message handler (state machine)
  // ──────────────────────────────────────────────────────────────────────────────

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const msg = ctx.message as any;
    const text: string = msg?.text?.trim() || '';
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);

    if (text.startsWith('/')) return; // let commands handle it

    const user = await this.getLinkedUser(ctx);
    if (!user) {
      await this.editOrReply(ctx, 'Please /link your account first.');
      return;
    }

    switch (st.step) {
      // ── Creating test ─────────────────────────────────────────────────────────
      case 'creating_test_name':
        this.setState(chatId, {
          step: 'creating_test_desc',
          draftTestName: text,
        });
        await this.editOrReply(ctx, 
          `📝 Title: <b>${text}</b>\n\nEnter a <b>description</b> (or send "-" to skip):`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'menu')],
            ]),
          },
        );
        break;

      case 'creating_test_desc':
        this.setState(chatId, {
          step: 'creating_test_time',
          draftTestDesc: text === '-' ? '' : text,
        });
        await this.editOrReply(ctx, 
          'Enter the <b>time limit in minutes</b> (or send "-" for no limit):',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'menu')],
            ]),
          },
        );
        break;

      case 'creating_test_time': {
        const minutes = text === '-' ? null : parseInt(text, 10);
        if (text !== '-' && (isNaN(minutes!) || minutes! <= 0)) {
          await this.editOrReply(ctx, 
            'Enter a valid number of minutes or "-" for no limit.',
          );
          break;
        }
        try {
          const test = await this.testsService.create(user.id, {
            title: st.draftTestName!,
            description: st.draftTestDesc || undefined,
            timeLimitMinutes: minutes ?? undefined,
          });
          // Refresh tests list
          const tests = await this.testsService.findAll(
            user.id,
            UserRole.TEACHER,
          );
          this.setState(chatId, { step: 'idle', tests: tests as Test[] });
          const idx = (tests as Test[]).findIndex((t) => t.id === test.id);
          await this.editOrReply(ctx, 
            `✅ <b>Test created!</b>\n\n📋 ${test.title}${minutes ? `\n⏱ ${minutes} minutes` : ''}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('➕ Add Questions', `t_addq:${idx}`),
                  Markup.button.callback('📋 My Tests', 't_list'),
                ],
              ]),
            },
          );
        } catch (err: any) {
          await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to create test'}`);
          this.resetState(chatId);
        }
        break;
      }

      // ── Creating group ────────────────────────────────────────────────────────
      case 'creating_group_name':
        this.setState(chatId, {
          step: 'creating_group_desc',
          draftGroupName: text,
        });
        await this.editOrReply(ctx, 
          `👥 Name: <b>${text}</b>\n\nEnter a <b>description</b> (or "-" to skip):`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'menu')],
            ]),
          },
        );
        break;

      case 'creating_group_desc': {
        try {
          const group = await this.groupsService.create(user.id, {
            name: st.draftGroupName!,
            description: text === '-' ? undefined : text,
          });
          const groups = await this.groupsService.findAll(
            user.id,
            UserRole.TEACHER,
          );
          this.setState(chatId, { step: 'idle', groups: groups as Group[] });
          await this.editOrReply(ctx, 
            `✅ <b>Group created!</b>\n\n👥 ${group.name}\n🔗 Invite code: <code>${group.inviteCode}</code>`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('👥 My Groups', 'g_list')],
              ]),
            },
          );
        } catch (err: any) {
          await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to create group'}`);
          this.resetState(chatId);
        }
        break;
      }

      // ── Joining group (student) ────────────────────────────────────────────────
      case 'joining_group': {
        try {
          const group = await this.groupsService.join(user.id, {
            inviteCode: text.toUpperCase(),
          });
          this.resetState(chatId);
          await this.editOrReply(ctx, `✅ Joined group <b>${group.name}</b>!`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback('👥 My Groups', 's_groups'),
                Markup.button.callback('🏠 Menu', 'menu'),
              ],
            ]),
          });
        } catch (err: any) {
          await this.editOrReply(ctx, `❌ ${err?.message || 'Invalid invite code.'}`);
        }
        break;
      }

      // ── Adding question body ───────────────────────────────────────────────────
      case 'adding_question_body':
        this.setState(chatId, {
          step: 'adding_option',
          draftQuestionBody: text,
          draftOptions: [],
        });
        await this.editOrReply(ctx, 
          `📝 Question: <i>${text}</i>\n\n` +
            'Now send each <b>answer option</b> as a separate message.\n' +
            'Send up to 6 options, then tap <b>Done</b>.',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ Done (pick correct)', 'aq_done')],
            ]),
          },
        );
        break;

      // ── Adding options one by one ─────────────────────────────────────────────
      case 'adding_option': {
        const opts = [...(st.draftOptions || []), text];
        this.setState(chatId, { draftOptions: opts });
        const label = OPTION_LABELS[opts.length - 1];
        const isDone = opts.length >= 6;
        await this.editOrReply(ctx, 
          `${label}) ${text}\n\n${isDone ? '✅ Max 6 options reached.' : `Option ${opts.length} added. Send more or tap Done.`}`,
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ Done (pick correct)', 'aq_done')],
            ]),
          },
        );
        break;
      }

      // ── Password change ───────────────────────────────────────────────────────
      case 'changing_password_old':
        this.setState(chatId, {
          step: 'changing_password_new',
          oldPassword: text,
        });
        await this.editOrReply(ctx, '🔑 Enter your <b>new password</b>:', {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'prof_menu')],
          ]),
        });
        break;

      case 'changing_password_new': {
        try {
          await this.usersService.changePassword(user.id, {
            currentPassword: st.oldPassword!,
            newPassword: text,
          });
          this.setState(chatId, { step: 'idle', oldPassword: undefined });
          await this.editOrReply(ctx, '✅ Password changed successfully!', {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('👤 Profile', 'prof_menu')],
            ]),
          });
        } catch (err: any) {
          await this.editOrReply(ctx, 
            `❌ ${err?.message || 'Failed. Check your current password.'}`,
          );
          this.resetState(chatId);
        }
        break;
      }

      // ── Editing plan price ────────────────────────────────────────────────────
      case 'editing_plan_price': {
        const price = parseFloat(text.replace(',', '.'));
        if (isNaN(price) || price < 0) {
          await this.editOrReply(ctx, 'Enter a valid price (e.g. 12.99 or 0 for free).');
          break;
        }
        try {
          const updated = await this.subscriptionsService.updatePlan(
            st.focusPlanId!,
            { price },
          );
          this.resetState(chatId);
          await this.editOrReply(ctx, 
            `✅ <b>${updated!.name}</b> price updated to <b>$${Number(updated!.price).toFixed(2)}</b>!`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('💎 All Plans', 'adm_plans')],
              ]),
            },
          );
        } catch (err: any) {
          await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to update price'}`);
          this.resetState(chatId);
        }
        break;
      }

      // ── Admin user search ─────────────────────────────────────────────────────
      case 'admin_user_search': {
        try {
          const res = await this.adminService.getAllUsers({
            page: 1,
            limit: 50,
          });
          const q = text.toLowerCase();
          const matches = (res.data as any[]).filter(
            (u) =>
              u.email?.toLowerCase().includes(q) ||
              u.firstName?.toLowerCase().includes(q) ||
              u.lastName?.toLowerCase().includes(q),
          );
          this.setState(chatId, { step: 'idle', adminUsers: matches });
          if (!matches.length) {
            await this.editOrReply(ctx, 'No users found.', {
              ...Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Back', 'adm_users')],
              ]),
            });
            break;
          }
          const buttons = matches
            .slice(0, 10)
            .map((u, i) => [
              Markup.button.callback(
                `${u.firstName} ${u.lastName} (${u.role})`,
                `adm_u:${i}`,
              ),
            ]);
          buttons.push([Markup.button.callback('⬅️ All Users', 'adm_users')]);
          await this.editOrReply(ctx, `🔍 Found <b>${matches.length}</b> user(s):`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons),
          });
        } catch (err: any) {
          await this.editOrReply(ctx, `❌ ${err?.message || 'Search failed'}`);
          this.resetState(chatId);
        }
        break;
      }

      default:
        // Not in a conversation — show main menu
        await this.editOrReply(ctx, 'Use the menu to navigate:', {
          ...this.mainMenu(user),
        });
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Private display helpers
  // ──────────────────────────────────────────────────────────────────────────────

  private async showTeacherTests(ctx: Context, user: User) {
    const tests = (await this.testsService.findAll(
      user.id,
      UserRole.TEACHER,
    )) as Test[];
    this.setState(ctx.chat!.id, { tests });

    if (!tests.length) {
      await this.editOrReply(ctx, '📋 You have no tests yet.', {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('➕ Create Test', 't_new'),
            Markup.button.callback('🏠 Menu', 'menu'),
          ],
        ]),
      });
      return;
    }

    const buttons = tests.map((t, i) => [
      Markup.button.callback(
        `${t.isPublished ? '🟢' : '⚪'} ${t.title.slice(0, 40)}`,
        `t_view:${i}`,
      ),
    ]);
    buttons.push([
      Markup.button.callback('➕ New Test', 't_new'),
      Markup.button.callback('🏠 Menu', 'menu'),
    ]);

    await this.editOrReply(ctx, `📋 <b>My Tests</b> (${tests.length})`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async showTestDetail(ctx: Context, test: Test, idx: number) {
    const status = test.isPublished
      ? `🟢 Published · Code: <code>${test.accessCode || '–'}</code>`
      : '⚪ Draft';
    const time = test.timeLimitMinutes
      ? `⏱ ${test.timeLimitMinutes} min`
      : '⏱ No limit';

    await this.editOrReply(ctx, 
      `📋 <b>${test.title}</b>\n\n${status}\n${time}${test.description ? `\n\n${test.description}` : ''}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📝 Questions', `t_qs:${idx}`),
            Markup.button.callback('👥 Assign Group', `t_ag:${idx}`),
          ],
          [
            Markup.button.callback('📊 Results', `t_res:${idx}`),
            Markup.button.callback(
              test.isPublished ? '🔄 Re-publish' : '📢 Publish',
              `t_pub:${idx}`,
            ),
          ],
          [
            Markup.button.callback('🗑️ Delete', `t_del:${idx}`),
            Markup.button.callback('⬅️ Back', 't_list'),
          ],
        ]),
      },
    );
  }

  private async showQuestions(
    ctx: Context,
    test: Test,
    idx: number,
    _user: User,
  ) {
    const questions = await this.questionsService.findAll(test.id);
    if (!questions.length) {
      await this.editOrReply(ctx, `📝 <b>${test.title}</b> has no questions yet.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add Question', `t_addq:${idx}`)],
          [Markup.button.callback('⬅️ Back', `t_view:${idx}`)],
        ]),
      });
      return;
    }

    const lines = questions.map(
      (q, i) =>
        `${i + 1}. ${q.body.slice(0, 60)}${q.body.length > 60 ? '…' : ''} (${q.options?.length || 0} opts)`,
    );

    await this.editOrReply(ctx, 
      `📝 <b>${test.title}</b> — ${questions.length} question(s)\n\n` +
        lines.join('\n'),
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add Question', `t_addq:${idx}`)],
          [Markup.button.callback('⬅️ Back to Test', `t_view:${idx}`)],
        ]),
      },
    );
  }

  private async showTeacherGroups(ctx: Context, user: User) {
    const groups = (await this.groupsService.findAll(
      user.id,
      UserRole.TEACHER,
    )) as Group[];
    this.setState(ctx.chat!.id, { groups });

    if (!groups.length) {
      await this.editOrReply(ctx, '👥 You have no groups yet.', {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('➕ Create Group', 'g_new'),
            Markup.button.callback('🏠 Menu', 'menu'),
          ],
        ]),
      });
      return;
    }

    const buttons = groups.map((g, i) => [
      Markup.button.callback(`👥 ${g.name}`, `g_view:${i}`),
    ]);
    buttons.push([
      Markup.button.callback('➕ New Group', 'g_new'),
      Markup.button.callback('🏠 Menu', 'menu'),
    ]);

    await this.editOrReply(ctx, `👥 <b>My Groups</b> (${groups.length})`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async showGroupDetail(ctx: Context, group: Group, idx: number) {
    await this.editOrReply(ctx, 
      `👥 <b>${group.name}</b>\n\n🔗 Code: <code>${group.inviteCode}</code>${group.description ? `\n\n${group.description}` : ''}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('👤 Members', `g_mem:${idx}`),
            Markup.button.callback('🔗 Invite Code', `g_inv:${idx}`),
          ],
          [
            Markup.button.callback('🗑️ Delete', `g_del:${idx}`),
            Markup.button.callback('⬅️ Back', 'g_list'),
          ],
        ]),
      },
    );
  }

  private async showStudentTests(ctx: Context, user: User) {
    const tests = (await this.testsService.findAll(
      user.id,
      UserRole.STUDENT,
    )) as Test[];
    this.setState(ctx.chat!.id, { tests });

    if (!tests.length) {
      await this.editOrReply(ctx, 
        '📋 No tests available. Join a group first to see assigned tests.',
        {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('🔗 Join Group', 's_join'),
              Markup.button.callback('🏠 Menu', 'menu'),
            ],
          ]),
        },
      );
      return;
    }

    const buttons = tests.map((t, i) => [
      Markup.button.callback(
        `${t.timeLimitMinutes ? `⏱${t.timeLimitMinutes}m ` : ''}${t.title.slice(0, 38)}`,
        `s_start:${i}`,
      ),
    ]);
    buttons.push([Markup.button.callback('🏠 Menu', 'menu')]);

    await this.editOrReply(ctx, 
      `📋 <b>Available Tests</b> (${tests.length})\n\nTap a test to start it:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons),
      },
    );
  }

  private async showStudentGroups(ctx: Context, user: User) {
    const groups = (await this.groupsService.findAll(
      user.id,
      UserRole.STUDENT,
    )) as Group[];
    this.setState(ctx.chat!.id, { groups });

    if (!groups.length) {
      await this.editOrReply(ctx, '👥 You are not in any groups yet.', {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔗 Join Group', 's_join'),
            Markup.button.callback('🏠 Menu', 'menu'),
          ],
        ]),
      });
      return;
    }

    const buttons = groups.map((g, i) => [
      Markup.button.callback(`👥 ${g.name}`, `s_leave:${i}`),
    ]);
    buttons.push([
      Markup.button.callback('🔗 Join Another', 's_join'),
      Markup.button.callback('🏠 Menu', 'menu'),
    ]);

    await this.editOrReply(ctx, 
      `👥 <b>My Groups</b> (${groups.length})\n\nTap a group to leave it:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons),
      },
    );
  }

  private async showResults(ctx: Context, user: User) {
    const results = await this.resultsService.getStudentResults(
      user.id,
      user.id,
      UserRole.STUDENT,
    );
    if (!results.length) {
      await this.editOrReply(ctx, 
        '📭 No results yet. Complete a test to see your scores.',
        {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('📋 Tests', 's_tests'),
              Markup.button.callback('🏠 Menu', 'menu'),
            ],
          ]),
        },
      );
      return;
    }
    const lines = results.slice(0, 10).map((r, i) => {
      const pct = Number(r.percentage).toFixed(1);
      const emoji =
        Number(r.percentage) >= 70
          ? '🟢'
          : Number(r.percentage) >= 50
            ? '🟡'
            : '🔴';
      const date = new Date(r.computedAt).toLocaleDateString();
      const passed = r.passed != null ? (r.passed ? ' ✅' : ' ❌') : '';
      return `${i + 1}. ${emoji} <b>${r.testTitle ?? 'Test'}</b>${passed}\n   ${pct}% · ${r.correctCount}✓ ${r.incorrectCount}✗ · ${date}`;
    });
    await this.editOrReply(ctx, 
      `📊 <b>Your Results</b> (last ${Math.min(results.length, 10)})\n\n` +
        lines.join('\n\n'),
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 's_results'),
            Markup.button.callback('🏠 Menu', 'menu'),
          ],
        ]),
      },
    );
  }

  private async showQuestion(ctx: Context, sessionData: any, idx: number) {
    const chatId = ctx.chat!.id;
    const st = this.state(chatId);
    const order = st.questionOrder || [];
    const total = order.length;
    const questionId = order[idx];
    const question = sessionData.questions?.find(
      (q: any) => q.id === questionId,
    );

    if (!question) {
      await this.showSubmitPrompt(ctx, st);
      return;
    }

    const optionIds = (question.options || []).map((o: any) => o.id);
    this.setState(chatId, { currentOptionIds: optionIds });

    const optionButtons = (question.options || []).map((o: any, i: number) => [
      Markup.button.callback(
        `${OPTION_LABELS[i]}) ${o.body.slice(0, 50)}`,
        `sa:${i}`,
      ),
    ]);

    // navigation row
    const navRow: any[] = [];
    if (idx > 0)
      navRow.push(Markup.button.callback('⬅️ Prev', `sq:${idx - 1}`));
    navRow.push(Markup.button.callback('📤 Submit', 's_submit'));
    if (idx < total - 1)
      navRow.push(Markup.button.callback('Next ➡️', `sq:${idx + 1}`));

    await this.editOrReply(ctx, 
      `❓ <b>Question ${idx + 1} / ${total}</b>\n\n${question.body}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([...optionButtons, navRow]),
      },
    );
  }

  private async showSubmitPrompt(ctx: Context, st: ConvState) {
    const total = st.questionOrder?.length ?? 0;
    await this.editOrReply(ctx, 
      `✅ You've reached the end (${total} question${total !== 1 ? 's' : ''}).\n\nReady to submit?`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📤 Submit Test', 's_submit_c'),
            Markup.button.callback('⬅️ Back to Q1', 'sq:0'),
          ],
        ]),
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PROFILE
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('prof_menu')
  async actionProfMenu(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    await this.editOrReply(ctx, 
      `👤 <b>Profile</b>\n\n📧 ${user.email}\n👤 ${user.firstName} ${user.lastName}\n🎓 ${user.role}\n🔐 2FA: ${user.twoFactorEnabled ? '✅ On' : '❌ Off'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔑 Change Password', 'prof_pw'),
            Markup.button.callback(`🔐 Toggle 2FA`, 'prof_2fa'),
          ],
          [
            Markup.button.callback('🔓 Unlink Telegram', 'action_unlink'),
            Markup.button.callback('🏠 Menu', 'menu'),
          ],
        ]),
      },
    );
  }

  @Action('prof_pw')
  async actionProfPw(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    this.setState(ctx.chat!.id, { step: 'changing_password_old' });
    await this.editOrReply(ctx, '🔑 Enter your <b>current password</b>:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'prof_menu')],
      ]),
    });
  }

  @Action('prof_2fa')
  async actionProf2fa(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    try {
      const res = await this.authService.toggle2FA(
        user.id,
        !user.twoFactorEnabled,
      );
      await this.editOrReply(ctx, 
        `🔐 Two-Factor Authentication is now <b>${res.twoFactorEnabled ? '✅ enabled' : '❌ disabled'}</b>.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', 'prof_menu')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ANALYTICS (teacher)
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('ana_overview')
  async actionAnaOverview(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    try {
      const ov = await this.analyticsService.getOverview(user.id);
      await this.editOrReply(ctx, 
        `📈 <b>Analytics Overview</b>\n\n` +
          `📋 Tests: <b>${ov.totalTests}</b> (${(ov as any).publishedTests ?? '–'} published)\n` +
          `🎯 Attempts: <b>${ov.totalAttempts}</b>\n` +
          `📊 Avg Score: <b>${this.fmt(ov.avgScore)}%</b>\n` +
          `✅ Pass Rate: <b>${ov.passRate != null ? this.fmt(ov.passRate) + '%' : '–'}</b>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('📋 Per-Test Analytics', 'ana_tests'),
              Markup.button.callback('🏠 Menu', 'menu'),
            ],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to load analytics'}`);
    }
  }

  @Action('ana_tests')
  async actionAnaTests(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const tests = (await this.testsService.findAll(
      user.id,
      UserRole.TEACHER,
    )) as Test[];
    if (!tests.length) {
      await this.editOrReply(ctx, 'No tests yet.');
      return;
    }
    this.setState(ctx.chat!.id, { tests });
    const buttons = tests
      .slice(0, 10)
      .map((t, i) => [
        Markup.button.callback(`${t.title.slice(0, 42)}`, `ana_t:${i}`),
      ]);
    buttons.push([Markup.button.callback('⬅️ Overview', 'ana_overview')]);
    await this.editOrReply(ctx, '📋 Select a test to view analytics:', {
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action(/^ana_t:(\d+)$/)
  async actionAnaTest(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user) return;
    const idx = parseInt((ctx as any).match[1], 10);
    const tests = this.state(ctx.chat!.id).tests || [];
    const test = tests[idx];
    if (!test) {
      await this.editOrReply(ctx, 'Test not found.');
      return;
    }
    try {
      const stats = await this.analyticsService.getTestAnalytics(
        test.id,
        user.id,
      );
      const lines = [
        `📋 <b>${test.title}</b>`,
        `🎯 Attempts: <b>${stats.totalAttempts}</b>`,
        `📊 Avg Score: <b>${this.fmt(stats.avgScore)}%</b>`,
        `✅ Pass Rate: <b>${stats.passRate != null ? this.fmt(stats.passRate) + '%' : '–'}</b>`,
        `📈 Highest: <b>${stats.highestScore != null ? this.fmt(stats.highestScore) + '%' : '–'}</b>`,
      ];
      await this.editOrReply(ctx, lines.join('\n'), {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back', 'ana_tests')],
        ]),
      });
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ADMIN
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('adm_stats')
  async actionAdmStats(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || !this.isAdmin(user)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    try {
      const s = await this.adminService.getPlatformStats();
      await this.editOrReply(ctx, 
        `📊 <b>Platform Stats</b>\n\n` +
          `👥 Total Users: <b>${s.totalUsers}</b>\n` +
          `📋 Total Tests: <b>${s.totalTests}</b>\n` +
          `🎯 Total Results: <b>${s.totalResults}</b>\n` +
          `💎 Active Subscriptions: <b>${s.activeSubscriptions}</b>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('👥 Users', 'adm_users'),
              Markup.button.callback('💳 Payments', 'adm_payments'),
            ],
            [Markup.button.callback('🏠 Menu', 'menu')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action('adm_users')
  async actionAdmUsers(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || !this.isAdmin(user)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    try {
      const res = await this.adminService.getAllUsers({ page: 1, limit: 15 });
      const users: any[] = res.data;
      this.setState(ctx.chat!.id, { adminUsers: users });
      const lines = users.map(
        (u, i) =>
          `${i + 1}. ${u.firstName} ${u.lastName} · ${u.role} · ${u.isActive ? '✅' : '🔴'}`,
      );
      const buttons = users.map((u, i) => [
        Markup.button.callback(
          `${u.firstName} ${u.lastName} (${u.role})`,
          `adm_u:${i}`,
        ),
      ]);
      buttons.push([
        Markup.button.callback('🔍 Search', 'adm_usearch'),
        Markup.button.callback('⬅️ Back', 'adm_stats'),
      ]);
      await this.editOrReply(ctx, 
        `👥 <b>Users</b> (${res.meta.total} total, showing ${users.length})\n\n` +
          lines.join('\n'),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action(/^adm_u:(\d+)$/)
  async actionAdmUser(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const admin = await this.requireLinkedUser(ctx);
    if (!admin || !this.isAdmin(admin)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    const idx = parseInt((ctx as any).match[1], 10);
    const users = this.state(ctx.chat!.id).adminUsers || [];
    const u = users[idx];
    if (!u) {
      await this.editOrReply(ctx, 'User not found.');
      return;
    }
    await this.editOrReply(ctx, 
      `👤 <b>${u.firstName} ${u.lastName}</b>\n📧 ${u.email}\n🎓 ${u.role}\n` +
        `✅ Active: ${u.isActive ? 'Yes' : 'No'}\n📅 Joined: ${new Date(u.createdAt).toLocaleDateString()}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              u.isActive ? '🔴 Deactivate' : '✅ Activate',
              `adm_toggle:${idx}`,
            ),
            Markup.button.callback('⬅️ Back', 'adm_users'),
          ],
        ]),
      },
    );
  }

  @Action(/^adm_toggle:(\d+)$/)
  async actionAdmToggle(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const admin = await this.requireLinkedUser(ctx);
    if (!admin || !this.isAdmin(admin)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    const idx = parseInt((ctx as any).match[1], 10);
    const users = this.state(ctx.chat!.id).adminUsers || [];
    const u = users[idx];
    if (!u) {
      await this.editOrReply(ctx, 'User not found.');
      return;
    }
    try {
      await this.adminService.updateUser(u.id, { isActive: !u.isActive });
      u.isActive = !u.isActive;
      await this.editOrReply(ctx, 
        `✅ User <b>${u.firstName} ${u.lastName}</b> is now <b>${u.isActive ? 'active' : 'deactivated'}</b>.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', 'adm_users')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action('adm_usearch')
  async actionAdmUserSearch(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || !this.isAdmin(user)) return;
    this.setState(ctx.chat!.id, { step: 'admin_user_search' });
    await this.editOrReply(ctx, '🔍 Enter a name or email to search:', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'adm_users')],
      ]),
    });
  }

  @Action('adm_payments')
  async actionAdmPayments(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || !this.isAdmin(user)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    try {
      const res = await this.adminService.getPendingPayments({
        page: 1,
        limit: 10,
      });
      const payments: any[] = res.data;
      if (!payments.length) {
        await this.editOrReply(ctx, '💳 No pending manual payments.', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')],
          ]),
        });
        return;
      }
      this.setState(ctx.chat!.id, { adminUsers: payments });
      const buttons = payments.map((p, i) => [
        Markup.button.callback(
          `${p.user?.firstName || '?'} · ${p.plan?.name || '?'} · Approve`,
          `adm_pay_c:${i}`,
        ),
      ]);
      buttons.push([Markup.button.callback('🏠 Menu', 'menu')]);
      const lines = payments.map(
        (p, i) => `${i + 1}. ${p.user?.email || '?'} — ${p.plan?.name || '?'}`,
      );
      await this.editOrReply(ctx, 
        `💳 <b>Pending Payments</b> (${payments.length})\n\n` +
          lines.join('\n'),
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  @Action(/^adm_pay_c:(\d+)$/)
  async actionAdmPayConfirm(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const admin = await this.requireLinkedUser(ctx);
    if (!admin || !this.isAdmin(admin)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    const idx = parseInt((ctx as any).match[1], 10);
    const payments = this.state(ctx.chat!.id).adminUsers || [];
    const p = payments[idx];
    if (!p) {
      await this.editOrReply(ctx, 'Payment not found.');
      return;
    }
    try {
      await this.adminService.approvePayment(p.id);
      await this.editOrReply(ctx, 
        `✅ Payment approved for <b>${p.user?.email || p.id}</b>!`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 Back to Payments', 'adm_payments')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed to approve'}`);
    }
  }

  @Action('adm_subs')
  async actionAdmSubs(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || !this.isAdmin(user)) {
      await this.editOrReply(ctx, '⛔ Access denied.');
      return;
    }
    try {
      const res = await this.adminService.getAllSubscriptions({
        page: 1,
        limit: 15,
      });
      const subs: any[] = res.data;
      if (!subs.length) {
        await this.editOrReply(ctx, '📋 No subscriptions found.', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')],
          ]),
        });
        return;
      }
      const lines = subs
        .slice(0, 15)
        .map(
          (s, i) =>
            `${i + 1}. ${s.user?.email || '?'} · ${s.plan?.name || '?'} · <b>${s.status}</b>`,
        );
      await this.editOrReply(ctx, 
        `📋 <b>Subscriptions</b> (${res.meta.total} total)\n\n` +
          lines.join('\n'),
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💎 Edit Plan Prices', 'adm_plans')],
            [Markup.button.callback('🏠 Menu', 'menu')],
          ]),
        },
      );
    } catch (err: any) {
      await this.editOrReply(ctx, `❌ ${err?.message || 'Failed'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ADMIN — Subscription Plans (price editing)
  // ──────────────────────────────────────────────────────────────────────────────

  @Action('adm_plans')
  async actionAdmPlans(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || user.role !== UserRole.ADMIN) {
      await this.editOrReply(ctx, '⛔ Admin only.');
      return;
    }
    const plans = await this.subscriptionsService.getPlans();
    this.setState(ctx.chat!.id, { adminPlans: plans });
    const lines = plans.map(
      (p, i) =>
        `${i + 1}. <b>${p.name}</b> — $${Number(p.price).toFixed(2)} / ${p.billingPeriod}`,
    );
    const buttons = plans.map((p, i) => [
      Markup.button.callback(
        `✏️ ${p.name} ($${Number(p.price).toFixed(2)})`,
        `adm_plan:${i}`,
      ),
    ]);
    buttons.push([Markup.button.callback('⬅️ Back', 'adm_subs')]);
    await this.editOrReply(ctx, `💎 <b>Subscription Plans</b>\n\n` + lines.join('\n'), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action(/^adm_plan:(\d+)$/)
  async actionAdmPlan(@Ctx() ctx: Context) {
    await (ctx as any).answerCbQuery();
    const user = await this.requireLinkedUser(ctx);
    if (!user || user.role !== UserRole.ADMIN) {
      await this.editOrReply(ctx, '⛔ Admin only.');
      return;
    }
    const idx = parseInt((ctx as any).match[1], 10);
    const plans = this.state(ctx.chat!.id).adminPlans || [];
    const plan = plans[idx];
    if (!plan) {
      await this.editOrReply(ctx, 'Plan not found.');
      return;
    }
    this.setState(ctx.chat!.id, {
      step: 'editing_plan_price',
      focusPlanId: plan.id,
      focusPlanName: plan.name,
    });
    await this.editOrReply(ctx, 
      `✏️ <b>${plan.name}</b>\nCurrent price: <b>$${Number(plan.price).toFixed(2)}</b> / ${plan.billingPeriod}\n\nEnter the new price in USD (e.g. <code>12.99</code>):`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'adm_plans')],
        ]),
      },
    );
  }
}
