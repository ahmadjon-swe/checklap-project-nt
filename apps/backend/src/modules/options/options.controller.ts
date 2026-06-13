import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionsService } from './options.service';
import { CreateOptionDto, UpdateOptionDto } from './dto/option.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Options')
@ApiBearerAuth()
@Controller('questions/:questionId/options')
export class OptionsController {
  constructor(private readonly service: OptionsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  create(
    @Param('questionId') questionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateOptionDto,
  ) {
    return this.service.create(questionId, user.id, dto);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  update(
    @Param('questionId') questionId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.service.update(questionId, id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  remove(
    @Param('questionId') questionId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.remove(questionId, id, user.id);
  }
}
