/**
 * Types aligned with the Nest API (JSON bodies use ISO date strings).
 */

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export type TransactionSortBy = 'date' | 'amount' | 'type' | 'createdAt';
export type SortOrder = 'ASC' | 'DESC';

/** Query params for `GET /transactions` (matches `GetTransactionsQueryDto`). */
export interface GetTransactionsQueryParams {
  page?: number;
  limit?: number;
  sortBy?: TransactionSortBy;
  sortOrder?: SortOrder;
  type?: TransactionType;
  categoryId?: string;
  from?: string;
  to?: string;
}
