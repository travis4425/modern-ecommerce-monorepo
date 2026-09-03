import type { Response } from 'express';
import type { ApiErrorResponse, ApiSuccessResponse, PaginationMeta } from '@ecom/shared';

/**
 * Nơi duy nhất được phép gọi `res.json`.
 *
 * Mọi response đi qua đây nên envelope `{ success, data, meta, error }` luôn
 * đồng nhất, không phụ thuộc vào việc lập trình viên có nhớ đúng hình dạng hay
 * không.
 */
export function sendSuccess<TData>(res: Response, data: TData, statusCode = 200): void {
  const body: ApiSuccessResponse<TData> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendPaginated<TItem>(
  res: Response,
  data: TItem[],
  meta: PaginationMeta,
  statusCode = 200,
): void {
  const body: ApiSuccessResponse<TItem[]> = { success: true, data, meta };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, body: ApiErrorResponse, statusCode: number): void {
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
