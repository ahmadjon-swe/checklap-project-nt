import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';
import { Option } from './entities/option.entity';
import { Question } from '../questions/entities/question.entity';
import { Test } from '../tests/entities/test.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Option, Question, Test])],
  providers: [OptionsService],
  controllers: [OptionsController],
  exports: [OptionsService],
})
export class OptionsModule {}
