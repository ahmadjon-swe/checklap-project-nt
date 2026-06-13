import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { Test } from './entities/test.entity';
import { TestGroup } from './entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Test, TestGroup, GroupMember])],
  providers: [TestsService],
  controllers: [TestsController],
  exports: [TestsService, TypeOrmModule],
})
export class TestsModule {}
