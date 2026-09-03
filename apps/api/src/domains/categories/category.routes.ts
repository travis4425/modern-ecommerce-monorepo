import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { listCategories } from './category.controller';
import { listCategoriesQuerySchema } from './category.validator';

const router = Router();

router.get(
  '/categories',
  validate({ query: listCategoriesQuerySchema }),
  asyncHandler(listCategories),
);

export default router;
