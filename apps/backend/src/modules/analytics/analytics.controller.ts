import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Teacher overview stats' })
  getOverview(@CurrentUser() user: User) {
    return this.service.getOverview(user.id);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard table: rows=tests, cols=groups, cells=avg score',
  })
  getDashboard(@CurrentUser() user: User) {
    return this.service.getDashboardTable(user.id);
  }

  @Get('tests/:testId')
  @ApiOperation({ summary: 'Per-test aggregate stats' })
  getTestAnalytics(@Param('testId') testId: string, @CurrentUser() user: User) {
    return this.service.getTestAnalytics(testId, user.id);
  }

  @Get('tests/:testId/items')
  @ApiOperation({ summary: 'Item difficulty analysis' })
  getItemAnalysis(@Param('testId') testId: string, @CurrentUser() user: User) {
    return this.service.getItemAnalysis(testId, user.id);
  }

  @Get('tests/:testId/export-csv')
  @ApiOperation({ summary: 'Export gradebook as CSV' })
  async exportCsv(
    @Param('testId') testId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportResultsCsv(testId, user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="results-${testId}.csv"`,
    );
    res.send(csv);
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Student progress over time' })
  getStudentProgress(
    @Param('studentId') studentId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.getStudentProgress(studentId, user.id);
  }
}
