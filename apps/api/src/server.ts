import type { Server } from 'node:http';
import { createApp } from './app';
import { env, describeDatabaseTarget } from './config/env';
import { closeDatabase } from './config/database';
import { disconnectPrisma } from './config/prisma';
import { APP_NAME, APP_VERSION } from './config/app-info';
import { logger } from './common/logger';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  console.warn(`\n  ${APP_NAME} v${APP_VERSION}`);
  console.warn(`  Môi trường : ${env.NODE_ENV}`);
  console.warn(`  Database   : ${describeDatabaseTarget()}`);
  console.warn(`  Đang chạy  : http://localhost:${env.PORT}`);
  console.warn(`  Healthcheck: http://localhost:${env.PORT}/api/v1/health`);
  console.warn(`  Tài liệu   : http://localhost:${env.PORT}/api/docs\n`);
});

/** Tắt êm: ngừng nhận request mới, đóng kết nối DB rồi mới thoát. */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'nhận tín hiệu tắt, đang đóng server');

  const forceExit = setTimeout(() => {
    logger.fatal('quá thời gian chờ khi tắt, buộc thoát');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await disconnectPrisma();
      await closeDatabase();
      logger.info('đã đóng server và database');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'lỗi khi đóng database');
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'promise bị reject mà không ai bắt');
});

/**
 * Sau uncaughtException, tiến trình ở trạng thái không xác định — không thể tin
 * được nữa. Ghi log rồi thoát để trình quản lý tiến trình dựng lại bản sạch,
 * thay vì tiếp tục phục vụ request bằng một tiến trình đã hỏng.
 */
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'ngoại lệ không ai bắt, thoát tiến trình');
  process.exit(1);
});
