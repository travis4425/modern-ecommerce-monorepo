import { z } from 'zod';

/**
 * Giá nhận dưới dạng CHUỖI và đi thẳng vào Prisma Decimal, không qua number.
 * Đây là cùng lý do với endpoint lọc: numeric(12,2) vượt độ chính xác an toàn
 * của số dấu phẩy động JavaScript.
 */
const priceSchema = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, 'PRICE_INVALID');

const attributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(255),
});

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  /**
   * SKU nhận cả chữ thường rồi chuẩn hoá về HOA.
   *
   * Zod chạy .regex() TRƯỚC .transform(), nên regex phải chấp nhận cả hai dạng
   * — nếu không, người nhập chữ thường bị từ chối trước khi kịp chuẩn hoá.
   *
   * Chuẩn hoá ở tầng ứng dụng, không dùng citext như với email: cột sku đang
   * được cột generated search_vector tham chiếu, và Postgres từ chối đổi kiểu
   * một cột như vậy. Đổi lại phải chấp nhận rằng ai ghi thẳng vào database vẫn
   * tạo được SKU trùng chỉ khác hoa thường — cả seed lẫn API đều đi qua đây nên
   * trong thực tế không xảy ra.
   */
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,64}$/, 'SKU_INVALID')
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(3).max(200),
  brand: z.string().trim().min(1).max(80).nullable().optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  price: priceSchema,
  compareAtPrice: priceSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  /** Tối đa 30 thông số, tên không được trùng nhau. */
  attributes: z
    .array(attributeSchema)
    .max(30)
    .optional()
    .refine((list) => list === undefined || new Set(list.map((a) => a.name)).size === list.length, {
      message: 'ATTRIBUTE_NAME_DUPLICATED',
    }),
  initialStock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ sku: true, initialStock: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'EMPTY_UPDATE' });

export const productIdParamSchema = z.object({ id: z.string().uuid() });
