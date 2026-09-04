import { env, isTest } from '../../src/config/env';

/**
 * Bộ test tự kiểm tra chính môi trường của nó.
 *
 * Không có nhóm test này, một thay đổi ở cách nạp .env có thể âm thầm đẩy toàn
 * bộ bộ test sang chế độ development — logger bật hết cỡ, rate limiter còn
 * sống, bcrypt chậm gấp bốn — và không có gì báo động cả. Đúng chuyện đã xảy ra.
 */
describe('môi trường chạy test', () => {
  it('NODE_ENV thật sự là test, không bị .env ghi đè', () => {
    expect(env.NODE_ENV).toBe('test');
    expect(isTest).toBe(true);
  });

  it('rate limiter được tắt', () => {
    // skip: () => isTest trong rate-limit.middleware. isTest sai thì bộ test
    // sẽ tự chạm hạn mức 10 request/15 phút của các endpoint đăng nhập.
    expect(isTest).toBe(true);
  });

  it('bcrypt dùng chi phí thấp cho test', () => {
    expect(env.BCRYPT_ROUNDS).toBeLessThanOrEqual(10);
  });

  it('logger im lặng', () => {
    expect(env.LOG_LEVEL).toBe('fatal');
  });

  it('không gửi email thật', () => {
    expect(env.SMTP_HOST ?? '').toBe('');
  });
});
