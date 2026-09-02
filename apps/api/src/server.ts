import type { Server } from 'node:http';
import { createApp } from './app';
import { env, describeDatabaseTarget } from './config/env';
import { closeDatabase } from './config/database';
import { APP_NAME, APP_VERSION } from './config/app-info';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  console.warn(`\n  ${APP_NAME} v${APP_VERSION}`);
  console.warn(`  Môi trường : ${env.NODE_ENV}`);
  console.warn(`  Database   : ${describeDatabaseTarget()}`);
  console.warn(`  Đang chạy  : http://localhost:${env.PORT}`);
  console.warn(`  Healthcheck: http://localhost:${env.PORT}/api/v1/health\n`);
});

/** Tắt êm: ngừng nhận request mới, đóng kết nối DB rồi mới thoát. */
async function shutdown(signal: string): Promise<void> {
  console.warn(`\n[${signal}] Đang tắt server...`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] Quá thời gian chờ, buộc thoát.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await closeDatabase();
      console.warn('[shutdown] Đã đóng server và database.');
      process.exit(0);
    } catch (error) {
      console.error('[shutdown] Lỗi khi đóng database:', (error as Error).message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
  process.exit(1);
});
