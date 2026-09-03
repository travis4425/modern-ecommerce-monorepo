import { z } from 'zod';

/**
 * Schema dùng CHUNG cho frontend và backend.
 *
 * Nhờ vậy quy tắc mật khẩu chỉ tồn tại một chỗ. Nếu mỗi bên tự khai báo, sớm
 * muộn cũng lệch nhau và người dùng gặp cảnh form báo hợp lệ nhưng server từ chối.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .email()
  // Chuẩn hoá về chữ thường ngay tại schema. Postgres phân biệt hoa thường, nên
  // không chuẩn hoá thì 'A@x.com' và 'a@x.com' thành hai tài khoản khác nhau.
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'PASSWORD_TOO_SHORT')
  .max(72, 'PASSWORD_TOO_LONG') // bcrypt cắt cụt sau 72 byte, chặn từ đây cho rõ ràng
  .regex(/[a-z]/, 'PASSWORD_NEEDS_LOWERCASE')
  .regex(/[A-Z]/, 'PASSWORD_NEEDS_UPPERCASE')
  .regex(/[0-9]/, 'PASSWORD_NEEDS_DIGIT');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, 'PHONE_INVALID')
    .optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Đăng nhập KHÔNG áp quy tắc độ mạnh: tài khoản cũ có thể có mật khẩu đặt
  // theo quy tắc trước đây, và báo lỗi độ mạnh ở đây là tiết lộ quy tắc cho
  // kẻ dò mật khẩu.
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
