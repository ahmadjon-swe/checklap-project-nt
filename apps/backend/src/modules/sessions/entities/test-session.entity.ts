import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Test } from '../../tests/entities/test.entity';
import { User } from '../../users/entities/user.entity';

export enum SessionStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  AUTO_SUBMITTED = 'auto_submitted',
  EXPIRED = 'expired',
}

@Entity('test_sessions')
@Unique(['testId', 'studentId'])
export class TestSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'test_id' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Index()
  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  @Index()
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.IN_PROGRESS,
  })
  status!: SessionStatus;

  @Column({ name: 'question_order', type: 'jsonb' })
  questionOrder!: string[];

  @Column({ name: 'started_at' })
  startedAt!: Date;

  @Column({ name: 'submitted_at', nullable: true, type: 'timestamptz' })
  submittedAt!: Date | null;

  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt!: Date | null;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string;

  @Column({ name: 'tab_switch_count', default: 0 })
  tabSwitchCount: number = 0;

  @Column({ name: 'fullscreen_violations', default: 0 })
  fullscreenViolations: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
