import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('transactions')
export class Transaction {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 1250.5678 })
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    transformer: {
      to: (value?: number) => value,
      from: (value: string) => Number(value),
    },
  })
  amount: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transaction_type',
  })
  type: TransactionType;

  @ApiProperty({ example: '2026-03-24T12:00:00.000Z' })
  @Column({ type: 'timestamptz' })
  date: Date;

  @ApiProperty({ format: 'uuid', example: 'f4ac4a34-227f-4763-9f63-8df0f7adf531' })
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

