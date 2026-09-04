import path from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Môi trường cho test. File này chạy TRƯỚC mọi import khác (setupFiles của Jest).
 *
 * Thứ tự ở đây là quan trọng và đã từng sai một lần:
 *
 *  1. Nạp .env của dự án với override — để một DATABASE_URL còn sót ở cấp máy
 *     (VS Code tiêm vào terminal, Supabase CLI đặt, dự án khác để lại) không
 *     kéo bộ test đi nối vào database của người khác. Đây đúng là lý do
 *     src/config/env.ts bật override ở dev.
 *
 *  2. Áp cấu hình riêng của test, ghi đè lên tất cả. Những giá trị này phải
 *     thắng vì src/config/env.ts KHÔNG bật override khi NODE_ENV=test — nếu nó
 *     bật, .env sẽ đẩy NODE_ENV về development và bộ test âm thầm chạy sai
 *     chế độ: logger bật hết cỡ, bcrypt chậm gấp bốn, rate limiter không tắt.
 */
loadEnv({ path: path.resolve(__dirname, '../../.env'), override: true });

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'fatal';
process.env.BCRYPT_ROUNDS = '10'; // giảm để test chạy nhanh; production vẫn 12
process.env.SMTP_HOST = ''; // không gửi email thật trong test

process.env.JWT_ACCESS_SECRET ??= 'khoa-test-co-dinh-du-32-ky-tu-cho-jwt-hmac';
process.env.JWT_ACCESS_TTL ??= '15m';

/**
 * Cho phép CI trỏ test vào database riêng mà không đụng tới .env.
 * Không đặt thì dùng đúng database trong .env của dự án.
 */
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

process.env.DATABASE_URL ??=
  'postgresql://ecom:ecom_dev_password@localhost:5432/ecommerce?schema=public';
