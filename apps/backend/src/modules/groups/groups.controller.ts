import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, JoinGroupDto } from './dto/group.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a group (teacher)' })
  create(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List groups (teacher: own | student: joined)' })
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.id, user.role);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update group' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete group' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.id);
  }

  @Post('join')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Join group via invite code (student)' })
  join(@CurrentUser() user: User, @Body() dto: JoinGroupDto) {
    return this.service.join(user.id, dto);
  }

  @Delete(':id/leave')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Leave group (student)' })
  leave(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.leave(user.id, id);
  }

  @Get(':id/members')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get group members (teacher)' })
  getMembers(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getMembers(id, user.id);
  }

  @Delete(':id/members/:studentId')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remove member from group (teacher)' })
  removeMember(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.removeMember(id, user.id, studentId);
  }

  @Post(':id/regenerate-invite')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Regenerate invite code' })
  regenerateInvite(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.regenerateInviteCode(id, user.id);
  }
}
