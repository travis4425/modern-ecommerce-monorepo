import type { Request, Response } from 'express';
import type { ApiSuccessResponse, HealthCheckData } from '@ecom/shared';
import { getHealthStatus } from './health.service';

/**
 * Tầng controller: chỉ đọc request, gọi đúng một service, gói response.
 * Không có nghiệp vụ, không truy vấn database.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const data = await getHealthStatus();
  const body: ApiSuccessResponse<HealthCheckData> = { success: true, data };

  res.status(data.status === 'ok' ? 200 : 503).json(body);
}
