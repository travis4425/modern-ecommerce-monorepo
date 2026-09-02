import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { API_PREFIX, type ApiErrorResponse } from '@ecom/shared';
import { env } from './config/env';
import healthRoutes from './domains/health/health.routes';

export function createApp(): Express {
  const app = express();

  // Bảo mật header cơ bản. Rate limiting và CSP đầy đủ thuộc Phase 2.
  app.use(helmet());

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ────────────────────────────────────────────────
  app.use(API_PREFIX, healthRoutes);

  // ── 404 ───────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl}`,
      },
    };
    res.status(404).json(body);
  });

  // ── Error handler tạm thời ────────────────────────────────
  // Phase 2 sẽ thay bằng handler đầy đủ: AppError, mã lỗi, map lỗi Prisma, logger.
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', error.stack ?? error.message);
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      },
    };
    res.status(500).json(body);
  });

  return app;
}
