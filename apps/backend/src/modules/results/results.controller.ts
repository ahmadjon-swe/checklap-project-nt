import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get all results for the current user' })
  getMyResults(@CurrentUser() user: User) {
    return this.service.getStudentResults(user.id, user.id, user.role);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary:
      'Get result for a session (student: own, teacher: any in their tests)',
  })
  getResult(@Param('sessionId') sessionId: string, @CurrentUser() user: User) {
    return this.service.getResult(sessionId, user.id, user.role);
  }
}
