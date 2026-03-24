import { apiFetch } from '@/lib/api-client';
import type {
  GetTransactionsQueryParams,
  PaginatedTransactions,
} from '@/lib/types/api';

/** README: 10 items per page on the transactions list. */
export const TRANSACTIONS_PAGE_LIMIT = 10;

export function fetchTransactions(
  params: GetTransactionsQueryParams,
): Promise<PaginatedTransactions> {
  const sp = new URLSearchParams();
  const merged: GetTransactionsQueryParams = {
    limit: TRANSACTIONS_PAGE_LIMIT,
    ...params,
  };

  if (merged.page != null) {
    sp.set('page', String(merged.page));
  }
  if (merged.limit != null) {
    sp.set('limit', String(merged.limit));
  }
  if (merged.sortBy != null) {
    sp.set('sortBy', merged.sortBy);
  }
  if (merged.sortOrder != null) {
    sp.set('sortOrder', merged.sortOrder);
  }
  if (merged.type != null) {
    sp.set('type', merged.type);
  }
  if (merged.categoryId != null && merged.categoryId !== '') {
    sp.set('categoryId', merged.categoryId);
  }
  if (merged.from != null && merged.from !== '') {
    sp.set('from', merged.from);
  }
  if (merged.to != null && merged.to !== '') {
    sp.set('to', merged.to);
  }

  const qs = sp.toString();
  return apiFetch<PaginatedTransactions>(
    `/transactions${qs ? `?${qs}` : ''}`,
  );
}
