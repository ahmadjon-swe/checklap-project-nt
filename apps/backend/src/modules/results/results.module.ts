import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { Result } from './entities/result.entity';
import { TestSession } from '../sessions/entities/test-session.entity';
import { SessionAnswer } from '../sessions/entities/session-answer.entity';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { Test } from '../tests/entities/test.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Result,
      TestSession,
      SessionAnswer,
      Question,
      Option,
      Test,
      TestGroup,
      GroupMember,
    ]),
  ],
  providers: [ResultsService],
  controllers: [ResultsController],
  exports: [ResultsService],
})
export class ResultsModule {}
