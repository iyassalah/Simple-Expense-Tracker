import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CategoryKind } from '../categories/entities/category.entity';
import {
  Transaction,
  TransactionType,
} from '../transactions/entities/transaction.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { BudgetUsageResponseDto } from './dto/budget-usage-response.dto';
import { GetBudgetUsageQueryDto } from './dto/get-budget-usage-query.dto';
import { GetBudgetsQueryDto } from './dto/get-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Budget } from './entities/budget.entity';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateBudgetDto, userId: string): Promise<Budget> {
    this.assertValidPeriod(dto.periodStart, dto.periodEnd);
    await this.ensureExpenseCategory(dto.categoryId, userId);
    await this.ensureNoOverlappingBudget(
      userId,
      dto.categoryId,
      dto.periodStart,
      dto.periodEnd,
    );

    const budget = this.budgetsRepository.create({
      userId,
      categoryId: dto.categoryId,
      capAmount: dto.capAmount,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    return this.budgetsRepository.save(budget);
  }

  async findAll(
    userId: string,
    query: GetBudgetsQueryDto,
  ): Promise<Budget[]> {
    const qb = this.budgetsRepository
      .createQueryBuilder('budget')
      .andWhere('budget.user_id = :userId', { userId });

    if (query.categoryId) {
      qb.andWhere('budget.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    return qb
      .orderBy('budget.period_start', 'DESC')
      .addOrderBy('budget.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { id, userId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget ${id} was not found`);
    }

    return budget;
  }

  async update(
    id: string,
    dto: UpdateBudgetDto,
    userId: string,
  ): Promise<Budget> {
    const budget = await this.findOne(id, userId);

    if (dto.categoryId !== undefined) {
      await this.ensureExpenseCategory(dto.categoryId, userId);
      budget.categoryId = dto.categoryId;
    }
    if (dto.capAmount !== undefined) {
      budget.capAmount = dto.capAmount;
    }

    const nextStart = dto.periodStart ?? budget.periodStart;
    const nextEnd = dto.periodEnd ?? budget.periodEnd;
    this.assertValidPeriod(nextStart, nextEnd);
    budget.periodStart = nextStart;
    budget.periodEnd = nextEnd;

    await this.ensureNoOverlappingBudget(
      userId,
      budget.categoryId,
      budget.periodStart,
      budget.periodEnd,
      budget.id,
    );

    return this.budgetsRepository.save(budget);
  }

  async remove(id: string, userId: string): Promise<void> {
    const budget = await this.findOne(id, userId);
    await this.budgetsRepository.remove(budget);
  }

  /**
   * Spent = sum of expenses for the budget category in the effective date range
   * (intersection of budget period with optional query from/to).
   */
  async getUsage(
    id: string,
    query: GetBudgetUsageQueryDto,
    userId: string,
  ): Promise<BudgetUsageResponseDto> {
    const budget = await this.findOne(id, userId);

    const requestFrom = query.from ? new Date(query.from) : budget.periodStart;
    const requestTo = query.to ? new Date(query.to) : budget.periodEnd;

    const effectiveFrom = this.maxDate(budget.periodStart, requestFrom);
    const effectiveTo = this.minDate(budget.periodEnd, requestTo);

    let spent = 0;
    if (effectiveFrom <= effectiveTo) {
      const row = await this.transactionsRepository
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .where('t.user_id = :userId', { userId: budget.userId })
        .andWhere('t.category_id = :categoryId', {
          categoryId: budget.categoryId,
        })
        .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
        .andWhere('t.date >= :from', { from: effectiveFrom })
        .andWhere('t.date <= :to', { to: effectiveTo })
        .getRawOne<{ sum: string }>();

      spent = Number(row?.sum ?? 0);
    }

    const remaining = budget.capAmount - spent;
    const percentUsed =
      budget.capAmount > 0 ? (spent / budget.capAmount) * 100 : null;

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      capAmount: budget.capAmount,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      effectiveFrom,
      effectiveTo,
      spent,
      remaining,
      percentUsed,
    };
  }

  /**
   * After an expense is persisted, log a warning for any budget on the same category
   * whose period contains the transaction date and whose cap is reached or exceeded.
   */
  async warnIfBudgetsExceededAfterExpense(
    userId: string,
    categoryId: string,
    transactionDate: Date,
    type: TransactionType,
  ): Promise<void> {
    if (type !== TransactionType.EXPENSE) {
      return;
    }

    const budgets = await this.findAll(userId, { categoryId });
    const t = transactionDate.getTime();

    for (const budget of budgets) {
      if (
        t < budget.periodStart.getTime() ||
        t > budget.periodEnd.getTime()
      ) {
        continue;
      }

      const usage = await this.getUsage(budget.id, {}, userId);
      const overCap =
        usage.capAmount > 0
          ? usage.spent >= usage.capAmount
          : usage.spent > 0;

      if (overCap) {
        this.logger.warn(
          `Budget ${budget.id} (category ${usage.categoryId}): spent ${usage.spent} meets or exceeds cap ${usage.capAmount} (${usage.percentUsed != null ? usage.percentUsed.toFixed(1) : 'n/a'}% used)`,
        );
      }
    }
  }

  private assertValidPeriod(start: Date, end: Date): void {
    if (end < start) {
      throw new BadRequestException(
        'periodEnd must be greater than or equal to periodStart',
      );
    }
  }

  private maxDate(a: Date, b: Date): Date {
    return a.getTime() >= b.getTime() ? a : b;
  }

  private minDate(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
  }

  private async ensureExpenseCategory(
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId, userId },
      select: { id: true, name: true, kind: true },
    });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }
    if (category.kind !== CategoryKind.EXPENSE) {
      throw new BadRequestException(
        `Budgets can only be created for expense categories. "${category.name}" is ${category.kind}.`,
      );
    }
  }

  /**
   * Budgets are not allowed to overlap for the same category, even at a single instant.
   * Overlap check (inclusive bounds): existingStart <= requestedEnd AND existingEnd >= requestedStart.
   */
  private async ensureNoOverlappingBudget(
    userId: string,
    categoryId: string,
    periodStart: Date,
    periodEnd: Date,
    excludeBudgetId?: string,
  ): Promise<void> {
    const qb = this.budgetsRepository
      .createQueryBuilder('b')
      .where('b.user_id = :userId', { userId })
      .andWhere('b.category_id = :categoryId', { categoryId })
      .andWhere('b.period_start <= :periodEnd', { periodEnd })
      .andWhere('b.period_end >= :periodStart', { periodStart });

    if (excludeBudgetId) {
      qb.andWhere('b.id <> :excludeBudgetId', { excludeBudgetId });
    }

    const conflicting = await qb.getOne();
    if (!conflicting) return;

    throw new ConflictException(
      `Budget conflicts with an existing budget for this category (${conflicting.periodStart.toISOString()} - ${conflicting.periodEnd.toISOString()}).`,
    );
  }
}
