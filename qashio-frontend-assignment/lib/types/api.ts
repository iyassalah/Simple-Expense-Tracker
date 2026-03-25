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

export interface Budget {
  id: string;
  categoryId: string;
  capAmount: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetUsageResponse {
  id: string;
  categoryId: string;
  capAmount: number;
  periodStart: string;
  periodEnd: string;
  effectiveFrom: string;
  effectiveTo: string;
  spent: number;
  remaining: number;
  percentUsed: number | null;
}

export interface GetBudgetsQueryParams {
  categoryId?: string;
}

export interface CreateBudgetPayload {
  categoryId: string;
  capAmount: number;
  periodStart: string; // ISO string
  periodEnd: string; // ISO string
}

export interface UpdateBudgetPayload {
  categoryId?: string;
  capAmount?: number;
  periodStart?: string;
  periodEnd?: string;
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
