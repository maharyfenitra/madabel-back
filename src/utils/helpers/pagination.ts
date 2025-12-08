/**
 * Pagination helpers
 */

export interface PaginationParams {
  page?: string;
  limit?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  total?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(params: PaginationParams): Omit<PaginationResult, 'total'> {
  let page = params.page ? parseInt(String(params.page), 10) : DEFAULT_PAGE;
  let limit = params.limit ? parseInt(String(params.limit), 10) : DEFAULT_LIMIT;

  // Validate and sanitize
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Create paginated response structure
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  dataKey: string = 'data'
) {
  return {
    [dataKey]: data,
    meta: createPaginationMeta(total, page, limit),
  };
}
