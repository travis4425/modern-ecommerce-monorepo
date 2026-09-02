import type { HealthCheckData } from '@ecom/shared';
import { pool } from '../../config/database';
import { env, isProduction } from '../../config/env';
import { APP_VERSION } from '../../config/app-info';

/** Diễn giải mã lỗi khô khan của driver pg thành câu người đọc hiểu được. */
function explainDatabaseError(error: NodeJS.ErrnoException): string {
  switch (error.code) {
    case 'ECONNREFUSED':
      return 'ECONNREFUSED — không có gì lắng nghe ở host/port trong DATABASE_URL. Container Postgres chưa chạy?';
    case 'ETIMEDOUT':
      return 'ETIMEDOUT — kết nối bị treo, thường do firewall hoặc sai host.';
    case 'ENOTFOUND':
      return 'ENOTFOUND — không phân giải được hostname trong DATABASE_URL.';
    case '28P01':
      return '28P01 — sai user hoặc password. Kiểm tra DATABASE_URL có khớp POSTGRES_USER/POSTGRES_PASSWORD không.';
    case '3D000':
      return '3D000 — kết nối được nhưng database không tồn tại. Kiểm tra POSTGRES_DB.';
    default:
      return `${error.code ?? 'UNKNOWN'} — ${error.message}`;
  }
}

/**
 * Tầng service: chứa logic, không biết gì về req/res.
 */
export async function getHealthStatus(): Promise<HealthCheckData> {
  const startedAt = performance.now();
  let connected = false;
  let latencyMs: number | null = null;
  let failure: string | null = null;

  try {
    await pool.query('SELECT 1');
    connected = true;
    latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
  } catch (error) {
    failure = explainDatabaseError(error as NodeJS.ErrnoException);
    console.error('[health] Không kết nối được database:', failure);
  }

  return {
    status: connected ? 'ok' : 'degraded',
    version: APP_VERSION,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected,
      latencyMs,
      error: isProduction ? null : failure,
    },
  };
}
