import pino from 'pino';
import { env, isProduction, isTest } from '../config/env';
import { getRequestContext } from './request-context';

/**
 * Logger dùng chung.
 *
 * Hai điều đáng lưu ý:
 *
 * 1. `mixin` tự chèn requestId (và userId từ Phase 3) vào MỌI dòng log, kể cả
 *    log viết từ sâu trong tầng service. Nhờ vậy có thể lọc toàn bộ dấu vết của
 *    một request bằng đúng một mã, không phải xâu chuỗi bằng dấu thời gian.
 *
 * 2. `redact` xoá các trường nhạy cảm trước khi ghi. Đây là lưới an toàn cuối
 *    cùng — không bao giờ được coi nó là lý do để yên tâm log cả object request.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  enabled: !isTest,

  mixin() {
    const context = getRequestContext();
    if (!context) return {};
    return context.userId
      ? { requestId: context.requestId, userId: context.userId }
      : { requestId: context.requestId };
  },

  redact: {
    paths: [
      'password',
      'passwordHash',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'DATABASE_URL',
    ],
    censor: '[đã che]',
  },

  // Ở production ghi JSON một dòng để máy đọc. Ở dev in ra dạng người đọc được.
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '{if requestId}[{requestId}] {end}{msg}',
          },
        },
      }),
});

/** Logger con gắn nhãn một khu vực, ví dụ `createLogger('order')`. */
export function createLogger(scope: string) {
  return logger.child({ scope });
}
