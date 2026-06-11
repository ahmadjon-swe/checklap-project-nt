import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Test } from '../tests/entities/test.entity';
import { Option } from '../options/entities/option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Test, Option])],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService, TypeOrmModule],
})
export class QuestionsModule {}
