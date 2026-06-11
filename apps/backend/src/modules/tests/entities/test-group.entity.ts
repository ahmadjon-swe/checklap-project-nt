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
import { Test } from './test.entity';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';

@Entity('test_groups')
@Unique(['testId', 'groupId'])
export class TestGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'test_id' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Index()
  @Column({ name: 'group_id' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ name: 'assigned_by' })
  assignedBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assigner!: User;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;

  // When a test is assigned to a group, the teacher can optionally set a
  // window during which students in that group may take it. This replaces
  // the old per-test startAt/endAt, which was confusing.
  @Column({ name: 'start_at', nullable: true, type: 'timestamptz' })
  startAt!: Date | null;

  @Column({ name: 'end_at', nullable: true, type: 'timestamptz' })
  endAt!: Date | null;
}
