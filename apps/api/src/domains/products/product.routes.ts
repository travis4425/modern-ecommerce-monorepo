import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requirePermission } from '../../common/middleware/authorize.middleware';
import * as controller from './product.controller';
import * as admin from './product.admin.controller';
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
} from './product.admin.validator';
import { listProductsQuerySchema, productSlugParamSchema } from './product.validator';

const router = Router();

// '/products/brands' phải đứng TRƯỚC '/products/:slug', nếu không Express sẽ
// coi 'brands' là một slug và không bao giờ tới được route này.
router.get('/products/brands', asyncHandler(controller.brands));

router.get(
  '/products',
  validate({ query: listProductsQuerySchema }),
  asyncHandler(controller.list),
);

router.get(
  '/products/:slug',
  validate({ params: productSlugParamSchema }),
  asyncHandler(controller.detail),
);

// ── Quản trị ──────────────────────────────────────────────
router.post(
  '/admin/products',
  authenticate,
  requirePermission('product:create'),
  validate({ body: createProductSchema }),
  asyncHandler(admin.create),
);

router.patch(
  '/admin/products/:id',
  authenticate,
  requirePermission('product:update'),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  asyncHandler(admin.update),
);

router.delete(
  '/admin/products/:id',
  authenticate,
  requirePermission('product:delete'),
  validate({ params: productIdParamSchema }),
  asyncHandler(admin.remove),
);

export default router;
