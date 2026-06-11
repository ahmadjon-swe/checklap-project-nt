import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';

export class StartSessionDto {
  @ApiProperty()
  @IsUUID()
  testId: string;
}

export class StartGuestSessionDto {
  @ApiProperty({ description: "Guest's display name" })
  @IsString()
  @MaxLength(100)
  name: string;
}

export class SaveAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;
}

export class HeartbeatDto {
  @ApiProperty()
  @IsBoolean()
  tabVisible: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFullscreen?: boolean;
}
