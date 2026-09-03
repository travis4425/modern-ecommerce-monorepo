import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';
import { hasAllPermissions, hasAnyPermission } from '../security/permissions';

/**
 * Chặn theo QUYỀN, không chặn theo tên vai trò.
 *
 * `requirePermission('order:update_status')` mô tả đúng điều cần kiểm tra và
 * không phải sửa lại khi thêm vai trò mới. Nếu viết `requireRole('STAFF')` thì
 * mai kia thêm vai trò SHIPPER sẽ phải đi sửa từng route một.
 *
 * Luôn đặt SAU `authenticate`.
 */
export function requirePermission(...required: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(ERROR_CODES.AUTH_TOKEN_MISSING, 'Route requires authentication', 401));
      return;
    }

    if (!hasAllPermissions(req.auth.permissions, required)) {
      next(
        new AppError(
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
          `Requires permission: ${required.join(', ')}`,
          403,
        ),
      );
      return;
    }

    next();
  };
}

/** Đủ MỘT trong các quyền là qua. */
export function requireAnyPermission(...required: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(ERROR_CODES.AUTH_TOKEN_MISSING, 'Route requires authentication', 401));
      return;
    }

    if (!hasAnyPermission(req.auth.permissions, required)) {
      next(
        new AppError(
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
          `Requires any of: ${required.join(', ')}`,
          403,
        ),
      );
      return;
    }

    next();
  };
}
