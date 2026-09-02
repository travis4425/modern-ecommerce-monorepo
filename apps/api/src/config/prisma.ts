import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { pool } from './database';
import { isProduction } from './env';

/**
 * Prisma Client dùng chung toàn ứng dụng.
 *
 * Adapter nhận thẳng `pool` mà src/config/database.ts đã tạo, nên Prisma và
 * các truy vấn SQL thô (SELECT ... FOR UPDATE ở Phase 8) dùng CHUNG một
 * connection pool. Nhờ vậy không có hai bể kết nối cạnh tranh nhau, và một
 * transaction mở bằng Prisma nhìn thấy đúng trạng thái khoá hàng.
 */
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['warn', 'error'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
