import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportExportService } from './import-export.service';
import { ImportExportController } from './import-export.controller';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { Test } from '../tests/entities/test.entity';
import { Result } from '../results/entities/result.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      Option,
      Test,
      Result,
      GroupMember,
      Group,
    ]),
  ],
  providers: [ImportExportService],
  controllers: [ImportExportController],
})
export class ImportExportModule {}
