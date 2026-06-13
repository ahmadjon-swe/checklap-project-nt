import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { TestSession, SessionStatus } from './entities/test-session.entity';
import { SessionAnswer } from './entities/session-answer.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import {
  StartSessionDto,
  SaveAnswerDto,
  HeartbeatDto,
} from './dto/session.dto';
import { ResultsService } from '../results/results.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(TestSession) private sessionRepo: Repository<TestSession>,
    @InjectRepository(SessionAnswer)
    private answerRepo: Repository<SessionAnswer>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Option) private optionRepo: Repository<Option>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
    @InjectRepository(TestGroup) private testGroupRepo: Repository<TestGroup>,
    private resultsService: ResultsService,
    private authService: AuthService,
  ) {}

  async startSession(
    studentId: string,
    dto: StartSessionDto,
    ip: string,
    userAgent: string,
  ) {
    const test = await this.testRepo.findOne({
      where: { id: dto.testId, isPublished: true },
    });
    if (!test) throw new NotFoundException('Test not found or not published');

    // verify student belongs to an assigned group and that group's schedule is open
    const testGroups = await this.testGroupRepo.find({
      where: { testId: dto.testId },
    });
    const groupIds = testGroups.map((tg) => tg.groupId);
    const membership = await this.memberRepo.findOne({
      where: { studentId, groupId: In(groupIds), isActive: true },
    });
    if (!membership)
      throw new ForbiddenException(
        'You are not in an assigned group for this test',
      );

    // Check group-level schedule (falls back to test-level if not set)
    const testGroup = testGroups.find(
      (tg) => tg.groupId === membership.groupId,
    );
    const now = new Date();
    const startAt = testGroup?.startAt ?? test.startAt;
    const endAt = testGroup?.endAt ?? test.endAt;
    if (startAt && startAt > now)
      throw new BadRequestException('Test has not started yet for your group');
    if (endAt && endAt < now)
      throw new BadRequestException('Test has ended for your group');

    return this.createOrResumeSession(test, studentId, ip, userAgent);
  }

  /**
   * Public lookup so a guest can see what they're about to take (no answers).
   */
  async getPublicTestMeta(code: string) {
    const test = await this.testRepo.findOne({
      where: { accessCode: code.toUpperCase(), isPublished: true },
    });
    if (!test) throw new NotFoundException('Test not found');
    const questionCount = await this.questionRepo.count({
      where: { testId: test.id },
    });
    const now = new Date();
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      timeLimitMinutes: test.timeLimitMinutes,
      questionCount,
      enforceFullscreen: test.enforceFullscreen,
      hasNotStarted: !!(test.startAt && test.startAt > now),
      hasEnded: !!(test.endAt && test.endAt < now),
    };
  }

  /**
   * Starts a test for an anonymous guest who only has a share code + name.
   * Skips the group-membership check (guests aren't in any group). Returns the
   * guest's access token alongside the session so the client can call the
   * normal session endpoints.
   */
  async startGuestSession(
    code: string,
    name: string,
    ip: string,
    userAgent: string,
  ) {
    const test = await this.testRepo.findOne({
      where: { accessCode: code.toUpperCase(), isPublished: true },
    });
    if (!test) throw new NotFoundException('Test not found or not published');
    this.assertTestOpen(test);

    const guest = await this.authService.createGuest(name);
    const sessionData = await this.createOrResumeSession(
      test,
      guest.user.id,
      ip,
      userAgent,
    );
    return {
      accessToken: guest.accessToken,
      guest: guest.user,
      ...sessionData,
    };
  }

  private assertTestOpen(
    test: Test,
    startAt?: Date | null,
    endAt?: Date | null,
  ) {
    const now = new Date();
    const s = startAt ?? test.startAt;
    const e = endAt ?? test.endAt;
    if (s && s > now) throw new BadRequestException('Test has not started yet');
    if (e && e < now) throw new BadRequestException('Test has ended');
  }

  private async createOrResumeSession(
    test: Test,
    studentId: string,
    ip: string,
    userAgent: string,
  ) {
    const now = new Date();

    // return existing in_progress session
    const existing = await this.sessionRepo.findOne({
      where: { testId: test.id, studentId },
    });
    if (existing) {
      if (existing.status !== SessionStatus.IN_PROGRESS) {
        throw new BadRequestException('You have already completed this test');
      }
      if (existing.expiresAt && existing.expiresAt < now) {
        await this.autoSubmit(existing);
        throw new BadRequestException('Session expired');
      }
      return this.getSessionWithQuestions(existing);
    }

    const questions = await this.questionRepo.find({
      where: { testId: test.id },
    });
    if (!questions.length)
      throw new BadRequestException('Test has no questions');

    let questionOrder = questions.map((q) => q.id);
    if (test.randomizeQuestions) questionOrder = this.shuffle(questionOrder);

    const expiresAt = test.timeLimitMinutes
      ? new Date(now.getTime() + test.timeLimitMinutes * 60 * 1000)
      : undefined;

    const newSession = this.sessionRepo.create({
      testId: test.id,
      studentId,
      questionOrder,
      startedAt: now,
      expiresAt,
      ipAddress: ip,
      userAgent,
      status: SessionStatus.IN_PROGRESS,
    });
    const session = await this.sessionRepo.save(newSession);

    return this.getSessionWithQuestions(session);
  }

  async getSession(sessionId: string, studentId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, studentId },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.getSessionWithQuestions(session);
  }

  async saveAnswer(sessionId: string, studentId: string, dto: SaveAnswerDto) {
    const session = await this.validateActiveSession(sessionId, studentId);

    const question = await this.questionRepo.findOne({
      where: { id: dto.questionId, testId: session.testId },
    });
    if (!question)
      throw new NotFoundException('Question not found in this test');

    const existing = await this.answerRepo.findOne({
      where: { sessionId, questionId: dto.questionId },
    });

    if (existing) {
      await this.answerRepo.update(existing.id, {
        selectedOptionIds: dto.optionIds,
        timeSpentSeconds: dto.timeSpentSeconds,
        answeredAt: new Date(),
      });
    } else {
      await this.answerRepo.save(
        this.answerRepo.create({
          sessionId,
          questionId: dto.questionId,
          selectedOptionIds: dto.optionIds,
          timeSpentSeconds: dto.timeSpentSeconds,
          answeredAt: new Date(),
        }),
      );
    }

    return { message: 'Answer saved' };
  }

  async submitSession(sessionId: string, studentId: string) {
    await this.validateActiveSession(sessionId, studentId);
    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.SUBMITTED,
      submittedAt: new Date(),
    });
    const updatedSession = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    return this.resultsService.computeAndSave(updatedSession!);
  }

  async heartbeat(sessionId: string, studentId: string, dto: HeartbeatDto) {
    const session = await this.validateActiveSession(sessionId, studentId);
    const updates: Partial<TestSession> = {};

    if (!dto.tabVisible) {
      updates.tabSwitchCount = session.tabSwitchCount + 1;
      if (updates.tabSwitchCount >= 5) {
        // auto-submit after 5 tab switches
        await this.sessionRepo.update(sessionId, {
          ...updates,
          status: SessionStatus.AUTO_SUBMITTED,
          submittedAt: new Date(),
        });
        const updated = await this.sessionRepo.findOne({
          where: { id: sessionId },
        });
        await this.resultsService.computeAndSave(updated!);
        return {
          warning: 'Session auto-submitted due to tab switching',
          autoSubmitted: true,
        };
      }
    }

    const test = await this.testRepo.findOne({ where: { id: session.testId } });
    if (test?.enforceFullscreen && dto.isFullscreen === false) {
      updates.fullscreenViolations = session.fullscreenViolations + 1;
    }

    if (Object.keys(updates).length) {
      await this.sessionRepo.update(sessionId, updates);
    }

    const remaining = session.expiresAt
      ? Math.max(
          0,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
        )
      : null;

    return {
      tabSwitchCount: updates.tabSwitchCount ?? session.tabSwitchCount,
      warning:
        (updates.tabSwitchCount ?? session.tabSwitchCount) >= 3
          ? `Warning: ${updates.tabSwitchCount ?? session.tabSwitchCount} tab switches detected`
          : null,
      remainingSeconds: remaining,
    };
  }

  async getRemainingTime(sessionId: string, studentId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, studentId },
    });
    if (!session) throw new NotFoundException();
    const remaining = session.expiresAt
      ? Math.max(
          0,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
        )
      : null;
    return { remainingSeconds: remaining, expiresAt: session.expiresAt };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoSubmitExpiredSessions() {
    const expiredSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SessionStatus.IN_PROGRESS })
      .andWhere('s.expires_at IS NOT NULL')
      .andWhere('s.expires_at < NOW()')
      .getMany();

    for (const session of expiredSessions) {
      try {
        await this.autoSubmit(session);
      } catch (err) {
        this.logger.error(
          `Failed to auto-submit session ${session.id}: ${err.message}`,
        );
      }
    }
    if (expiredSessions.length > 0) {
      this.logger.log(
        `Auto-submitted ${expiredSessions.length} expired sessions`,
      );
    }
  }

  private async autoSubmit(session: TestSession) {
    await this.sessionRepo.update(session.id, {
      status: SessionStatus.AUTO_SUBMITTED,
      submittedAt: new Date(),
    });
    const updated = await this.sessionRepo.findOne({
      where: { id: session.id },
    });
    await this.resultsService.computeAndSave(updated!);
  }

  private async validateActiveSession(sessionId: string, studentId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, studentId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not active');
    }
    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.autoSubmit(session);
      throw new BadRequestException('Session has expired');
    }
    return session;
  }

  private async getSessionWithQuestions(session: TestSession) {
    const test = await this.testRepo.findOne({ where: { id: session.testId } });
    const questions = await this.questionRepo.find({
      where: { id: In(session.questionOrder), testId: session.testId },
      relations: { options: true },
    });

    // preserve shuffled order and shuffle options if configured
    const orderedQuestions = session.questionOrder
      .map((qId) => questions.find((q) => q.id === qId))
      .filter((q): q is typeof q & NonNullable<typeof q> => Boolean(q))
      .map((q) => {
        if (test?.shuffleOptions) {
          q.options = this.shuffle([...q.options]);
        }
        // hide is_correct from student view
        q.options = q.options.map((o) => {
          const { isCorrect: _isCorrect, ...rest } = o as any;
          return rest;
        });
        return q;
      });

    const remaining = session.expiresAt
      ? Math.max(
          0,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
        )
      : null;

    return {
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        remainingSeconds: remaining,
        tabSwitchCount: session.tabSwitchCount,
        enforceFullscreen: test?.enforceFullscreen,
      },
      questions: orderedQuestions,
      totalQuestions: orderedQuestions.length,
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
