import { apiFetch } from '@/lib/api-client';
import type { Category } from '@/lib/types/api';

export function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}
