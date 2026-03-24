import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Optional sub-window for usage; values are clamped to the budget period (intersection).
 */
export class GetBudgetUsageQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Start of range (inclusive); clamped to budget periodStart if earlier',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T23:59:59.999Z',
    description: 'End of range (inclusive); clamped to budget periodEnd if later',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
