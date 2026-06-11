import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';
import { PaginationDto } from '../../common/helpers/pagination.helper';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    return this.service.findMe(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update profile' })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.service.updateMe(user.id, dto);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPPORT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all users (admin/moderator/support)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPPORT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get user by id (admin/moderator/support)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Activate/deactivate user (admin/moderator)' })
  updateStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.updateStatus(id, body.isActive);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  updateRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.service.updateRole(id, body.role);
  }
}
