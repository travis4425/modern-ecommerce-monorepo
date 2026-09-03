import { prisma } from '../../config/prisma';
import { BaseRepository, type PrismaDelegateLike } from '../../common/repositories/base.repository';
import type { AdminUserRow } from './user.types';

/**
 * Danh sách cột được lấy về. `passwordHash` KHÔNG có mặt ở đây, nên kể cả khi
 * ai đó lỡ trả thẳng dòng dữ liệu này ra API thì cũng không rò rỉ được.
 */
const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  isActive: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { name: true } },
} as const;

class UserRepository extends BaseRepository<AdminUserRow> {
  constructor() {
    super(prisma.user as unknown as PrismaDelegateLike<AdminUserRow>, { softDelete: true });
  }

  get select() {
    return ADMIN_USER_SELECT;
  }
}

export const userRepository = new UserRepository();
