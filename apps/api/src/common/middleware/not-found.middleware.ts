import type { Request, Response, NextFunction } from 'express';
import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';

/**
 * Bắt mọi route không khớp. Đặt sau toàn bộ route thật, trước error handler.
 * Ném lỗi thay vì tự trả response, để 404 đi qua đúng một đường xử lý lỗi
 * giống mọi lỗi khác.
 */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(ERROR_CODES.ROUTE_NOT_FOUND, `Cannot ${req.method} ${req.originalUrl}`, 404));
}
