import { z } from 'zod';
import { PAGINATION } from '@ecom/shared';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.string().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'USER']).optional(),
  // Query string luôn là chuỗi: z.coerce.boolean() coi 'false' là true.
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});
