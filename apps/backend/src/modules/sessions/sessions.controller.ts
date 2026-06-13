import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import {
  StartSessionDto,
  StartGuestSessionDto,
  SaveAnswerDto,
  HeartbeatDto,
} from './dto/session.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Public()
  @Get('public/:code')
  @ApiOperation({ summary: 'Get public test info for a guest share code' })
  getPublicMeta(@Param('code') code: string) {
    return this.service.getPublicTestMeta(code);
  }

  @Public()
  @Post('public/:code/start')
  @ApiOperation({ summary: 'Start a test as a guest using a share code' })
  startGuest(
    @Param('code') code: string,
    @Body() dto: StartGuestSessionDto,
    @Req() req: Request,
  ) {
    return this.service.startGuestSession(
      code,
      dto.name,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
  }

  @Post()
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Start a test session' })
  start(
    @CurrentUser() user: User,
    @Body() dto: StartSessionDto,
    @Req() req: Request,
  ) {
    return this.service.startSession(
      user.id,
      dto,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get session with shuffled questions' })
  getSession(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getSession(id, user.id);
  }

  @Put(':id/answers')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Save answer for a question' })
  saveAnswer(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.service.saveAnswer(id, user.id, dto);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Submit test session' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.submitSession(id, user.id);
  }

  @Post(':id/heartbeat')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Anti-cheat heartbeat (tab visibility, fullscreen)',
  })
  heartbeat(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: HeartbeatDto,
  ) {
    return this.service.heartbeat(id, user.id, dto);
  }

  @Get(':id/time')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get server-authoritative remaining time' })
  getRemainingTime(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getRemainingTime(id, user.id);
  }
}
