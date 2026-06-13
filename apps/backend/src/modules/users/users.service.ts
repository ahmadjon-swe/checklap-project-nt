import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';
import {
  paginate,
  paginatedResponse,
  PaginationDto,
} from '../../common/helpers/pagination.helper';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findMe(userId: string) {
    return this.findOne(userId);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    await this.repo.update(userId, dto);
    return this.findOne(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.repo.update(userId, { passwordHash });
    return { message: 'Password updated' };
  }

  async findAll(pagination: PaginationDto) {
    const { skip, take } = paginate(pagination.page, pagination.limit);
    const [data, total] = await this.repo.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
      withDeleted: false,
    });
    return paginatedResponse(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    await this.repo.update(id, { isActive });
    return { message: `User ${isActive ? 'activated' : 'deactivated'}` };
  }

  async updateRole(id: string, role: UserRole) {
    await this.findOne(id);
    await this.repo.update(id, { role });
    return { message: `User role updated to ${role}` };
  }
}
