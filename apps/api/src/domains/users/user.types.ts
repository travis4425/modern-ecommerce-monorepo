/** Một dòng người dùng trong danh sách quản trị. KHÔNG bao giờ chứa passwordHash. */
export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: { name: string };
}

export interface ListUsersQuery {
  page: number;
  limit: number;
  /** Tìm theo email hoặc họ tên. */
  q?: string;
  sort?: string;
  role?: string;
  isActive?: boolean;
}
