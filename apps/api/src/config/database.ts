import { Pool } from 'pg';
import { env } from './env';

/**
 * Pool kết nối PostgreSQL.
 *
 * Ở Phase 0 pool này chỉ phục vụ healthcheck. Từ Phase 1, Prisma Client trở thành
 * cửa duy nhất cho truy vấn nghiệp vụ; pool được giữ lại cho các truy vấn thô
 * cần kiểm soát khoá hàng (SELECT ... FOR UPDATE) ở Phase 8.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('[db] Lỗi trên client rảnh trong pool:', error.message);
});

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
