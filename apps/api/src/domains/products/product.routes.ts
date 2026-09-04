import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requirePermission } from '../../common/middleware/authorize.middleware';
import { uploadSingleImage } from '../../common/upload/upload.middleware';
import * as controller from './product.controller';
import * as admin from './product.admin.controller';
import * as images from './product-image.controller';
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
} from './product.admin.validator';
import {
  productImageIdParamSchema,
  productImageParamSchema,
  reorderImagesBodySchema,
  updateImageBodySchema,
  uploadImageBodySchema,
} from './product-image.validator';
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

// ── Ảnh sản phẩm ──────────────────────────────────────────
// Quyền cố ý dùng lại product:read / product:update thay vì thêm cặp quyền
// riêng cho ảnh: ai sửa được sản phẩm thì sửa được ảnh của nó, và mỗi quyền
// thừa là một dòng nữa trong bảng phân quyền mà không ai nhớ nổi ý nghĩa.
router.get(
  '/admin/products/:id/images',
  authenticate,
  requirePermission('product:read'),
  validate({ params: productImageParamSchema }),
  asyncHandler(images.list),
);

// uploadSingleImage PHẢI đứng trước validate: với request multipart, các trường
// văn bản chỉ có mặt trong req.body sau khi multer phân tích xong body. Đảo thứ
// tự thì validator luôn nhìn thấy một object rỗng.
router.post(
  '/admin/products/:id/images',
  authenticate,
  requirePermission('product:update'),
  uploadSingleImage,
  validate({ params: productImageParamSchema, body: uploadImageBodySchema }),
  asyncHandler(images.upload),
);

// Sắp xếp lại phải khai báo TRƯỚC '/:imageId', nếu không Express coi 'order' là
// một imageId và validator uuid đánh trượt nó bằng lỗi 400 khó hiểu.
router.put(
  '/admin/products/:id/images/order',
  authenticate,
  requirePermission('product:update'),
  validate({ params: productImageParamSchema, body: reorderImagesBodySchema }),
  asyncHandler(images.reorder),
);

router.put(
  '/admin/products/:id/images/:imageId',
  authenticate,
  requirePermission('product:update'),
  uploadSingleImage,
  validate({ params: productImageIdParamSchema, body: uploadImageBodySchema }),
  asyncHandler(images.replace),
);

router.patch(
  '/admin/products/:id/images/:imageId',
  authenticate,
  requirePermission('product:update'),
  validate({ params: productImageIdParamSchema, body: updateImageBodySchema }),
  asyncHandler(images.update),
);

router.delete(
  '/admin/products/:id/images/:imageId',
  authenticate,
  requirePermission('product:update'),
  validate({ params: productImageIdParamSchema }),
  asyncHandler(images.remove),
);

export default router;
