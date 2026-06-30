import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SeatSectionDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2, description: 'Number of rows in this section' })
  @IsInt()
  @Min(1)
  rows: number;

  @ApiProperty({ example: 8, description: 'Number of seats per row' })
  @IsInt()
  @Min(1)
  seatsPerRow: number;

  @ApiProperty({
    example: 2.5,
    description: 'Price multiplier applied to the event base price',
  })
  @IsNumber()
  @Min(0.1)
  priceTier: number;
}

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Music' })
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  venue: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'ISO 8601 datetime' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'ISO 8601 datetime' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    type: [SeatSectionDto],
    description:
      'Seat sections to generate for this event. The full seat map is created at event creation time.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatSectionDto)
  sections: SeatSectionDto[];
}
