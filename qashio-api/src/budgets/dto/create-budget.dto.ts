import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ format: 'uuid', example: 'f4ac4a34-227f-4763-9f63-8df0f7adf531' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    example: 500,
    minimum: 0,
    maximum: 9999999999.9999,
    description: 'Spend cap for the category within the period (same precision as transaction amounts)',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(9999999999.9999)
  capAmount: number;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  periodStart: Date;

  @ApiProperty({ example: '2026-03-31T23:59:59.999Z' })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  periodEnd: Date;
}
