import { Module } from '@nestjs/common';
import { Agent as HttpsAgent } from 'https';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { TelegramUpdate } from './telegram.update';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { TestsModule } from '../tests/tests.module';
import { GroupsModule } from '../groups/groups.module';
import { QuestionsModule } from '../questions/questions.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ResultsModule } from '../results/results.module';
import { AdminModule } from '../admin/admin.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const proxy = config.get<string>('HTTPS_PROXY');
        const validProxy = proxy && isValidUrl(proxy) ? proxy : null;

        const agent = validProxy
          ? (new HttpsProxyAgent(validProxy) as any)
          : new HttpsAgent({ keepAlive: true, family: 4 });

        return {
          token: config.get<string>('TELEGRAM_BOT_TOKEN') || '',
          launchOptions: false,
          options: {
            telegram: { agent },
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    TestsModule,
    GroupsModule,
    QuestionsModule,
    SessionsModule,
    ResultsModule,
    AdminModule,
    AnalyticsModule,
    UsersModule,
    SubscriptionsModule,
  ],
  providers: [TelegramUpdate],
})
export class TelegramModule {}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
