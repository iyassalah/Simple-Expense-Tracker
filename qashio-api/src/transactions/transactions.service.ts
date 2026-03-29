import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CategoryKind } from '../categories/entities/category.entity';
import {
  TRANSACTION_CREATED,
  TRANSACTION_UPDATED,
} from '../transaction-events/transaction-events.constants';
import { transactionPayloadFromEntity } from '../transaction-events/transaction-persisted.payload';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    await this.ensureCategoryIsValidForTransaction(
      dto.categoryId,
      dto.type,
      userId,
    );

    const transaction = this.transactionsRepository.create({
      userId,
      amount: dto.amount,
      type: dto.type,
      categoryId: dto.categoryId,
      date: dto.date,
    });

    const saved = await this.transactionsRepository.save(transaction);
    this.eventEmitter.emit(
      TRANSACTION_CREATED,
      transactionPayloadFromEntity(saved),
    );
    return saved;
  }

  async findAll(
    query: GetTransactionsQueryDto,
    userId: string,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.transactionsRepository.createQueryBuilder('transaction');

    qb.andWhere('transaction.user_id = :userId', { userId });

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

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} was not found`);
    }

    return transaction;
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);

    const nextCategoryId = dto.categoryId ?? transaction.categoryId;
    const nextType = dto.type ?? transaction.type;
    if (dto.categoryId !== undefined || dto.type !== undefined) {
      await this.ensureCategoryIsValidForTransaction(
        nextCategoryId,
        nextType,
        userId,
      );
      transaction.categoryId = nextCategoryId;
      transaction.type = nextType;
    }
    if (dto.amount !== undefined) {
      transaction.amount = dto.amount;
    }
    if (dto.date !== undefined) {
      transaction.date = dto.date;
    }

    const saved = await this.transactionsRepository.save(transaction);
    this.eventEmitter.emit(
      TRANSACTION_UPDATED,
      transactionPayloadFromEntity(saved),
    );
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await this.transactionsRepository.remove(transaction);
  }

  private async ensureCategoryIsValidForTransaction(
    categoryId: string,
    type: Transaction['type'],
    userId: string,
  ): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId, userId },
      select: { id: true, name: true, kind: true },
    });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }

    const expectedKind =
      type === 'income' ? CategoryKind.INCOME : CategoryKind.EXPENSE;
    if (category.kind !== expectedKind) {
      throw new BadRequestException(
        `Category "${category.name}" is ${category.kind}-only and cannot be used for ${type} transactions`,
      );
    }
  }
}

