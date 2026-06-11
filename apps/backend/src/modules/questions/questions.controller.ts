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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('tests/:testId/questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  create(
    @Param('testId') testId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.service.create(testId, user.id, dto);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Bulk create questions' })
  bulkCreate(
    @Param('testId') testId: string,
    @CurrentUser() user: User,
    @Body() dtos: CreateQuestionDto[],
  ) {
    return this.service.bulkCreate(testId, user.id, dtos);
  }

  @Get()
  findAll(@Param('testId') testId: string) {
    return this.service.findAll(testId);
  }

  @Get(':id')
  findOne(
    @Param('testId') testId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.findOne(testId, id, user.id);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  update(
    @Param('testId') testId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.update(testId, id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @UseGuards(RolesGuard)
  remove(
    @Param('testId') testId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.remove(testId, id, user.id);
  }
}
