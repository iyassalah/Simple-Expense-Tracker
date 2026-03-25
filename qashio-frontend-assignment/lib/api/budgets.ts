import { apiFetch } from '@/lib/api-client';
import type {
  Budget,
  BudgetUsageResponse,
  CreateBudgetPayload,
  GetBudgetsQueryParams,
  UpdateBudgetPayload,
} from '@/lib/types/api';

export function fetchBudgets(
  params: GetBudgetsQueryParams,
): Promise<Budget[]> {
  const qs = new URLSearchParams();
  if (params.categoryId) {
    qs.set('categoryId', params.categoryId);
  }
  const q = qs.toString();
  return apiFetch<Budget[]>(`/budgets${q ? `?${q}` : ''}`);
}

export function fetchBudget(id: string): Promise<Budget> {
  return apiFetch<Budget>(`/budgets/${encodeURIComponent(id)}`);
}

export function fetchBudgetUsage(
  id: string,
  params: { from?: string; to?: string },
): Promise<BudgetUsageResponse> {
  const sp = new URLSearchParams();
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);

  const qs = sp.toString();
  return apiFetch<BudgetUsageResponse>(
    `/budgets/${encodeURIComponent(id)}/usage${qs ? `?${qs}` : ''}`,
  );
}

export function createBudget(payload: CreateBudgetPayload): Promise<Budget> {
  return apiFetch<Budget>('/budgets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBudget(
  id: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  return apiFetch<Budget>(`/budgets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBudget(id: string): Promise<void> {
  return apiFetch<void>(`/budgets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

