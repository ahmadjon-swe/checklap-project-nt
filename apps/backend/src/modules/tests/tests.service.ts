import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Test } from './entities/test.entity';
import { TestGroup } from './entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { CreateTestDto, UpdateTestDto, AssignGroupsDto } from './dto/test.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test) private repo: Repository<Test>,
    @InjectRepository(TestGroup) private testGroupRepo: Repository<TestGroup>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
  ) {}

  async create(teacherId: string, dto: CreateTestDto) {
    const test = this.repo.create({ ...dto, teacherId });
    return this.repo.save(test);
  }

  async findAll(userId: string, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.repo.find({
        where: { teacherId: userId },
        order: { createdAt: 'DESC' },
      });
    }

    // student: find tests assigned to their groups, that are published
    const memberships = await this.memberRepo.find({
      where: { studentId: userId, isActive: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (!groupIds.length) return [];

    const testGroups = await this.testGroupRepo.find({
      where: { groupId: In(groupIds) },
    });
    const testIds = [...new Set(testGroups.map((tg) => tg.testId))];
    if (!testIds.length) return [];

    return this.repo.find({
      where: { id: In(testIds), isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const test = await this.repo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (role === UserRole.TEACHER && test.teacherId !== userId)
      throw new ForbiddenException();
    return test;
  }

  async update(id: string, teacherId: string, dto: UpdateTestDto) {
    const test = await this.ownerTest(id, teacherId);
    Object.assign(test, dto);
    return this.repo.save(test);
  }

  async remove(id: string, teacherId: string) {
    const test = await this.ownerTest(id, teacherId);
    await this.repo.softRemove(test);
    return { message: 'Test deleted' };
  }

  async publish(id: string, teacherId: string) {
    const test = await this.ownerTest(id, teacherId);
    const accessCode = test.accessCode || (await this.generateAccessCode());
    await this.repo.update(id, { isPublished: true, accessCode });
    return { message: 'Test published', accessCode };
  }

  // Generates a short, human-friendly, collision-checked share code.
  private async generateAccessCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++)
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      const clash = await this.repo.findOne({ where: { accessCode: code } });
      if (!clash) return code;
    }
    return Date.now().toString(36).toUpperCase().slice(-8);
  }

  async assignGroups(testId: string, teacherId: string, dto: AssignGroupsDto) {
    await this.ownerTest(testId, teacherId);
    const existing = await this.testGroupRepo.find({ where: { testId } });
    const existingGroupIds = existing.map((tg) => tg.groupId);
    const toAdd = dto.groupIds.filter((gId) => !existingGroupIds.includes(gId));
    const records = toAdd.map((groupId) =>
      this.testGroupRepo.create({
        testId,
        groupId,
        assignedBy: teacherId,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
      }),
    );
    if (records.length) await this.testGroupRepo.save(records);

    // Update schedule for already-assigned groups if provided
    if (
      (dto.startAt !== undefined || dto.endAt !== undefined) &&
      existing.length
    ) {
      const alreadyAssigned = existing.filter((tg) =>
        dto.groupIds.includes(tg.groupId),
      );
      for (const tg of alreadyAssigned) {
        await this.testGroupRepo.update(tg.id, {
          startAt: dto.startAt ? new Date(dto.startAt) : tg.startAt,
          endAt: dto.endAt ? new Date(dto.endAt) : tg.endAt,
        });
      }
    }

    return { message: `Assigned ${records.length} group(s)` };
  }

  async removeGroup(testId: string, teacherId: string, groupId: string) {
    await this.ownerTest(testId, teacherId);
    await this.testGroupRepo.delete({ testId, groupId });
    return { message: 'Group removed from test' };
  }

  async getGroups(testId: string, teacherId: string) {
    await this.ownerTest(testId, teacherId);
    const testGroups = await this.testGroupRepo.find({
      where: { testId },
      relations: { group: true },
    });
    return testGroups.map((tg) => tg.group);
  }

  private async ownerTest(id: string, teacherId: string) {
    const test = await this.repo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacherId !== teacherId) throw new ForbiddenException();
    return test;
  }
}
