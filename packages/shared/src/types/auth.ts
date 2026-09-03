/** Người dùng như frontend nhìn thấy. Không bao giờ chứa password_hash. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  permissions: string[];
  emailVerified: boolean;
}

/**
 * Kết quả đăng nhập / đăng ký / làm mới token.
 *
 * Chỉ có access token trong body. Refresh token đi bằng cookie HTTPOnly nên
 * JavaScript không đọc được — đó là lý do XSS không lấy được nó.
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  /** Số giây còn hiệu lực của access token, để frontend chủ động làm mới trước hạn. */
  expiresIn: number;
}
