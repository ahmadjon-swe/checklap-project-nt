import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Question } from '../../questions/entities/question.entity';

@Entity('item_stats')
export class ItemStat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'question_id', unique: true })
  questionId!: string;

  @OneToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'total_attempts', default: 0 })
  totalAttempts: number = 0;

  @Column({ name: 'correct_attempts', default: 0 })
  correctAttempts: number = 0;

  @Column({
    name: 'avg_time_seconds',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  avgTimeSeconds: number = 0;

  @Column({
    name: 'difficulty_index',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
  })
  difficultyIndex: number = 0;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
