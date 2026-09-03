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
    { name: 'Auth', description: 'Đăng ký, đăng nhập, làm mới token' },
    { name: 'Catalog', description: 'Danh mục và sản phẩm' },
    { name: 'Admin', description: 'Khu vực quản trị, cần quyền tương ứng' },
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
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng ký tài khoản khách hàng',
        description:
          'Trả access token trong body và đặt refresh token vào cookie HTTPOnly. ' +
          'Giới hạn 10 request / 15 phút theo IP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'travis@example.com' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    maxLength: 72,
                    description: 'Tối thiểu 8 ký tự, có chữ thường, chữ hoa và chữ số.',
                    example: 'Password@123',
                  },
                  fullName: { type: 'string', example: 'Nguyễn Quốc Khánh' },
                  phone: { type: 'string', pattern: '^0\\d{9}$', example: '0912345678' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tạo tài khoản thành công' },
          409: { description: 'AUTH_EMAIL_ALREADY_EXISTS' },
          422: { description: 'VALIDATION_FAILED' },
          429: { description: 'RATE_LIMIT_EXCEEDED' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập',
        description:
          'Sai email và sai mật khẩu trả về CÙNG một mã lỗi, và tốn cùng lượng thời gian, ' +
          'để không lộ email nào đã đăng ký.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@example.com' },
                  password: { type: 'string', example: 'Password@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công' },
          401: { description: 'AUTH_INVALID_CREDENTIALS' },
          403: { description: 'AUTH_ACCOUNT_DISABLED' },
          429: { description: 'RATE_LIMIT_EXCEEDED' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Làm mới access token (có xoay refresh token)',
        description:
          'Đọc refresh token từ cookie, cấp cặp mới và thu hồi cái cũ. ' +
          'Nếu một token ĐÃ thu hồi được dùng lại, toàn bộ family bị thu hồi và trả về ' +
          'AUTH_REFRESH_TOKEN_REUSED — đó là cơ chế phát hiện token bị đánh cắp.',
        responses: {
          200: { description: 'Đã cấp cặp token mới' },
          401: { description: 'Token thiếu, không hợp lệ, quá hạn, hoặc bị dùng lại' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng xuất thiết bị hiện tại',
        description: 'Luôn thành công, kể cả khi không có cookie.',
        responses: { 200: { description: 'Đã đăng xuất' } },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng xuất khỏi mọi thiết bị',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Đã thu hồi mọi phiên' },
          401: { description: 'Chưa đăng nhập' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Thông tin người đang đăng nhập kèm danh sách quyền',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Hồ sơ người dùng' },
          401: { description: 'Chưa đăng nhập' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Gửi email đặt lại mật khẩu',
        description:
          'Luôn trả 200 với cùng một thông điệp, dù email có tồn tại hay không — ' +
          'khác biệt bất kỳ sẽ biến endpoint này thành công cụ liệt kê tài khoản. ' +
          'Đặt header Accept-Language: en để nhận email tiếng Anh.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', example: 'khach1@example.com' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đã tiếp nhận' },
          429: { description: 'RATE_LIMIT_EXCEEDED' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Đặt lại mật khẩu bằng token trong email',
        description:
          'Token chỉ dùng được một lần và hết hạn sau 15 phút. Thành công thì MỌI phiên ' +
          'đăng nhập của tài khoản đều bị thu hồi.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', example: 'MatKhauMoi@456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đã đổi mật khẩu' },
          400: { description: 'AUTH_RESET_TOKEN_INVALID hoặc AUTH_RESET_TOKEN_EXPIRED' },
          422: { description: 'VALIDATION_FAILED' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Danh sách người dùng (cần quyền user:read)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Tìm theo email hoặc họ tên',
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string', enum: ['ADMIN', 'STAFF', 'USER'] },
          },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'created_at',
                '-created_at',
                'email',
                '-email',
                'last_login_at',
                '-last_login_at',
              ],
            },
          },
        ],
        responses: {
          200: { description: 'Danh sách kèm meta phân trang' },
          401: { description: 'AUTH_TOKEN_MISSING — chưa đăng nhập' },
          403: { description: 'AUTH_INSUFFICIENT_PERMISSION — đã đăng nhập nhưng không đủ quyền' },
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
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiError: errorResponseSchema,
      CategorySummary: categorySummarySchema,
    },
  },
};
