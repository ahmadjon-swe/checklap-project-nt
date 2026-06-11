import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { PaginationDto } from '../../common/helpers/pagination.helper';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Platform-wide statistics' })
  getStats() {
    return this.service.getPlatformStats();
  }

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List all users' })
  getUsers(@Query() pagination: PaginationDto) {
    return this.service.getAllUsers(pagination);
  }

  @Get('subscriptions')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List all subscriptions' })
  getSubscriptions(@Query() pagination: PaginationDto) {
    return this.service.getAllSubscriptions(pagination);
  }

  @Get('payments/pending')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List pending manual payments' })
  getPending(@Query() pagination: PaginationDto) {
    return this.service.getPendingPayments(pagination);
  }

  @Patch('payments/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve manual payment' })
  approvePayment(@Param('id') id: string) {
    return this.service.approvePayment(id);
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role or active status' })
  updateUser(
    @Param('id') id: string,
    @Body() body: { role?: UserRole; isActive?: boolean },
  ) {
    return this.service.updateUser(id, body);
  }
}
