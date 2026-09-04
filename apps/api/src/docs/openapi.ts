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
    '/admin/categories': {
      get: {
        tags: ['Admin'],
        summary: 'Danh sách danh mục, gồm cả danh mục đang tắt (cần category:read)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách phẳng' },
          403: { description: 'Không đủ quyền' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Tạo danh mục (cần category:create)',
        description:
          'Slug tự sinh từ tên, bỏ dấu tiếng Việt, trùng thì thêm hậu tố số. ' +
          'Cây danh mục chỉ có HAI cấp: parentId phải trỏ tới một danh mục gốc.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Bàn phím cơ' },
                  parentId: { type: 'string', format: 'uuid', nullable: true },
                  description: { type: 'string', nullable: true },
                  imageUrl: { type: 'string', format: 'uri', nullable: true },
                  sortOrder: { type: 'integer', default: 0 },
                  isActive: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Đã tạo' },
          400: { description: 'CATEGORY_DEPTH_EXCEEDED — vượt quá hai cấp' },
          403: { description: 'Không đủ quyền' },
        },
      },
    },
    '/admin/categories/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Sửa danh mục (cần category:update)',
        description: 'Đổi tên thì slug đi theo. Body rỗng bị từ chối.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Đã sửa' }, 404: { description: 'CATEGORY_NOT_FOUND' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Xoá mềm danh mục (cần category:delete)',
        description:
          'Từ chối khi danh mục còn danh mục con hoặc còn sản phẩm — trả về đúng lý do ' +
          'thay vì một lỗi ràng buộc chung chung từ database.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Đã xoá mềm' },
          409: { description: 'CATEGORY_HAS_CHILDREN hoặc CATEGORY_HAS_PRODUCTS' },
        },
      },
    },
    '/admin/products': {
      post: {
        tags: ['Admin'],
        summary: 'Tạo sản phẩm (cần product:create)',
        description:
          'Sản phẩm, thông số kỹ thuật và dòng tồn kho được tạo trong CÙNG một transaction. ' +
          'Chỉ gán được vào danh mục lá. SKU tự viết hoa. Giá gửi dưới dạng chuỗi.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryId', 'sku', 'name', 'price'],
                properties: {
                  categoryId: { type: 'string', format: 'uuid' },
                  sku: { type: 'string', example: 'KB-AKKO-5075B' },
                  name: { type: 'string', example: 'Akko 5075B Plus' },
                  brand: { type: 'string', nullable: true },
                  shortDescription: { type: 'string', nullable: true },
                  description: { type: 'string', nullable: true },
                  price: { type: 'string', example: '2290000' },
                  compareAtPrice: { type: 'string', nullable: true },
                  isActive: { type: 'boolean', default: true },
                  isFeatured: { type: 'boolean', default: false },
                  attributes: {
                    type: 'array',
                    maxItems: 30,
                    items: {
                      type: 'object',
                      properties: { name: { type: 'string' }, value: { type: 'string' } },
                    },
                  },
                  initialStock: { type: 'integer', default: 0 },
                  lowStockThreshold: { type: 'integer', default: 5 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Đã tạo' },
          400: { description: 'CATEGORY_NOT_LEAF' },
          409: { description: 'PRODUCT_SKU_EXISTS' },
        },
      },
    },
    '/admin/products/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Sửa sản phẩm (cần product:update)',
        description:
          'Không đổi được SKU — đó là định danh đối chiếu với kho và đơn hàng cũ. ' +
          'Gửi `attributes` sẽ THAY THẾ toàn bộ danh sách thông số cũ.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Đã sửa' }, 404: { description: 'PRODUCT_NOT_FOUND' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Xoá mềm sản phẩm (cần product:delete)',
        description:
          'Luôn xoá mềm. order_items tham chiếu sản phẩm bằng RESTRICT — xoá cứng sẽ ' +
          'làm bốc hơi lịch sử mua hàng. SKU vẫn bị giữ chỗ sau khi xoá.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Đã xoá mềm' },
          404: { description: 'PRODUCT_NOT_FOUND' },
        },
      },
    },
    '/admin/products/{id}/images': {
      get: {
        tags: ['Admin'],
        summary: 'Danh sách ảnh của sản phẩm (cần product:read)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Mảng ảnh, sắp theo sortOrder' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Tải một ảnh lên (cần product:update)',
        description:
          'multipart/form-data, phần tệp tên `file`. Kiểu ảnh được xác định bằng CHỮ KÝ BYTE ' +
          'chứ không theo Content-Type client khai — SVG và GIF bị từ chối. Ảnh đầu tiên của ' +
          'sản phẩm luôn tự trở thành ảnh đại diện.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  alt: { type: 'string', maxLength: 255 },
                  isPrimary: { type: 'string', enum: ['true', 'false'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Đã lưu' },
          400: { description: 'UPLOAD_FILE_MISSING' },
          404: { description: 'PRODUCT_NOT_FOUND' },
          409: { description: 'PRODUCT_IMAGE_LIMIT_REACHED' },
          413: { description: 'UPLOAD_FILE_TOO_LARGE' },
          415: { description: 'UPLOAD_FILE_TYPE_UNSUPPORTED — nội dung không phải ảnh cho phép' },
        },
      },
    },
    '/admin/products/{id}/images/order': {
      put: {
        tags: ['Admin'],
        summary: 'Sắp xếp lại ảnh (cần product:update)',
        description:
          'Thân request là `{ order: [imageId, ...] }` và phải là HOÁN VỊ ĐẦY ĐỦ của tập ảnh ' +
          'hiện có: không thiếu, không thừa, không trùng.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Danh sách ảnh theo thứ tự mới' },
          400: { description: 'PRODUCT_IMAGE_ORDER_MISMATCH' },
        },
      },
    },
    '/admin/products/{id}/images/{imageId}': {
      put: {
        tags: ['Admin'],
        summary: 'Thay tệp của một ảnh (cần product:update)',
        description:
          'Giữ nguyên id, thứ tự và cờ đại diện; tệp cũ bị xoá khỏi nơi lưu trữ SAU khi bản ghi ' +
          'đã trỏ sang tệp mới.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'imageId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Đã thay' },
          404: { description: 'PRODUCT_IMAGE_NOT_FOUND' },
          415: { description: 'UPLOAD_FILE_TYPE_UNSUPPORTED' },
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Sửa alt hoặc đặt làm ảnh đại diện (cần product:update)',
        description:
          'Chỉ có đường ĐẶT làm đại diện. Không có đường gỡ: gỡ cờ của ảnh duy nhất đang mang ' +
          'nó sẽ để sản phẩm không còn ảnh đại diện nào.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'imageId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Đã sửa' },
          404: { description: 'PRODUCT_IMAGE_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Xoá ảnh (cần product:update)',
        description:
          'Xoá CỨNG — ảnh không được bảng nào tham chiếu tới. Nếu ảnh bị xoá đang là đại diện ' +
          'thì ảnh còn lại đứng đầu tự kế thừa vai trò.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'imageId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          204: { description: 'Đã xoá' },
          404: { description: 'PRODUCT_IMAGE_NOT_FOUND' },
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
    '/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Danh sách sản phẩm: tìm kiếm, lọc, sắp xếp, phân trang',
        description:
          'Tìm kiếm toàn văn KHÔNG PHÂN BIỆT DẤU: gõ "ban phim" tìm được "Bàn phím". ' +
          'Kết quả khớp ở tên sản phẩm được xếp trên kết quả chỉ khớp ở mô tả. ' +
          'Lọc theo danh mục cha sẽ lấy cả sản phẩm thuộc các danh mục con. ' +
          'Mọi giá trị tiền trả về dưới dạng CHUỖI để không mất chính xác.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, example: 'ban phim' },
          { name: 'category', in: 'query', schema: { type: 'string' }, example: 'ban-phim-co' },
          { name: 'minPrice', in: 'query', schema: { type: 'string' }, example: '1000000' },
          { name: 'maxPrice', in: 'query', schema: { type: 'string' }, example: '5000000' },
          { name: 'brand', in: 'query', schema: { type: 'string' }, example: 'Logitech' },
          { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'relevance',
                'price',
                '-price',
                'created_at',
                '-created_at',
                'rating',
                'name',
                '-name',
              ],
              default: 'relevance',
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Danh sách kèm meta phân trang' },
          422: { description: 'VALIDATION_FAILED' },
        },
      },
    },
    '/products/brands': {
      get: {
        tags: ['Catalog'],
        summary: 'Danh sách thương hiệu đang bán, để dựng bộ lọc',
        responses: { 200: { description: 'Mảng chuỗi đã sắp xếp' } },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Chi tiết sản phẩm',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'akko-3068b-plus-world-tour-tokyo',
          },
        ],
        responses: {
          200: { description: 'Chi tiết kèm ảnh, thông số kỹ thuật và tồn kho' },
          404: { description: 'PRODUCT_NOT_FOUND' },
          422: { description: 'Slug sai định dạng' },
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
