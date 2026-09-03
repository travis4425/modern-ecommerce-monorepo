import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Bọc handler bất đồng bộ để promise bị reject đi tới error middleware.
 *
 * Express 4 không tự bắt promise bị reject: một `await` ném lỗi trong handler
 * sẽ khiến request treo cho tới khi timeout, và không có dòng log nào. Mọi
 * handler async đều phải đi qua đây.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
