export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
// KBO 전체 등록 선수(~300명)를 /players에서 한 번에 내려줄 수 있어야 해서
// 다른 목록형 엔드포인트보다 여유 있게 잡는다.
export const MAX_LIMIT = 500;

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
