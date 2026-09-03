import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { authRateLimiter } from '../../common/middleware/rate-limit.middleware';
import * as controller from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validator';

const router = Router();

/**
 * Hạn mức nghiêm ngặt chỉ áp cho các endpoint nhận thông tin đăng nhập.
 * `/refresh` và `/me` được gọi thường xuyên trong lúc dùng bình thường nên
 * dùng hạn mức chung — siết chúng sẽ khiến người dùng thật bị chặn oan.
 */
router.post(
  '/auth/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(controller.register),
);

router.post(
  '/auth/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(controller.login),
);

/**
 * Quên và đặt lại mật khẩu cũng chịu hạn mức nghiêm ngặt: chúng gửi email thật
 * và thao tác trên thông tin đăng nhập, nên là mục tiêu ưa thích của cả spam
 * lẫn dò token.
 */
router.post(
  '/auth/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(controller.forgotPassword),
);

router.post(
  '/auth/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(controller.resetPassword),
);

router.post('/auth/refresh', asyncHandler(controller.refresh));
router.post('/auth/logout', asyncHandler(controller.logout));
router.post('/auth/logout-all', authenticate, asyncHandler(controller.logoutAll));
router.get('/auth/me', authenticate, asyncHandler(controller.me));

export default router;
