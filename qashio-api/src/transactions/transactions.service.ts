import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  GetTransactionsQueryDto,
  TransactionSortBy,
} from './dto/get-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    await this.ensureCategoryExists(dto.categoryId);

    const transaction = this.transactionsRepository.create({
      amount: dto.amount,
      type: dto.type,
      categoryId: dto.categoryId,
      date: dto.date,
    });

    return this.transactionsRepository.save(transaction);
  }

  async findAll(query: GetTransactionsQueryDto): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.transactionsRepository.createQueryBuilder('transaction');

    if (query.type) {
      qb.andWhere('transaction.type = :type', { type: query.type });
    }
    if (query.categoryId) {
      qb.andWhere('transaction.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.from) {
      qb.andWhere('transaction.date >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('transaction.date <= :to', { to: query.to });
    }

    const sortableColumns: Record<TransactionSortBy, string> = {
      [TransactionSortBy.DATE]: 'transaction.date',
      [TransactionSortBy.AMOUNT]: 'transaction.amount',
      [TransactionSortBy.TYPE]: 'transaction.type',
      [TransactionSortBy.CREATED_AT]: 'transaction.created_at',
    };

    const orderColumn =
      sortableColumns[query.sortBy ?? TransactionSortBy.DATE];
    const orderDirection = query.sortOrder ?? 'DESC';

    qb.orderBy(orderColumn, orderDirection).skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} was not found`);
    }

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.findOne(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
      transaction.categoryId = dto.categoryId;
    }
    if (dto.amount !== undefined) {
      transaction.amount = dto.amount;
    }
    if (dto.type !== undefined) {
      transaction.type = dto.type;
    }
    if (dto.date !== undefined) {
      transaction.date = dto.date;
    }

    return this.transactionsRepository.save(transaction);
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.findOne(id);
    await this.transactionsRepository.remove(transaction);
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const categoryExists = await this.categoriesRepository.exists({
      where: { id: categoryId },
    });
    if (!categoryExists) {
      throw new BadRequestException(
        `Category ${categoryId} does not exist`,
      );
    }
  }
}

