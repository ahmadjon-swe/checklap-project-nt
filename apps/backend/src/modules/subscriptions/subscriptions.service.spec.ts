import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

/**
 * Feature gating decides what a teacher is allowed to do, so the fallbacks
 * (active plan -> free plan -> hardcoded safe defaults) must be exact.
 */
describe('SubscriptionsService.getActiveFeatures', () => {
  let service: SubscriptionsService;
  let subRepo: { findOne: jest.Mock };
  let planRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    subRepo = { findOne: jest.fn() };
    planRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  it("returns the active subscription's plan when one exists", async () => {
    const plan = { name: 'pro', canExport: true } as SubscriptionPlan;
    subRepo.findOne.mockResolvedValue({ plan });

    await expect(service.getActiveFeatures('u1')).resolves.toBe(plan);
    expect(planRepo.findOne).not.toHaveBeenCalled();
  });

  it('falls back to the free plan when there is no active subscription', async () => {
    subRepo.findOne.mockResolvedValue(null);
    const freePlan = { name: 'free', canExport: false } as SubscriptionPlan;
    planRepo.findOne.mockResolvedValue(freePlan);

    await expect(service.getActiveFeatures('u1')).resolves.toBe(freePlan);
    expect(planRepo.findOne).toHaveBeenCalledWith({ where: { name: 'free' } });
  });

  it('falls back to safe defaults when no free plan is seeded', async () => {
    subRepo.findOne.mockResolvedValue(null);
    planRepo.findOne.mockResolvedValue(null);

    const features = await service.getActiveFeatures('u1');
    expect(features).toMatchObject({
      maxTestsPerDay: 3,
      maxQuestionsPerTest: 20,
      maxGroups: 2,
      canExport: false,
      canImport: false,
      canUseAnalytics: false,
    });
  });

  it('only considers ACTIVE subscriptions', async () => {
    subRepo.findOne.mockResolvedValue(null);
    planRepo.findOne.mockResolvedValue({ name: 'free' } as SubscriptionPlan);

    await service.getActiveFeatures('u1');
    expect(subRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', status: SubscriptionStatus.ACTIVE },
      }),
    );
  });
});
