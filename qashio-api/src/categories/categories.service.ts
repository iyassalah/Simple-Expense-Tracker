import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto, userId: string): Promise<Category> {
    const category = this.categoriesRepository.create({
      userId,
      name: dto.name.trim(),
      kind: dto.kind,
    });
    try {
      return await this.categoriesRepository.save(category);
    } catch (e) {
      if (e instanceof QueryFailedError) {
        const driver = e.driverError as { code?: string } | undefined;
        if (driver?.code === '23505') {
          throw new ConflictException('A category with this name already exists');
        }
      }
      throw e;
    }
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }
}
