import { z } from 'zod';

/**
 * Boolean đến từ multipart LUÔN là chuỗi — 'true' hoặc 'false' — vì multipart
 * không có kiểu dữ liệu, mọi trường đều là văn bản.
 *
 * TUYỆT ĐỐI không dùng z.coerce.boolean() ở đây. Nó áp quy tắc truthy của
 * JavaScript, mà chuỗi 'false' là một chuỗi khác rỗng nên thành TRUE. Kết quả:
 * gửi isPrimary=false lại đặt ảnh làm đại diện, và không có gì trong log gợi ý
 * chuyện đó. Đây là lỗi đã gặp ở Phase 2, không lặp lại.
 */
const flexibleBoolean = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true' || value === '1'));

const altSchema = z.string().trim().max(255);

export const productImageParamSchema = z.object({ id: z.string().uuid() });

export const productImageIdParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

/** Thân request khi TẢI LÊN (multipart): mọi giá trị là chuỗi. */
export const uploadImageBodySchema = z.object({
  alt: altSchema.optional(),
  isPrimary: flexibleBoolean.optional(),
});

/** Thân request khi SỬA (JSON): cho phép xoá alt bằng null. */
export const updateImageBodySchema = z
  .object({
    alt: altSchema.nullable().optional(),
    isPrimary: flexibleBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'EMPTY_UPDATE' });

export const reorderImagesBodySchema = z.object({
  /**
   * Phải là hoán vị đầy đủ của tập ảnh hiện có. Chỉ kiểm hình dạng ở đây; việc
   * đối chiếu với dữ liệu thật thuộc về tầng service (product-image.rules).
   */
  order: z.array(z.string().uuid()).min(1).max(50),
});
