import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

export const SELF_ASSIGNABLE_ROLES = [
  UserRole.STUDENT,
  UserRole.TEACHER,
] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    enum: SELF_ASSIGNABLE_ROLES,
    default: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(SELF_ASSIGNABLE_ROLES)
  role?: SelfAssignableRole;
}
