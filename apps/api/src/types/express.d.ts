import type { AccessTokenPayload } from '../common/security/jwt';

/**
 * Mở rộng Request của Express để mang thông tin người đã xác thực.
 *
 * Khai báo là optional: middleware authenticate mới gán vào, nên handler nào
 * không nằm sau middleware đó thì TypeScript bắt buộc phải kiểm tra trước khi
 * dùng — chính điều đó ngăn việc lỡ tay đọc `req.auth.sub` trên route công khai.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export {};
