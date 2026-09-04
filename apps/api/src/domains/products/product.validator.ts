import { z } from 'zod';
import { PAGINATION, PRODUCT_SORTS } from '@ecom/shared';

/**
 * Giá được nhận dưới dạng CHUỖI và giữ nguyên chuỗi cho tới tận database.
 *
 * Ép sang number ở đây là tự tay tạo ra sai số dấu phẩy động cho đúng thứ mà
 * toàn bộ hệ thống đang cố giữ chính xác. Chỉ kiểm định dạng, không chuyển kiểu.
 */
const priceString = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'PRICE_INVALID')
  .optional();

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
    q: z.string().trim().min(1).max(120).optional(),
    category: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, 'SLUG_INVALID')
      .max(140)
      .optional(),
    minPrice: priceString,
    maxPrice: priceString,
    brand: z.string().trim().min(1).max(80).optional(),
    inStock: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    sort: z.enum(PRODUCT_SORTS).default('relevance'),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      Number(value.minPrice) <= Number(value.maxPrice),
    { message: 'PRICE_RANGE_INVALID', path: ['minPrice'] },
  );

export const productSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'SLUG_INVALID')
    .max(220),
});
