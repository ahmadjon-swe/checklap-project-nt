import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { TestSession } from '../../sessions/entities/test-session.entity';
import { User } from '../../users/entities/user.entity';
import { Test } from '../../tests/entities/test.entity';

@Entity('results')
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', unique: true })
  sessionId!: string;

  @OneToOne(() => TestSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: TestSession;

  @Index()
  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  @Index()
  @Column({ name: 'test_id' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({ name: 'raw_score', type: 'decimal', precision: 10, scale: 2 })
  rawScore!: number;

  @Column({
    name: 'max_possible_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  maxPossibleScore!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage!: number;

  @Column({ nullable: true, type: 'boolean' })
  passed!: boolean | null;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions!: number;

  @Column({ name: 'correct_count', type: 'int' })
  correctCount!: number;

  @Column({ name: 'incorrect_count', type: 'int' })
  incorrectCount!: number;

  @Column({ name: 'unanswered_count', type: 'int' })
  unansweredCount!: number;

  @Column({ name: 'time_taken_seconds', type: 'int' })
  timeTakenSeconds!: number;

  @CreateDateColumn({ name: 'computed_at' })
  computedAt!: Date;
}
