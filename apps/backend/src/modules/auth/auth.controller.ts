import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

class RefreshDto {
  @ApiProperty()
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP code' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(
      dto.refreshToken,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Public()
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    // Passport redirects to Google automatically
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(
      req.user,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    // Hand the tokens off via short-lived httpOnly cookies instead of URL
    // query params, which leak into browser history, server logs and Referer
    // headers. The frontend immediately exchanges them at POST /auth/oauth/session.
    const cookieOptions = {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      maxAge: 60_000, // 60s — only needs to survive the redirect handoff
    };
    res.cookie('oauth_access', result.accessToken, cookieOptions);
    res.cookie('oauth_refresh', result.refreshToken, cookieOptions);
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Public()
  @Post('oauth/session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the OAuth handoff cookies for tokens' })
  oauthSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = req.cookies?.oauth_access;
    const refreshToken = req.cookies?.oauth_refresh;
    if (!accessToken || !refreshToken) {
      throw new UnauthorizedException('No pending OAuth session');
    }
    // Single use — clear the handoff cookies once consumed.
    res.clearCookie('oauth_access');
    res.clearCookie('oauth_refresh');
    return { accessToken, refreshToken };
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA OTP and get tokens' })
  verify2FA(@Body() dto: { email: string; code: string }, @Req() req: Request) {
    return this.authService.verify2FA(
      dto.email,
      dto.code,
      (req as any).ip || '',
      (req as any).headers['user-agent'] || '',
    );
  }

  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email change (sends OTP to new email)' })
  changeEmail(@Req() req: any, @Body() dto: { newEmail: string }) {
    return this.authService.changeEmail(req.user.id, dto.newEmail);
  }

  @Post('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email change with OTP' })
  confirmEmailChange(@Req() req: any, @Body() dto: { code: string }) {
    return this.authService.confirmEmailChange(req.user.id, dto.code);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete account' })
  deleteAccount(@Req() req: any, @Body() dto: { password: string }) {
    return this.authService.deleteAccount(req.user.id, dto.password);
  }

  @Post('2fa/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable or disable 2FA' })
  toggle2FA(@Req() req: any, @Body() dto: { enable: boolean }) {
    return this.authService.toggle2FA(req.user.id, dto.enable);
  }

  @Post('telegram-link-token')
  @ApiOperation({ summary: 'Generate a token to link Telegram account' })
  generateTelegramLinkToken(@Req() req: any) {
    return this.authService.generateTelegramLinkToken(req.user.id);
  }

  @Post('telegram-unlink')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink Telegram account' })
  unlinkTelegram(@Req() req: any) {
    return this.authService.unlinkTelegramAccount(req.user.id);
  }
}
