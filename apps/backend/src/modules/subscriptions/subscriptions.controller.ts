import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxTestsPerDay?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxQuestionsPerTest?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxGroups?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canExport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canImport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canUseAnalytics?: boolean;
}

class ManualRequestDto {
  @ApiProperty()
  @IsUUID()
  planId: string;
}

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  getPlans() {
    return this.service.getPlans();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my active subscription' })
  getMySubscription(@CurrentUser() user: User) {
    return this.service.getMySubscription(user.id);
  }

  @Post('manual-request')
  @ApiOperation({ summary: 'Request manual payment for a plan' })
  manualRequest(@CurrentUser() user: User, @Body() dto: ManualRequestDto) {
    return this.service.createManualRequest(user.id, dto.planId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  cancel(@CurrentUser() user: User) {
    return this.service.cancelSubscription(user.id);
  }

  @Patch('plans/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update subscription plan price/name (admin only)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.service.updatePlan(id, dto);
  }
}
