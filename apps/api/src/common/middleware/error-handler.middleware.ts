import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES, type ApiErrorResponse } from '@ecom/shared';
import { AppError, mapPrismaError } from '../errors';
import { logger } from '../logger';
import { isProduction } from '../../config/env';

/**
 * Điểm thoát duy nhất của mọi lỗi. Phải được đăng ký SAU cùng trong chuỗi
 * middleware, và phải giữ đủ bốn tham số — Express nhận diện error handler
 * bằng số lượng tham số, bớt một cái là nó lặng lẽ biến thành middleware
 * thường và mọi lỗi rơi vào hư không.
 */
export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = normalize(error);

  const logPayload = {
    code: appError.code,
    status: appError.statusCode,
    method: req.method,
    url: req.originalUrl,
    stack: appError.stack,
  };

  // Lỗi ngoài dự liệu là bug của chúng ta — log kèm stack ở mức error.
  // Lỗi trong dự liệu (nhập sai, không tìm thấy) chỉ cần một dòng debug.
  if (appError.isOperational) {
    logger.debug(logPayload, appError.message);
  } else {
    logger.error(logPayload, appError.message);
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      // Ở production, lỗi 5xx không được lộ nội dung: thông báo của tầng dưới
      // có thể chứa tên bảng, tên cột, thậm chí chuỗi kết nối.
      message: isProduction && !appError.isOperational ? 'Internal server error' : appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  res.status(appError.statusCode).json(body);
}

/** Quy mọi thứ bị ném ra về một AppError. */
function normalize(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const fromPrisma = mapPrismaError(error);
  if (fromPrisma) return fromPrisma;

  // Body JSON hỏng: express.json ném SyntaxError có gắn thuộc tính `body`.
  if (error instanceof SyntaxError && 'body' in error) {
    return new AppError(ERROR_CODES.MALFORMED_JSON, 'Request body is not valid JSON', 400);
  }

  // Body vượt quá giới hạn của express.json.
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const kind = (error as { type?: unknown }).type;
    if (kind === 'entity.too.large') {
      return new AppError(ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request body is too large', 413);
    }
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  const unexpected = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, message, 500, false);
  if (error instanceof Error && error.stack) unexpected.stack = error.stack;
  return unexpected;
}
