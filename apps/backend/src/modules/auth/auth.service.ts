import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { EmailOtp } from './entities/email-otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(EmailOtp) private otpRepo: Repository<EmailOtp>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? UserRole.STUDENT,
    });
    await this.usersRepo.save(user);

    await this.sendOtp(user);
    return { message: 'Registration successful. Check your email for OTP.' };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    const user = await this.findUserByEmail(dto.email);
    await this.validateOtp(user.id, dto.code);
    await this.usersRepo.update(user.id, { isVerified: true });
    return { message: 'Email verified successfully' };
  }

  async resendOtp(email: string) {
    const user = await this.findUserByEmail(email);
    if (user.isVerified)
      throw new BadRequestException('Email already verified');

    const recent = await this.otpRepo.count({
      where: { userId: user.id, isUsed: false },
    });
    if (recent >= 3)
      throw new BadRequestException('Too many OTP requests. Try again later.');

    await this.sendOtp(user);
    return { message: 'OTP sent' };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified)
      throw new UnauthorizedException('Please verify your email first');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.twoFactorEnabled) {
      await this.sendOtp(user);
      return { requires2FA: true, email: user.email };
    }

    return this.generateTokens(user, ip, userAgent);
  }

  async verify2FA(email: string, code: string, ip: string, userAgent: string) {
    const user = await this.findUserByEmail(email);
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    await this.validateOtp(user.id, code);
    return this.generateTokens(user, ip, userAgent);
  }

  async changeEmail(userId: string, newEmail: string) {
    const existing = await this.usersRepo.findOne({
      where: { email: newEmail },
    });
    if (existing) throw new ConflictException('Email already in use');
    await this.usersRepo.update(userId, { pendingEmail: newEmail });
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    // Send OTP to the NEW email address
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.otpRepo.save(this.otpRepo.create({ userId, code, expiresAt }));
    await this.notifications.sendOtpEmail(newEmail, user!.firstName, code);
    return { message: 'Verification code sent to new email' };
  }

  async confirmEmailChange(userId: string, code: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.pendingEmail)
      throw new BadRequestException('No pending email change');
    await this.validateOtp(userId, code);
    await this.usersRepo.update(userId, {
      email: user.pendingEmail,
      pendingEmail: null,
    });
    return { message: 'Email updated successfully' };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Incorrect password');
    }
    await this.refreshRepo.delete({ userId });
    await this.usersRepo.softDelete(userId);
    return { message: 'Account deleted' };
  }

  async toggle2FA(userId: string, enable: boolean) {
    await this.usersRepo.update(userId, { twoFactorEnabled: enable });
    return { twoFactorEnabled: enable };
  }

  async refresh(token: string, ip: string, userAgent: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.refreshRepo.findOne({
      where: { userId: payload.sub },
      order: { createdAt: 'DESC' },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshRepo.delete(stored.id);

    const user = await this.usersRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) throw new UnauthorizedException();

    return this.generateTokens(user, ip, userAgent);
  }

  async logout(userId: string) {
    await this.refreshRepo.delete({ userId });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) return { message: 'If the email exists, an OTP has been sent' };
    await this.sendOtp(user);
    return { message: 'If the email exists, an OTP has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    await this.validateOtp(user.id, dto.code);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepo.update(user.id, { passwordHash });
    await this.refreshRepo.delete({ userId: user.id });
    return { message: 'Password reset successful' };
  }

  /**
   * Creates an anonymous "guest" student for taking a test via a shared link,
   * and returns a short-lived access token. No email/password, no refresh
   * token — the guest only needs to finish the one test.
   */
  async createGuest(name: string) {
    const clean = (name || '').trim().slice(0, 100) || 'Guest';
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        firstName: clean,
        lastName: '',
        role: UserRole.STUDENT,
        isGuest: true,
        isVerified: true,
        isActive: true,
      }),
    );

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: null, role: user.role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') as any,
      },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isGuest: true,
      },
    };
  }

  private async generateTokens(user: User, ip: string, userAgent: string) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as any,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: ip,
        deviceInfo: userAgent,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl ?? null,
        telegramId: user.telegramId ?? null,
        telegramUsername: user.telegramUsername ?? null,
      },
    };
  }

  private async sendOtp(user: User) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepo.save(
      this.otpRepo.create({ userId: user.id, code, expiresAt }),
    );
    await this.notifications.sendOtpEmail(user.email, user.firstName, code);
  }

  private async validateOtp(userId: string, code: string) {
    const otp = await this.otpRepo.findOne({
      where: { userId, code, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) throw new BadRequestException('Invalid OTP code');
    if (otp.expiresAt < new Date())
      throw new BadRequestException('OTP code has expired');

    await this.otpRepo.update(otp.id, { isUsed: true });
  }

  async googleLogin(
    profile: {
      googleId: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    },
    ip: string,
    userAgent: string,
  ) {
    let user = await this.usersRepo.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      const byEmail = profile.email
        ? await this.usersRepo.findOne({ where: { email: profile.email } })
        : null;

      if (byEmail) {
        byEmail.googleId = profile.googleId;
        byEmail.authProvider = AuthProvider.GOOGLE;
        if (!byEmail.avatarUrl && profile.avatarUrl)
          byEmail.avatarUrl = profile.avatarUrl;
        user = await this.usersRepo.save(byEmail);
      } else {
        user = await this.usersRepo.save(
          this.usersRepo.create({
            email: profile.email,
            googleId: profile.googleId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            authProvider: AuthProvider.GOOGLE,
            isVerified: true,
            role: UserRole.STUDENT,
          }),
        );
      }
    }

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');
    return this.generateTokens(user, ip, userAgent);
  }

  async generateTelegramLinkToken(userId: string): Promise<{ token: string }> {
    // 12 hex chars (48 bits). 6 chars / 24 bits was small enough to brute-force
    // even within the 15-minute expiry window.
    const token = randomBytes(6).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.usersRepo.update(userId, {
      linkToken: token,
      linkTokenExpiresAt: expiresAt,
    });
    return { token };
  }

  async linkTelegramAccount(
    token: string,
    telegramId: string,
    telegramUsername: string,
    telegramChatId: string,
  ): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { linkToken: token },
    });

    if (!user) throw new NotFoundException('Invalid or expired link token');
    if (!user.linkTokenExpiresAt || user.linkTokenExpiresAt < new Date()) {
      throw new BadRequestException('Link token has expired');
    }

    const existing = await this.usersRepo.findOne({ where: { telegramId } });
    if (existing && existing.id !== user.id) {
      throw new ConflictException(
        'This Telegram account is already linked to another user',
      );
    }

    await this.usersRepo.update(user.id, {
      telegramId,
      telegramUsername,
      telegramChatId,
      linkToken: null,
      linkTokenExpiresAt: null,
    });

    return this.usersRepo.findOne({ where: { id: user.id } }) as Promise<User>;
  }

  async unlinkTelegramAccount(userId: string): Promise<{ message: string }> {
    await this.usersRepo.update(userId, {
      telegramId: null,
      telegramUsername: null,
      telegramChatId: null,
    });
    return { message: 'Telegram account unlinked' };
  }

  private async findUserByEmail(email: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
