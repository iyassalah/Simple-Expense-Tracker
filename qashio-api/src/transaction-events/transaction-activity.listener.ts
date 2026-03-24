import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TRANSACTION_CREATED,
  TRANSACTION_UPDATED,
} from './transaction-events.constants';
import { TransactionPersistedPayload } from './transaction-persisted.payload';

@Injectable()
export class TransactionActivityListener {
  private readonly logger = new Logger(TransactionActivityListener.name);

  @OnEvent(TRANSACTION_CREATED)
  handleCreated(payload: TransactionPersistedPayload): void {
    try {
      this.logger.log(
        `Transaction created id=${payload.transactionId} type=${payload.type} categoryId=${payload.categoryId} amount=${payload.amount} date=${payload.date.toISOString()}`,
      );
    } catch (err) {
      this.logger.error(
        `Activity log failed after transaction.created id=${payload.transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  @OnEvent(TRANSACTION_UPDATED)
  handleUpdated(payload: TransactionPersistedPayload): void {
    try {
      this.logger.log(
        `Transaction updated id=${payload.transactionId} type=${payload.type} categoryId=${payload.categoryId} amount=${payload.amount} date=${payload.date.toISOString()}`,
      );
    } catch (err) {
      this.logger.error(
        `Activity log failed after transaction.updated id=${payload.transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
