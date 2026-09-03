import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requirePermission } from '../../common/middleware/authorize.middleware';
import { list } from './user.controller';
import { listUsersQuerySchema } from './user.validator';

const router = Router();

/**
 * Thứ tự middleware là bắt buộc: authenticate trước, requirePermission sau.
 * Đảo lại thì requirePermission đọc req.auth khi nó chưa tồn tại và mọi request
 * đều bị trả 401, kể cả của admin.
 */
router.get(
  '/admin/users',
  authenticate,
  requirePermission('user:read'),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(list),
);

export default router;
