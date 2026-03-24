import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('budgets')
export class Budget {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid', example: 'f4ac4a34-227f-4763-9f63-8df0f7adf531' })
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ApiProperty({ example: 500, description: 'Maximum spend for this category in the period' })
  @Column({
    name: 'cap_amount',
    type: 'numeric',
    precision: 14,
    scale: 4,
    transformer: {
      to: (value?: number) => value,
      from: (value: string) => Number(value),
    },
  })
  capAmount: number;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @ApiProperty({ example: '2026-03-31T23:59:59.999Z' })
  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
