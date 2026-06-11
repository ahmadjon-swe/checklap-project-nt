import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, unique: true })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number = 0;

  @Column({
    name: 'billing_period',
    type: 'enum',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  })
  billingPeriod!: 'monthly' | 'yearly';

  @Column({ name: 'max_tests_per_day', nullable: true, type: 'int' })
  maxTestsPerDay!: number | null;

  @Column({ name: 'max_questions_per_test', nullable: true, type: 'int' })
  maxQuestionsPerTest!: number | null;

  @Column({ name: 'max_groups', nullable: true, type: 'int' })
  maxGroups!: number | null;

  @Column({ name: 'can_export', default: false })
  canExport: boolean = false;

  @Column({ name: 'can_use_analytics', default: false })
  canUseAnalytics: boolean = false;

  @Column({ name: 'can_import', default: false })
  canImport: boolean = false;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
