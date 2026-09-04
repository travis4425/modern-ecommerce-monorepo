import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
import productRoutes from './domains/products/product.routes';
import authRoutes from './domains/auth/auth.routes';
import userRoutes from './domains/users/user.routes';

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

  // Phải đứng trước mọi route đọc cookie — refresh token đi bằng cookie HTTPOnly.
  app.use(cookieParser());

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Tài liệu API ──────────────────────────────────────────
  // Chỉ mở ở môi trường không phải production: tài liệu này phơi bày toàn bộ
  // bề mặt API và bảng mã lỗi.
  if (!isProduction) {
    app.use(
      '/api/docs',
      // Swagger UI khởi tạo bằng script inline, nên CSP mặc định của helmet
      // (script-src 'self', không có 'unsafe-inline') sẽ chặn và để lại trang
      // trắng. Nới đúng một chỗ này thay vì nới toàn cục — mọi endpoint API
      // khác vẫn giữ nguyên CSP nghiêm ngặt. Khối này chỉ chạy ngoài production.
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:'],
          },
        },
      }),
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
  app.use(API_PREFIX, authRoutes);
  app.use(API_PREFIX, categoryRoutes);
  app.use(API_PREFIX, productRoutes);
  app.use(API_PREFIX, userRoutes);

  // ── Kết thúc chuỗi ────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
