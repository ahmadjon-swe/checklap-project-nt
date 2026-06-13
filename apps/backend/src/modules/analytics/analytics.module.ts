import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ItemStat } from './entities/item-stat.entity';
import { Result } from '../results/entities/result.entity';
import { Question } from '../questions/entities/question.entity';
import { SessionAnswer } from '../sessions/entities/session-answer.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Test } from '../tests/entities/test.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemStat,
      Result,
      Question,
      SessionAnswer,
      TestGroup,
      GroupMember,
      Test,
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
