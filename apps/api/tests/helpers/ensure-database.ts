import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

/**
 * Kiểm tra database TRƯỚC khi chạy test tích hợp.
 *
 * Không có bước này, database không nối được sẽ biểu hiện thành hàng chục dòng
 * "expected 200, got 500" — không nói được gì về nguyên nhân, và mất rất nhiều
 * thời gian để truy ra. Ở đây ta hỏng sớm với một thông báo nói thẳng vấn đề.
 */
export default async function ensureDatabase(): Promise<void> {
  loadEnv({ path: path.resolve(__dirname, '../../.env'), override: true });

  const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Thiếu DATABASE_URL — kiểm tra apps/api/.env');
  }

  const target = (() => {
    try {
      const url = new URL(connectionString);
      return `${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`;
    } catch {
      return '(không phân tích được DATABASE_URL)';
    }
  })();

  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    await client.connect();
    const { rows } = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const tables = Number(rows[0]?.count ?? 0);

    if (tables === 0) {
      throw new Error(
        `Database ${target} chưa có bảng nào.\n` + 'Chạy: pnpm db:up && pnpm db:reset\n',
      );
    }

    const products = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM products WHERE deleted_at IS NULL',
    );
    if (Number(products.rows[0]?.count ?? 0) === 0) {
      throw new Error(
        `Database ${target} có bảng nhưng chưa có dữ liệu mẫu.\n` + 'Chạy: pnpm db:seed\n',
      );
    }
  } catch (error) {
    const message = (error as Error).message;

    // Lỗi kết nối cần chỉ rõ đang nối vào ĐÂU — nguyên nhân hay gặp nhất là
    // một DATABASE_URL còn sót ở cấp máy trỏ sang database hoàn toàn khác.
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('timeout')
    ) {
      throw new Error(
        `Không nối được database.\n\n` +
          `  Đang nối tới : ${target}\n\n` +
          `  Nếu đây không phải database của dự án, có một DATABASE_URL còn sót\n` +
          `  ở cấp máy đang chiếm chỗ. Kiểm tra bằng: $env:DATABASE_URL\n\n` +
          `  Nếu đúng địa chỉ thì Postgres chưa chạy: pnpm db:up\n`,
      );
    }
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
