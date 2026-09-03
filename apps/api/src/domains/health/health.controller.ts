import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/http/api-response';
import { getHealthStatus } from './health.service';

/**
 * Tầng controller: chỉ đọc request, gọi đúng một service, gói response.
 * Không có nghiệp vụ, không truy vấn database.
 *
 * Trả 503 khi suy giảm để load balancer và orchestrator hiểu được, nhưng
 * envelope vẫn là `success: true` — bản thân request đã xử lý xong, thứ suy
 * giảm là hệ thống chứ không phải lời gọi này.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const data = await getHealthStatus();
  sendSuccess(res, data, data.status === 'ok' ? 200 : 503);
}
