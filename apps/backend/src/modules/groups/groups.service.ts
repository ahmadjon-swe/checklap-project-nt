import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto, UpdateGroupDto, JoinGroupDto } from './dto/group.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
  ) {}

  async create(teacherId: string, dto: CreateGroupDto) {
    const inviteCode = this.generateCode();
    const group = this.groupRepo.create({ ...dto, teacherId, inviteCode });
    return this.groupRepo.save(group);
  }

  async findAll(userId: string, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.groupRepo.find({
        where: { teacherId: userId },
        order: { createdAt: 'DESC' },
      });
    }
    const memberships = await this.memberRepo.find({
      where: { studentId: userId, isActive: true },
      relations: { group: true },
    });
    return memberships.map((m) => m.group);
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (role === UserRole.TEACHER && group.teacherId !== userId) {
      throw new ForbiddenException();
    }
    return group;
  }

  async update(id: string, teacherId: string, dto: UpdateGroupDto) {
    const group = await this.ownerGroup(id, teacherId);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async remove(id: string, teacherId: string) {
    const group = await this.ownerGroup(id, teacherId);
    await this.groupRepo.softRemove(group);
    return { message: 'Group deleted' };
  }

  async join(studentId: string, dto: JoinGroupDto) {
    const group = await this.groupRepo.findOne({
      where: { inviteCode: dto.inviteCode, isActive: true },
    });
    if (!group) throw new NotFoundException('Invalid invite code');

    const existing = await this.memberRepo.findOne({
      where: { groupId: group.id, studentId },
    });
    if (existing) {
      if (existing.isActive) throw new ConflictException('Already a member');
      await this.memberRepo.update(existing.id, { isActive: true });
      return group;
    }

    await this.memberRepo.save(
      this.memberRepo.create({ groupId: group.id, studentId }),
    );
    return group;
  }

  async leave(studentId: string, groupId: string) {
    const member = await this.memberRepo.findOne({
      where: { groupId, studentId, isActive: true },
    });
    if (!member) throw new NotFoundException('Not a member of this group');
    await this.memberRepo.update(member.id, { isActive: false });
    return { message: 'Left group' };
  }

  async getMembers(groupId: string, teacherId: string) {
    await this.ownerGroup(groupId, teacherId);
    return this.memberRepo.find({
      where: { groupId, isActive: true },
      relations: { student: true },
      order: { joinedAt: 'DESC' },
    });
  }

  async removeMember(groupId: string, teacherId: string, studentId: string) {
    await this.ownerGroup(groupId, teacherId);
    const member = await this.memberRepo.findOne({
      where: { groupId, studentId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.memberRepo.update(member.id, { isActive: false });
    return { message: 'Member removed' };
  }

  async regenerateInviteCode(groupId: string, teacherId: string) {
    const group = await this.ownerGroup(groupId, teacherId);
    group.inviteCode = this.generateCode();
    await this.groupRepo.save(group);
    return { inviteCode: group.inviteCode };
  }

  private async ownerGroup(id: string, teacherId: string) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.teacherId !== teacherId) throw new ForbiddenException();
    return group;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }
}
