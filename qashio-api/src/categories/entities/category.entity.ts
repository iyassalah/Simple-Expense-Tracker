import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CategoryKind {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('categories')
export class Category {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ maxLength: 255, example: 'Groceries' })
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @ApiProperty({ enum: CategoryKind, example: CategoryKind.EXPENSE })
  @Column({
    type: 'enum',
    enum: CategoryKind,
    enumName: 'category_kind',
    default: CategoryKind.EXPENSE,
  })
  kind: CategoryKind;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
