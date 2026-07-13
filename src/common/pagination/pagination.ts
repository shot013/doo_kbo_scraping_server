export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export type SortOrder = 'ASC' | 'DESC';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizePagination(params: PaginationParams = {}): {
  page: number;
  limit: number;
  skip: number;
} {
  const page =
    params.page && params.page > 0 ? Math.floor(params.page) : DEFAULT_PAGE;
  const limit =
    params.limit && params.limit > 0
      ? Math.min(Math.floor(params.limit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function normalizeSortOrder(sortOrder?: string): SortOrder {
  return sortOrder === 'DESC' ? 'DESC' : 'ASC';
}
