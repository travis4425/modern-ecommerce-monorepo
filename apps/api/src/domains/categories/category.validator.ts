import { z } from 'zod';

/**
 * Query string luôn là chuỗi, nên dùng một union tường minh thay vì
 * `z.coerce.boolean()` — hàm đó coi MỌI chuỗi khác rỗng là true, kể cả 'false'.
 */
export const listCategoriesQuerySchema = z.object({
  includeEmpty: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
