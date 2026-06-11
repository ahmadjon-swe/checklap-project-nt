import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription) private repo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepo: Repository<SubscriptionPlan>,
  ) {}

  async getPlans() {
    return this.planRepo.find({ order: { price: 'ASC' } });
  }

  async updatePlan(
    id: string,
    patch: {
      price?: number;
      name?: string;
      maxTestsPerDay?: number | null;
      maxQuestionsPerTest?: number | null;
      maxGroups?: number | null;
      canExport?: boolean;
      canImport?: boolean;
      canUseAnalytics?: boolean;
    },
  ) {
    const plan = await this.planRepo.findOneBy({ id });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.planRepo.update(id, patch);
    return this.planRepo.findOneBy({ id });
  }

  async getMySubscription(userId: string) {
    const sub = await this.repo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    if (!sub) {
      const freePlan = await this.planRepo.findOne({ where: { name: 'free' } });
      return { plan: freePlan, status: 'free' };
    }
    return sub;
  }

  async getActiveFeatures(userId: string): Promise<SubscriptionPlan> {
    const sub = await this.repo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
      order: { endsAt: 'DESC' },
    });
    if (sub) return sub.plan;
    const freePlan = await this.planRepo.findOne({ where: { name: 'free' } });
    if (!freePlan) {
      return {
        maxTestsPerDay: 3,
        maxQuestionsPerTest: 20,
        maxGroups: 2,
        canExport: false,
        canImport: false,
        canUseAnalytics: false,
      } as SubscriptionPlan;
    }
    return freePlan;
  }

  async createManualRequest(userId: string, planId: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(
      endsAt.getMonth() + (plan.billingPeriod === 'yearly' ? 12 : 1),
    );

    const sub = this.repo.create({
      userId,
      planId,
      status: SubscriptionStatus.PENDING,
      paymentMethod: 'manual' as any,
      startsAt: now,
      endsAt,
    });
    return this.repo.save(sub);
  }

  async approveManualSubscription(subscriptionId: string) {
    const sub = await this.repo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException();
    await this.repo.update(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
    });
    return { message: 'Subscription approved' };
  }

  async activateStripeSubscription(
    userId: string,
    planId: string,
    stripeSubscriptionId: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(
      endsAt.getMonth() + (plan?.billingPeriod === 'yearly' ? 12 : 1),
    );

    await this.repo.save(
      this.repo.create({
        userId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'stripe' as any,
        stripeSubscriptionId,
        startsAt: now,
        endsAt,
      }),
    );
  }

  async cancelSubscription(userId: string) {
    await this.repo.update(
      { userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED },
    );
    return { message: 'Subscription cancelled' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireSubscriptions() {
    const expired = await this.repo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('s.ends_at < NOW()')
      .getMany();

    if (expired.length) {
      await this.repo.update(
        expired.map((s) => s.id),
        { status: SubscriptionStatus.EXPIRED },
      );
      this.logger.log(`Expired ${expired.length} subscriptions`);
    }
  }
}
