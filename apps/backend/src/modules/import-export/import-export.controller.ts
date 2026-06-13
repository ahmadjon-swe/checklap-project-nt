import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ImportExportService } from './import-export.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Import / Export')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@UseGuards(RolesGuard)
@Controller()
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Post('import/questions')
  @ApiOperation({ summary: 'Import questions from Excel or CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  importQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Query('testId') testId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.importQuestions(testId, user.id, file);
  }

  @Get('export/tests/:testId/questions')
  @ApiOperation({ summary: 'Export questions as xlsx/csv/json' })
  @ApiQuery({ name: 'format', enum: ['xlsx', 'csv', 'json'], required: false })
  async exportQuestions(
    @Param('testId') testId: string,
    @Query('format') format: 'xlsx' | 'csv' | 'json' = 'xlsx',
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.service.exportQuestions(testId, user.id, format);
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.data);
  }

  @Get('export/tests/:testId/results')
  @ApiOperation({ summary: 'Export test results as xlsx/csv/json' })
  @ApiQuery({ name: 'format', enum: ['xlsx', 'csv', 'json'], required: false })
  @ApiQuery({ name: 'groupId', required: false })
  async exportResults(
    @Param('testId') testId: string,
    @Query('format') format: 'xlsx' | 'csv' | 'json' = 'xlsx',
    @Query('groupId') groupId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.service.exportResults(
      testId,
      user.id,
      format,
      groupId,
    );
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.data);
  }
}
