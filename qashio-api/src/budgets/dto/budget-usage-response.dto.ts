import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BudgetUsageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  categoryId: string;

  @ApiProperty()
  capAmount: number;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty({
    description: 'Inclusive lower bound used for the spend query after clamping to the budget period',
  })
  effectiveFrom: Date;

  @ApiProperty({
    description: 'Inclusive upper bound used for the spend query after clamping to the budget period',
  })
  effectiveTo: Date;

  @ApiProperty({ description: 'Sum of expense transactions in the effective range' })
  spent: number;

  @ApiProperty({ description: 'capAmount minus spent (negative if over budget)' })
  remaining: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Percent of cap used; null when capAmount is 0',
  })
  percentUsed: number | null;
}
