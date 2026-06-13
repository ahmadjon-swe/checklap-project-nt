import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ResultVisibility {
  PERCENTAGE_ONLY = 'percentage_only',
  CORRECT_INCORRECT = 'correct_incorrect',
  FULL_REVIEW = 'full_review',
}

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'teacher_id' })
  teacherId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher!: User;

  @Column({ length: 500 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'time_limit_minutes', nullable: true, type: 'int' })
  timeLimitMinutes!: number | null;

  @Column({ name: 'start_at', nullable: true, type: 'timestamptz' })
  startAt!: Date | null;

  @Column({ name: 'end_at', nullable: true, type: 'timestamptz' })
  endAt!: Date | null;

  @Column({
    name: 'result_visibility',
    type: 'enum',
    enum: ResultVisibility,
    default: ResultVisibility.PERCENTAGE_ONLY,
  })
  resultVisibility!: ResultVisibility;

  @Column({
    name: 'passing_threshold',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  passingThreshold!: number | null;

  @Column({ name: 'randomize_questions', default: true })
  randomizeQuestions: boolean = true;

  @Column({ name: 'shuffle_options', default: true })
  shuffleOptions: boolean = true;

  @Column({ name: 'enforce_fullscreen', default: false })
  enforceFullscreen: boolean = false;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean = false;

  // Short shareable code so students can take the test via a link/code
  // without an account ("guest" mode). Generated when the test is published.
  @Column({
    name: 'access_code',
    type: 'varchar',
    length: 12,
    unique: true,
    nullable: true,
  })
  accessCode!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;
}
