import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Question } from '../../questions/entities/question.entity';

@Entity('options')
export class Option {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'question_id' })
  questionId!: string;

  @ManyToOne(() => Question, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl!: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean = false;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
