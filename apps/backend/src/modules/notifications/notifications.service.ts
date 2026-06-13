import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('mail.host'),
      port: config.get<number>('mail.port'),
      secure: false,
      auth: {
        user: config.get<string>('mail.user'),
        pass: config.get<string>('mail.pass'),
      },
    });
  }

  async sendOtpEmail(email: string, firstName: string, code: string) {
    await this.send({
      to: email,
      subject: 'Your QuizApp verification code',
      html: `
        <h2>Hello, ${firstName}!</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:8px;font-size:48px;color:#4F46E5">${code}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });
  }

  async sendTestReminderEmail(
    email: string,
    firstName: string,
    testTitle: string,
    startAt: Date,
    telegramChatId?: string,
  ) {
    await this.send({
      to: email,
      subject: `Reminder: "${testTitle}" starts soon`,
      html: `
        <h2>Hello, ${firstName}!</h2>
        <p>Your test <strong>"${testTitle}"</strong> starts at <strong>${startAt.toLocaleString()}</strong>.</p>
        <p>Make sure you're ready!</p>
      `,
    });
    if (telegramChatId) {
      await this.sendTelegramMessage(
        telegramChatId,
        `⏰ <b>Reminder</b>\n\nYour test "<b>${testTitle}</b>" starts at <b>${startAt.toLocaleString()}</b>.\n\nMake sure you're ready!`,
      );
    }
  }

  async sendResultEmail(
    email: string,
    firstName: string,
    testTitle: string,
    percentage: number,
    telegramChatId?: string,
  ) {
    await this.send({
      to: email,
      subject: `Your results for "${testTitle}"`,
      html: `
        <h2>Hello, ${firstName}!</h2>
        <p>You scored <strong>${percentage.toFixed(1)}%</strong> on <strong>"${testTitle}"</strong>.</p>
        <p>Log in to QuizApp to view your detailed results.</p>
      `,
    });
    if (telegramChatId) {
      const emoji = percentage >= 70 ? '🎉' : percentage >= 50 ? '📊' : '📉';
      await this.sendTelegramMessage(
        telegramChatId,
        `${emoji} <b>Results for "${testTitle}"</b>\n\nScore: <b>${percentage.toFixed(1)}%</b>\n\nLog in to QuizApp to see your detailed results.`,
      );
    }
  }

  async sendTelegramMessage(chatId: string, text: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || !chatId) return;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(
          `Telegram sendMessage failed for chatId ${chatId}: ${body}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to send Telegram message to ${chatId}: ${err.message}`,
      );
    }
  }

  private async send(options: { to: string; subject: string; html: string }) {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('mail.from'),
        ...options,
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${err.message}`,
      );
    }
  }
}
