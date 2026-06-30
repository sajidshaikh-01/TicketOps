import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Event ID to book seats for' })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'Seat codes to book, e.g. ["VA1", "VA2"]',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  seatCodes: string[];

  @ApiProperty({ description: 'Customer full name' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName: string;

  @ApiProperty({ description: 'Customer email for booking confirmation' })
  @IsEmail()
  customerEmail: string;
}
