import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import * as controller from './product.controller';
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

export default router;
