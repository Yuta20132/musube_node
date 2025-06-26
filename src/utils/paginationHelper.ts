import { PaginationParams, PaginationMeta } from '../types/pagination';

/**
 * Validates pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Validated pagination parameters
 * @throws Error if parameters are invalid
 */
export function validatePaginationParams(page: number, limit: number): PaginationParams {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('ページ番号は1以上の整数である必要があります');
  }
  
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('件数は1以上100以下の整数である必要があります');
  }
  
  return { page, limit };
}

/**
 * Calculates pagination metadata
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 */
export function calculatePagination(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages
  };
}

/**
 * Calculates database offset from page and limit
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Database offset (0-based)
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}