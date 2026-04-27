export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query['page']) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query['limit']) || DEFAULT_LIMIT));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
