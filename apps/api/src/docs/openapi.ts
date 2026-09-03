import { API_PREFIX, ERROR_CODES } from '@ecom/shared';
import { APP_VERSION } from '../config/app-info';

/**
 * Tài liệu OpenAPI viết tay.
 *
 * Chủ ý không dùng công cụ sinh tự động từ Zod: chúng ràng dự án vào một thư
 * viện cầu nối phải chạy theo cả Zod lẫn OpenAPI, và khi lệch phiên bản thì
 * hỏng cả bộ tài liệu. Với vài chục endpoint, tự viết vẫn nhẹ và luôn kiểm
 * soát được. Mỗi phase thêm endpoint thì bổ sung vào đây cùng lúc.
 */
const errorResponseSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', enum: Object.values(ERROR_CODES) },
        message: {
          type: 'string',
          description: 'Dành cho developer. Không hiển thị cho người dùng.',
        },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: { field: { type: 'string' }, code: { type: 'string' } },
          },
        },
      },
    },
  },
} as const;

const categorySummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Bàn phím cơ' },
    slug: { type: 'string', example: 'ban-phim-co' },
    imageUrl: { type: 'string', nullable: true },
    sortOrder: { type: 'integer' },
    productCount: { type: 'integer', example: 4 },
  },
} as const;

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'E-Commerce Platform API',
    version: APP_VERSION,
    description: [
      'REST API cho nền tảng thương mại điện tử.',
      '',
      '**Envelope response.** Mọi endpoint trả về `{ success, data, meta?, error? }`.',
      '',
      '**Mã lỗi.** Khi thất bại, đọc `error.code` — đó là mã ổn định để frontend',
      'tra bảng i18n. Trường `error.message` chỉ dành cho developer đọc log,',
      'không bao giờ đem hiển thị thẳng cho người dùng cuối.',
      '',
      '**Truy vết.** Mọi response đều kèm header `x-request-id`. Khi báo lỗi,',
      'gửi kèm mã này để tra được toàn bộ dấu vết trong log.',
    ].join('\n'),
  },
  servers: [{ url: API_PREFIX, description: 'Máy chủ hiện tại' }],
  tags: [
    { name: 'Health', description: 'Kiểm tra tình trạng hệ thống' },
    { name: 'Catalog', description: 'Danh mục và sản phẩm' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Tình trạng hệ thống và số liệu catalog',
        description:
          'Trả 200 khi mọi thứ bình thường, 503 khi không kết nối được database. ' +
          'Envelope vẫn là `success: true` vì bản thân request đã xử lý xong.',
        responses: {
          200: { description: 'Hệ thống bình thường' },
          503: { description: 'Suy giảm — không kết nối được database' },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Catalog'],
        summary: 'Cây danh mục hai cấp',
        parameters: [
          {
            name: 'includeEmpty',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
            description: 'Có hiện danh mục chưa có sản phẩm nào hay không.',
          },
        ],
        responses: {
          200: {
            description: 'Danh sách danh mục cha, mỗi cha kèm danh mục con',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    data: {
                      type: 'array',
                      items: {
                        allOf: [
                          categorySummarySchema,
                          {
                            type: 'object',
                            properties: {
                              children: { type: 'array', items: categorySummarySchema },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          422: {
            description: 'Tham số không hợp lệ',
            content: { 'application/json': { schema: errorResponseSchema } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ApiError: errorResponseSchema,
      CategorySummary: categorySummarySchema,
    },
  },
};
