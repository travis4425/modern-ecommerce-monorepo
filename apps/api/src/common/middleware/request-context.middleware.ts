import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';
import { runWithRequestContext } from '../request-context';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Mở ngữ cảnh cho mỗi request và ghi lại một dòng khi nó kết thúc.
 *
 * Nếu client (hoặc reverse proxy phía trước) đã gửi kèm x-request-id thì dùng
 * lại, để một mã duy nhất xuyên suốt nhiều dịch vụ. Nếu chưa có thì sinh mới.
 * Mã luôn được trả lại trong response header — người dùng báo lỗi kèm mã này là
 * ta tìm ra ngay dấu vết trong log.
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

  res.setHeader(REQUEST_ID_HEADER, requestId);

  const startedAt = process.hrtime.bigint();

  runWithRequestContext({ requestId }, () => {
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const payload = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      };

      // 5xx là chuyện của chúng ta, 4xx là chuyện của người gọi — mức log khác nhau.
      if (res.statusCode >= 500) logger.error(payload, 'request thất bại');
      else if (res.statusCode >= 400) logger.warn(payload, 'request bị từ chối');
      else logger.info(payload, 'request hoàn tất');
    });

    next();
  });
}
