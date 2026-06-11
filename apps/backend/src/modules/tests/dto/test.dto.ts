import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ResultVisibility } from '../entities/test.entity';

export class CreateTestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ enum: ResultVisibility })
  @IsOptional()
  @IsEnum(ResultVisibility)
  resultVisibility?: ResultVisibility;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingThreshold?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enforceFullscreen?: boolean;
}

export class UpdateTestDto extends CreateTestDto {}

export class AssignGroupsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];

  @ApiPropertyOptional({
    description: 'When students in these groups can start the test',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'When access closes for these groups' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
