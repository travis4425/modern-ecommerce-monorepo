import type { HealthCheckData } from '@ecom/shared';
import { prisma } from '../../config/prisma';
import { env, isProduction } from '../../config/env';
import { APP_VERSION } from '../../config/app-info';

/**
 * Tầng service: chứa logic, không biết gì về req/res.
 *
 * Truy vấn đi qua Prisma (dùng chung pool với các truy vấn SQL thô) nên
 * endpoint này kiểm tra được cả chuỗi: pool → driver adapter → Prisma Client.
 */
export async function getHealthStatus(): Promise<HealthCheckData> {
  const startedAt = performance.now();
  let connected = false;
  let latencyMs: number | null = null;
  let error: string | null = null;
  let catalog: HealthCheckData['catalog'] = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    connected = true;
    latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;

    const [categories, products] = await Promise.all([
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
    ]);
    catalog = { categories, products };
  } catch (caught) {
    const message = (caught as Error).message;
    console.error('[health] Không kết nối được database:', message);
    // Chi tiết lỗi chỉ dành cho môi trường dev — xem chú thích ở HealthCheckData.
    error = isProduction ? null : message;
  }

  return {
    status: connected ? 'ok' : 'degraded',
    version: APP_VERSION,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: { connected, latencyMs, error },
    catalog,
  };
}
