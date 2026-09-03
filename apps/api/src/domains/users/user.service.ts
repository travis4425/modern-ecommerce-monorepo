import type { PaginationMeta } from '@ecom/shared';
import { parseSort } from '../../common/http/pagination';
import { userRepository } from './user.repository';
import type { AdminUserRow, ListUsersQuery } from './user.types';

/**
 * Danh sách cột được phép sắp xếp.
 *
 * Đây là danh sách TRẮNG, không phải gợi ý. Cho phép sắp xếp theo cột tuỳ ý
 * nghĩa là cho phép sắp xếp theo cột không có index — mỗi request khi đó là
 * một lần quét toàn bảng.
 */
const SORTABLE = {
  created_at: 'createdAt',
  email: 'email',
  last_login_at: 'lastLoginAt',
} as const;

export async function listUsers(
  query: ListUsersQuery,
): Promise<{ items: AdminUserRow[]; meta: PaginationMeta }> {
  const where: Record<string, unknown> = {};

  if (query.q) {
    where.OR = [
      { email: { contains: query.q, mode: 'insensitive' } },
      { fullName: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.role) where.role = { name: query.role };
  if (query.isActive !== undefined) where.isActive = query.isActive;

  return userRepository.paginate({
    page: query.page,
    limit: query.limit,
    where,
    orderBy: parseSort(query.sort, SORTABLE, ['createdAt', 'desc']),
    select: userRepository.select,
  });
}
