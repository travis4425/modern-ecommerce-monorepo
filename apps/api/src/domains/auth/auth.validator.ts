import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ecom/shared';

/**
 * Schema của Auth nằm ở packages/shared để frontend dùng đúng bộ quy tắc.
 * File này chỉ tái xuất, giữ cho routes có một chỗ import nhất quán với các
 * domain khác.
 */
export { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
