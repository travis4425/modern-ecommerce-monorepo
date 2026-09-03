import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ERROR_CODES, type ApiErrorResponse } from '@ecom/shared';
import { isTest } from '../../config/env';
import { logger } from '../logger';

/**
 * Tạo một bộ giới hạn tần suất trả về đúng envelope lỗi của hệ thống.
 *
 * Bộ nhớ đếm nằm trong RAM của tiến trình. Điều đó đủ cho một tiến trình duy
 * nhất; khi lên nhiều instance ở Phase 11, cần đổi store sang Redis, nếu không
 * hạn mức thật sẽ bị nhân lên theo số instance.
 */
function createLimiter(options: Partial<Options> & { windowMs: number; limit: number }) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Tắt ở môi trường test, nếu không các bộ test chạy nhanh sẽ tự chặn mình.
    skip: () => isTest,

    handler: (req: Request, res: Response) => {
      logger.warn({ ip: req.ip, url: req.originalUrl }, 'chạm hạn mức tần suất');

      const body: ApiErrorResponse = {
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests, please try again later',
        },
      };
      res.status(429).json(body);
    },

    ...options,
  });
}

/** Hạn mức chung cho toàn bộ API. Rộng rãi, chỉ để chặn lạm dụng thô bạo. */
export const globalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});

/**
 * Hạn mức nghiêm ngặt cho các endpoint xác thực (Phase 3).
 *
 * Đây là tuyến phòng thủ chính trước tấn công dò mật khẩu. Đếm theo IP và giới
 * hạn rất thấp: người thật không đăng nhập sai 10 lần trong 15 phút.
 */
export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});
