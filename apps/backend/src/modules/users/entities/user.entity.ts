import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ unique: true, nullable: true })
  email!: string;

  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash!: string;

  @Column({ name: 'first_name', length: 100, default: '' })
  firstName: string = '';

  @Column({ name: 'last_name', length: 100, default: '' })
  lastName: string = '';

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl!: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @Index()
  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId!: string;

  @Index()
  @Column({
    name: 'telegram_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  telegramId!: string | null;

  @Column({ name: 'telegram_username', type: 'varchar', nullable: true })
  telegramUsername!: string | null;

  @Column({ name: 'telegram_chat_id', type: 'varchar', nullable: true })
  telegramChatId!: string | null;

  @Exclude()
  @Column({ name: 'link_token', type: 'varchar', nullable: true })
  linkToken!: string | null;

  @Exclude()
  @Column({
    name: 'link_token_expires_at',
    nullable: true,
    type: 'timestamptz',
  })
  linkTokenExpiresAt!: Date | null;

  @Column({ name: 'is_verified', default: false, type: 'boolean' })
  isVerified: boolean = false;

  @Column({ name: 'is_active', default: true, type: 'boolean' })
  isActive: boolean = true;

  // True for anonymous users created when someone takes a test via a guest
  // link. They have no email/password and are hidden from real user lists.
  @Index()
  @Column({ name: 'is_guest', type: 'boolean', default: false })
  isGuest: boolean = false;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean = false;

  // Pending email change — set when the user requests a change; confirmed via OTP
  @Column({ name: 'pending_email', type: 'varchar', nullable: true })
  pendingEmail!: string | null;

  @CreateDateColumn({ name: 'created_at', nullable: true, type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true, type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt!: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
