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
 *
 * Môi trường TEST cũng không được ghi đè, và lý do rất cụ thể: tests/helpers/
 * setup-env.ts đặt NODE_ENV=test, LOG_LEVEL=fatal, BCRYPT_ROUNDS=10 trước khi
 * mọi thứ khác chạy. Nếu bật override, file .env (có NODE_ENV=development) sẽ
 * ghi đè ngược lại toàn bộ — và bộ test âm thầm chạy ở chế độ development:
 * logger bật hết cỡ, bcrypt chậm gấp bốn, và tệ nhất là rate limiter KHÔNG
 * được tắt nên test tự chạm hạn mức đăng nhập rồi hỏng ngẫu nhiên.
 *
 * Nói ngắn gọn: chỉ DEV mới cần .env thắng, vì chỉ dev mới có biến rác của máy.
 */
const nodeEnvBeforeDotenv = process.env.NODE_ENV;
const shouldOverride = nodeEnvBeforeDotenv !== 'production' && nodeEnvBeforeDotenv !== 'test';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  override: shouldOverride,
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

  /**
   * Khoá ký access token. Tối thiểu 32 ký tự — khoá ngắn khiến JWT có thể bị
   * dò offline. Sinh bằng: openssl rand -base64 48
   */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET phải dài ít nhất 32 ký tự'),
  /** Cú pháp của thư viện jsonwebtoken: '15m', '1h', '7d'. */
  JWT_ACCESS_TTL: z.string().default('15m'),
  /** Refresh token là chuỗi mờ lưu trong database, nên tính hạn bằng ngày. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  /**
   * Chi phí bcrypt. Mỗi đơn vị tăng gấp đôi thời gian băm. 12 là mức cân bằng
   * hiện nay: đủ chậm để chống dò, đủ nhanh để đăng nhập không thấy trễ.
   */
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  /**
   * Token đặt lại mật khẩu sống rất ngắn: nó đi qua email, mà hộp thư có thể bị
   * đọc trộm hoặc để mở trên máy chung. 15 phút đủ để người dùng thật bấm vào.
   */
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(15),

  // ── Gửi email ──────────────────────────────────────────────────────────
  /** Bỏ trống ở dev: email sẽ được in ra terminal thay vì gửi đi thật. */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('E-Commerce <no-reply@example.com>'),
  /** Gốc URL của frontend, dùng để dựng link trong email. */
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),

  // ── Tải ảnh sản phẩm ───────────────────────────────────────────────────
  /**
   * Trần kích thước MỘT tệp. Đặt ở đây chứ không nhét số cứng vào multer:
   * cùng con số này còn phải xuất hiện trong thông báo lỗi và trong tài liệu
   * API, ba nơi lệch nhau là chuyện chắc chắn xảy ra nếu chép tay.
   */
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(20).default(5),
  /** Trần số ảnh mỗi sản phẩm — chặn một tài khoản staff làm đầy ổ đĩa. */
  UPLOAD_MAX_IMAGES_PER_PRODUCT: z.coerce.number().int().min(1).max(20).default(8),
  /**
   * Thư mục lưu ảnh khi chạy chế độ đĩa. Đường dẫn tương đối tính từ thư mục
   * làm việc của tiến trình; đường dẫn tuyệt đối cũng chấp nhận (bộ test trỏ
   * vào thư mục tạm để không rải tệp vào cây mã nguồn).
   */
  UPLOAD_DIR: z.string().default('uploads'),
  /**
   * Gốc URL công khai của CHÍNH API này. Ảnh lưu trên đĩa được phục vụ bởi
   * API, nên URL trả về cho frontend phải là tuyệt đối — frontend chạy ở
   * cổng khác (5173) nên đường dẫn tương đối sẽ trỏ nhầm về chính nó.
   */
  API_PUBLIC_URL: z.string().url().default('http://localhost:8080'),

  /**
   * Bỏ trống cả ba biến Cloudinary thì hệ thống tự chuyển sang lưu đĩa. Nhờ
   * vậy dự án chạy được ngay sau khi clone, không bắt ai đăng ký dịch vụ.
   */
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('ecommerce/products'),
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
 * Chọn nơi lưu ảnh MỘT LẦN lúc khởi động, không quyết định lại ở mỗi request.
 * Đủ ba khoá Cloudinary thì dùng Cloudinary, thiếu bất kỳ khoá nào thì lưu đĩa
 * — nửa vời (có cloud_name nhưng thiếu secret) là cấu hình sai, và im lặng
 * chạy tiếp với một nửa cấu hình là cách hỏng khó hiểu nhất.
 */
export const imageStorageDriver: 'cloudinary' | 'disk' =
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ? 'cloudinary'
    : 'disk';

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
