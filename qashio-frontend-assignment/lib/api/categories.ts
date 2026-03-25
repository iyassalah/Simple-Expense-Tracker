import { apiFetch } from '@/lib/api-client';
import type { Category } from '@/lib/types/api';

export function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}

export interface CreateCategoryPayload {
  name: string;
}

export function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  return apiFetch<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
