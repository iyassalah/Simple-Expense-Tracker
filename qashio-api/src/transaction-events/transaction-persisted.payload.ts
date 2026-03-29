import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';

// Payload emitted when a transaction is persisted.
export interface TransactionPersistedPayload {
  transactionId: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert a Transaction entity to a TransactionPersistedPayload.
export function transactionPayloadFromEntity(
  entity: Transaction,
): TransactionPersistedPayload {
  return {
    transactionId: entity.id,
    userId: entity.userId,
    categoryId: entity.categoryId,
    amount: entity.amount,
    type: entity.type,
    date: entity.date,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
