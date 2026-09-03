/** Người dùng kèm vai trò và quyền, đúng những cột cần cho việc xác thực. */
export interface UserWithPermissions {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  role: {
    name: string;
    permissions: Array<{ permission: { code: string } }>;
  };
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}
