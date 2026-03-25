import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CategoryKind } from '../entities/category.entity';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: CategoryKind,
    example: CategoryKind.EXPENSE,
    description: 'Income categories are for income transactions; expense categories are budgetable.',
  })
  @IsEnum(CategoryKind)
  kind: CategoryKind;
}
