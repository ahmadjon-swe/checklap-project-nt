import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { TestSession } from './entities/test-session.entity';
import { SessionAnswer } from './entities/session-answer.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { ResultsModule } from '../results/results.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestSession,
      SessionAnswer,
      Test,
      Question,
      Option,
      GroupMember,
      TestGroup,
    ]),
    ResultsModule,
    AuthModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
