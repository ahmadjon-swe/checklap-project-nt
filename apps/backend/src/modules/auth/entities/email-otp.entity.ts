import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('email_otps')
export class EmailOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 6 })
  code!: string;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean = false;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
