import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Ở môi trường phát triển, file .env của dự án PHẢI thắng biến môi trường
 * có sẵn của máy. Mặc định dotenv làm ngược lại — nó không ghi đè biến đã tồn
 * tại trong process.env — nên một DATABASE_URL cài sẵn ở cấp hệ điều hành
 * (còn sót từ dự án khác, từ Supabase CLI, từ Docker Desktop...) sẽ âm thầm
 * chiếm chỗ và gây ra lỗi kết nối rất khó truy vết.
 *
 * Ở production thì ngược lại: biến do nền tảng (Render, Docker, CI) cấp mới là
 * nguồn sự thật, không được để file .env lọt vào image ghi đè lên.
 */
const isProductionEnv = process.env.NODE_ENV === 'production';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  override: !isProductionEnv,
});

/**
 * Toàn bộ biến môi trường đi qua đúng một cửa và được validate lúc khởi động.
 * Thiếu biến thì tiến trình chết ngay, không phải đợi tới request đầu tiên mới lòi lỗi.
 * Quy tắc: không được viết `process.env.X` ở bất kỳ file nào khác.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url('DATABASE_URL phải là chuỗi kết nối PostgreSQL hợp lệ'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\n[env] Cấu hình môi trường không hợp lệ:\n${issues}\n`);
  console.error('[env] Kiểm tra lại file apps/api/.env (tham chiếu apps/api/.env.example)\n');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * Mô tả đích kết nối database để in ra log, đã loại bỏ mật khẩu.
 * In dòng này lúc khởi động giúp phát hiện ngay việc kết nối nhầm máy chủ.
 */
export function describeDatabaseTarget(): string {
  try {
    const url = new URL(env.DATABASE_URL);
    const database = url.pathname.replace(/^\//, '') || '(không rõ)';
    const port = url.port || '5432';
    return `${url.username}@${url.hostname}:${port}/${database}`;
  } catch {
    return '(không phân tích được DATABASE_URL)';
  }
}
