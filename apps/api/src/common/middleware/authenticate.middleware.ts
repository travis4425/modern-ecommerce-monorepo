import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';
import { extractBearerToken, verifyAccessToken } from '../security/jwt';
import { setContextUser } from '../request-context';

/**
 * Bắt buộc phải đăng nhập. Gắn `req.auth` cho các tầng sau.
 *
 * Middleware này KHÔNG truy vấn database. Toàn bộ thông tin cần thiết nằm trong
 * access token đã ký, nên mỗi request được bảo vệ không tốn thêm một vòng đi
 * database nào.
 */
export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(
      new AppError(ERROR_CODES.AUTH_TOKEN_MISSING, 'Missing Authorization: Bearer <token>', 401),
    );
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    // Từ đây, mọi dòng log của request này tự mang theo userId.
    setContextUser(payload.sub, payload.email);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Xác thực nếu có token, bỏ qua nếu không.
 *
 * Dùng cho endpoint công khai nhưng đổi cách hiển thị khi đã đăng nhập — ví dụ
 * trang chi tiết sản phẩm cần biết người xem đã mua hàng chưa để cho phép đánh giá.
 */
export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    setContextUser(payload.sub, payload.email);
  } catch {
    // Token hỏng trên route công khai thì coi như khách vãng lai, không phải lỗi.
  }
  next();
};
