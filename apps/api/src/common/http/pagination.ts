import { PAGINATION, type PaginationMeta } from '@ecom/shared';

export interface PaginationInput {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ResolvedPagination {
  page: number;
  limit: number;
  /** Số bản ghi bỏ qua, truyền thẳng vào Prisma. */
  skip: number;
  take: number;
}

/** Ép tham số phân trang về khoảng an toàn để không ai kéo cả bảng bằng `?limit=999999`. */
export function resolvePagination(input: PaginationInput): ResolvedPagination {
  const page = Math.max(1, Math.trunc(input.page ?? PAGINATION.DEFAULT_PAGE));
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Math.trunc(input.limit ?? PAGINATION.DEFAULT_LIMIT)),
  );

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Dịch tham số `sort` của API thành `orderBy` của Prisma.
 *
 * Cú pháp: `created_at` tăng dần, `-created_at` giảm dần.
 *
 * `allowedFields` là danh sách trắng bắt buộc, ánh xạ tên cột công khai sang
 * tên field trong Prisma. Không có nó, người dùng có thể sắp xếp theo cột bất
 * kỳ — kể cả cột không có index, biến mọi request thành một lần quét bảng.
 */
export function parseSort<TField extends string>(
  sort: string | undefined,
  allowedFields: Record<string, TField>,
  fallback: Record<TField, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  if (!sort) return fallback;

  const descending = sort.startsWith('-');
  const publicName = descending ? sort.slice(1) : sort;
  const field = allowedFields[publicName];

  if (!field) return fallback;

  return { [field]: descending ? 'desc' : 'asc' };
}
