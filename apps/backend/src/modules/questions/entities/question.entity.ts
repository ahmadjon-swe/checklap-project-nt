import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Test } from '../../tests/entities/test.entity';
import { Option } from '../../options/entities/option.entity';

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'test_id' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl!: string;

  @Column({ type: 'text', nullable: true })
  explanation!: string;

  @Column({ type: 'enum', enum: Difficulty, default: Difficulty.MEDIUM })
  difficulty!: Difficulty;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 1.0 })
  score: number = 1.0;

  @Column({ length: 255, nullable: true })
  topic!: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number = 0;

  @OneToMany(() => Option, (option) => option.question, { cascade: true })
  options!: Option[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;
}
