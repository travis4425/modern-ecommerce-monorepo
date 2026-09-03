import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { API_PREFIX } from '@ecom/shared';
import { env, isProduction } from './config/env';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { globalRateLimiter } from './common/middleware/rate-limit.middleware';
import { notFoundMiddleware } from './common/middleware/not-found.middleware';
import { errorHandlerMiddleware } from './common/middleware/error-handler.middleware';
import { openApiDocument } from './docs/openapi';
import healthRoutes from './domains/health/health.routes';
import categoryRoutes from './domains/categories/category.routes';

/**
 * Lắp ráp ứng dụng Express.
 *
 * THỨ TỰ MIDDLEWARE Ở ĐÂY LÀ CÓ CHỦ Ý, đừng đảo:
 *
 *  1. Ngữ cảnh request phải nằm đầu tiên, nếu không những gì chạy trước nó sẽ
 *     ghi log mà không có requestId.
 *  2. Header bảo mật và CORS đứng trước mọi thứ đọc body.
 *  3. Hạn mức tần suất đứng trước bộ phân tích body — chặn kẻ lạm dụng trước
 *     khi tốn công đọc và parse payload của họ.
 *  4. 404 đứng sau toàn bộ route thật.
 *  5. Error handler nằm cuối cùng, và bắt buộc đủ bốn tham số.
 */
export function createApp(): Express {
  const app = express();

  // Express đứng sau reverse proxy ở production (Render, nginx). Không bật cờ
  // này thì req.ip luôn là IP của proxy, khiến rate limit gộp chung mọi người
  // dùng thành một — vừa vô dụng vừa chặn nhầm.
  if (isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');

  app.use(requestContextMiddleware);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(globalRateLimiter);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Tài liệu API ──────────────────────────────────────────
  // Chỉ mở ở môi trường không phải production: tài liệu này phơi bày toàn bộ
  // bề mặt API và bảng mã lỗi.
  if (!isProduction) {
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, {
        customSiteTitle: 'E-Commerce API',
        swaggerOptions: { persistAuthorization: true },
      }),
    );
    app.get('/api/docs.json', (_req, res) => {
      res.json(openApiDocument);
    });
  }

  // ── Routes ────────────────────────────────────────────────
  app.use(API_PREFIX, healthRoutes);
  app.use(API_PREFIX, categoryRoutes);

  // ── Kết thúc chuỗi ────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
