import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requirePermission } from '../../common/middleware/authorize.middleware';
import { listCategories } from './category.controller';
import { listCategoriesQuerySchema } from './category.validator';
import * as admin from './category.admin.controller';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from './category.admin.validator';

const router = Router();

// ── Công khai ─────────────────────────────────────────────
router.get(
  '/categories',
  validate({ query: listCategoriesQuerySchema }),
  asyncHandler(listCategories),
);

// ── Quản trị ──────────────────────────────────────────────
// authenticate luôn đứng trước requirePermission: đảo lại thì requirePermission
// đọc req.auth khi nó chưa tồn tại và mọi request đều bị 401, kể cả của admin.
router.get(
  '/admin/categories',
  authenticate,
  requirePermission('category:read'),
  asyncHandler(admin.list),
);

router.post(
  '/admin/categories',
  authenticate,
  requirePermission('category:create'),
  validate({ body: createCategorySchema }),
  asyncHandler(admin.create),
);

router.patch(
  '/admin/categories/:id',
  authenticate,
  requirePermission('category:update'),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  asyncHandler(admin.update),
);

router.delete(
  '/admin/categories/:id',
  authenticate,
  requirePermission('category:delete'),
  validate({ params: categoryIdParamSchema }),
  asyncHandler(admin.remove),
);

export default router;
