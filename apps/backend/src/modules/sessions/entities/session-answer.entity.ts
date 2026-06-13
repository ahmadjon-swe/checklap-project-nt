import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { TestSession } from './test-session.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity('session_answers')
@Unique(['sessionId', 'questionId'])
export class SessionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'session_id' })
  sessionId!: string;

  @ManyToOne(() => TestSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: TestSession;

  @Column({ name: 'question_id' })
  questionId!: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'selected_option_ids', type: 'jsonb', default: '[]' })
  selectedOptionIds: string[] = [];

  @Column({ name: 'time_spent_seconds', nullable: true, type: 'int' })
  timeSpentSeconds!: number;

  @Column({ name: 'answered_at', nullable: true })
  answeredAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
