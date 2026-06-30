import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum RegisterableRole {
  CUSTOMER = 'CUSTOMER',
  ORGANIZER = 'ORGANIZER',
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72) // bcrypt truncates beyond 72 bytes; reject longer up front
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @ApiProperty({
    enum: RegisterableRole,
    default: RegisterableRole.CUSTOMER,
    description:
      'Self-registration is limited to CUSTOMER or ORGANIZER. ADMIN accounts are provisioned separately.',
  })
  @IsOptional()
  @IsEnum(RegisterableRole)
  role?: RegisterableRole = RegisterableRole.CUSTOMER;
}
