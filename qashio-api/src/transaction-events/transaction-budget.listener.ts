import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BudgetsService } from '../budgets/budgets.service';
import {
  TRANSACTION_CREATED,
  TRANSACTION_UPDATED,
} from './transaction-events.constants';
import { TransactionPersistedPayload } from './transaction-persisted.payload';

@Injectable()
export class TransactionBudgetListener {
  private readonly logger = new Logger(TransactionBudgetListener.name);

  constructor(private readonly budgetsService: BudgetsService) {}

  @OnEvent(TRANSACTION_CREATED, { async: true })
  async handleCreated(payload: TransactionPersistedPayload): Promise<void> {
    try {
      await this.budgetsService.warnIfBudgetsExceededAfterExpense(
        payload.categoryId,
        payload.date,
        payload.type,
      );
    } catch (err) {
      this.logger.error(
        `Budget check failed after transaction.created id=${payload.transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  @OnEvent(TRANSACTION_UPDATED, { async: true })
  async handleUpdated(payload: TransactionPersistedPayload): Promise<void> {
    try {
      await this.budgetsService.warnIfBudgetsExceededAfterExpense(
        payload.categoryId,
        payload.date,
        payload.type,
      );
    } catch (err) {
      this.logger.error(
        `Budget check failed after transaction.updated id=${payload.transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
