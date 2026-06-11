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
import { TestsService } from './tests.service';
import { CreateTestDto, UpdateTestDto, AssignGroupsDto } from './dto/test.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
export class TestsController {
  constructor(private readonly service: TestsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateTestDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.id, user.role);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTestDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.id);
  }

  @Post(':id/publish')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.publish(id, user.id);
  }

  @Post(':id/groups')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Assign groups to test' })
  assignGroups(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AssignGroupsDto,
  ) {
    return this.service.assignGroups(id, user.id, dto);
  }

  @Delete(':id/groups/:groupId')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  removeGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.removeGroup(id, user.id, groupId);
  }

  @Get(':id/groups')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  getGroups(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getGroups(id, user.id);
  }
}
