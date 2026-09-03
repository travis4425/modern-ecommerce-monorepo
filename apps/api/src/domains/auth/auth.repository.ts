import { prisma } from '../../config/prisma';
import type { StoredRefreshToken } from './refresh-rotation';
import type { UserWithPermissions } from './auth.types';

/**
 * Repository của Auth không kế thừa BaseRepository.
 *
 * BaseRepository phục vụ những thao tác CRUD lặp lại. Auth thì hầu như chỉ gồm
 * các truy vấn đặc thù — tra người dùng kèm quyền, xoay token trong một
 * transaction — nên bọc chúng qua lớp cơ sở chỉ thêm một tầng gián tiếp mà
 * không giấu đi được gì.
 */
const USER_WITH_PERMISSIONS_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  emailVerifiedAt: true,
  role: {
    select: {
      name: true,
      permissions: { select: { permission: { select: { code: true } } } },
    },
  },
} as const;

export const authRepository = {
  /**
   * Tra người dùng theo email.
   *
   * Email đã được Zod chuẩn hoá về chữ thường trước khi tới đây, và database có
   * unique index trên `lower(email)`, nên so sánh trực tiếp là đủ và dùng được index.
   */
  async findByEmail(email: string): Promise<UserWithPermissions | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: USER_WITH_PERMISSIONS_SELECT,
    }) as Promise<UserWithPermissions | null>;
  },

  async findById(id: string): Promise<UserWithPermissions | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_WITH_PERMISSIONS_SELECT,
    }) as Promise<UserWithPermissions | null>;
  },

  async emailExists(email: string): Promise<boolean> {
    return (await prisma.user.count({ where: { email } })) > 0;
  },

  async createCustomer(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
  }): Promise<UserWithPermissions> {
    const role = await prisma.role.findFirst({ where: { name: 'USER' }, select: { id: true } });
    if (!role) {
      throw new Error('Thiếu vai trò USER trong database — chạy `pnpm db:seed` trước');
    }

    return prisma.user.create({
      data: { ...data, roleId: role.id },
      select: USER_WITH_PERMISSIONS_SELECT,
    }) as Promise<UserWithPermissions>;
  },

  async touchLastLogin(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },

  // ── Refresh token ─────────────────────────────────────────────────────

  async findRefreshTokenByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
        replacedById: true,
      },
    }) as Promise<StoredRefreshToken | null>;
  },

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ id: string }> {
    return prisma.refreshToken.create({ data, select: { id: true } });
  },

  /**
   * Xoay token trong MỘT transaction: thu hồi token cũ và tạo token mới phải
   * cùng thành công hoặc cùng thất bại. Nếu tách rời, một lỗi ở giữa sẽ để lại
   * người dùng không còn token nào và bị đá ra ngoài dù không làm gì sai.
   */
  async rotateRefreshToken(params: {
    oldTokenId: string;
    userId: string;
    familyId: string;
    newTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: params.userId,
          tokenHash: params.newTokenHash,
          familyId: params.familyId,
          expiresAt: params.expiresAt,
          userAgent: params.userAgent,
          ipAddress: params.ipAddress,
        },
        select: { id: true },
      });

      await tx.refreshToken.update({
        where: { id: params.oldTokenId },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
    });
  },

  /** Thu hồi cả family — phản ứng khi phát hiện token bị dùng lại. */
  async revokeFamily(familyId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  // ── Token đặt lại mật khẩu ────────────────────────────────────────────

  /**
   * Vô hiệu hoá mọi token đặt lại chưa dùng rồi tạo token mới, trong một
   * transaction. Nếu không dọn token cũ, người dùng bấm "quên mật khẩu" ba lần
   * sẽ có ba liên kết cùng hoạt động — mỗi cái là một cơ hội cho kẻ tấn công.
   */
  async issuePasswordResetToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: params.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: params.userId,
          tokenHash: params.tokenHash,
          expiresAt: params.expiresAt,
        },
      });
    });
  },

  async findPasswordResetToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    }) as Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null>;
  },

  /**
   * Đổi mật khẩu, đánh dấu token đã dùng, và thu hồi MỌI phiên đăng nhập —
   * tất cả trong một transaction.
   *
   * Thu hồi hết phiên là bắt buộc: kịch bản đặt lại mật khẩu thường bắt nguồn
   * từ việc tài khoản đã bị chiếm. Đổi mật khẩu mà để phiên cũ sống tiếp thì kẻ
   * chiếm quyền vẫn ở nguyên trong tài khoản.
   */
  async completePasswordReset(params: {
    tokenId: string;
    userId: string;
    passwordHash: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: params.tokenId },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: params.userId },
        data: { passwordHash: params.passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: params.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  },

  /** Thu hồi mọi phiên còn sống của một người dùng. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  async revokeByHash(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
