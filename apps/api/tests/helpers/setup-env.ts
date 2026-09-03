/**
 * Biến môi trường cho test, nạp TRƯỚC mọi import khác.
 *
 * NODE_ENV=test tắt logger và tắt rate limiter — nếu không, một bộ test chạy
 * nhanh sẽ tự chạm hạn mức và hỏng vì lý do chẳng liên quan gì tới thứ đang kiểm.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'fatal';
process.env.JWT_ACCESS_SECRET ??= 'khoa-test-co-dinh-du-32-ky-tu-cho-jwt-hmac';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.BCRYPT_ROUNDS ??= '10'; // giảm để test chạy nhanh; production vẫn 12
process.env.DATABASE_URL ??=
  'postgresql://ecom:ecom_dev_password@localhost:5432/ecommerce?schema=public';
process.env.SMTP_HOST = ''; // không gửi email thật trong test
