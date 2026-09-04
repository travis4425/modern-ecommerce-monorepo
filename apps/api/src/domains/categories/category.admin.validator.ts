import { z } from 'zod';

const nameSchema = z.string().trim().min(2).max(120);

export const createCategorySchema = z.object({
  name: nameSchema,
  /** Null hoặc bỏ trống nghĩa là danh mục gốc. */
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Sửa danh mục: mọi field đều tuỳ chọn, nhưng phải gửi ít nhất một field.
 * Không có ràng buộc đó thì một PATCH rỗng vẫn ghi nhật ký thao tác dù chẳng
 * thay đổi gì.
 */
export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'EMPTY_UPDATE' });

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});
