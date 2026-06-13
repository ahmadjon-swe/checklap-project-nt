import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Test } from '../tests/entities/test.entity';
import { Result } from '../results/entities/result.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  paginate,
  paginatedResponse,
  PaginationDto,
} from '../../common/helpers/pagination.helper';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async getPlatformStats() {
    const [totalUsers, totalTests, totalResults, activeSubscriptions] =
      await Promise.all([
        this.userRepo.count(),
        this.testRepo.count(),
        this.resultRepo.count(),
        this.subRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      ]);
    return { totalUsers, totalTests, totalResults, activeSubscriptions };
  }

  async getAllUsers(pagination: PaginationDto) {
    const { skip, take } = paginate(pagination.page, pagination.limit);
    const [data, total] = await this.userRepo.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    return paginatedResponse(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  async getPendingPayments(pagination: PaginationDto) {
    const { skip, take } = paginate(pagination.page, pagination.limit);
    const [data, total] = await this.subRepo.findAndCount({
      where: {
        status: SubscriptionStatus.PENDING,
        paymentMethod: 'manual' as any,
      },
      relations: { user: true, plan: true },
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    return paginatedResponse(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  async approvePayment(subscriptionId: string) {
    return this.subscriptionsService.approveManualSubscription(subscriptionId);
  }

  async updateUser(id: string, patch: { role?: UserRole; isActive?: boolean }) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(id, patch);
    return this.userRepo.findOneBy({ id });
  }

  async getAllSubscriptions(pagination: PaginationDto) {
    const { skip, take } = paginate(pagination.page, pagination.limit);
    const [data, total] = await this.subRepo.findAndCount({
      relations: { user: true, plan: true },
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    return paginatedResponse(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }
}
