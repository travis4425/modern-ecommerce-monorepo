/**
 * Thông tin định danh ứng dụng.
 *
 * Không import trực tiếp package.json: rootDir của TypeScript là ./src nên file
 * ngoài thư mục đó sẽ làm hỏng cấu trúc output khi build. Giữ hằng số ở đây và
 * cập nhật cùng lúc với package.json (Phase 11 sẽ tự động hoá bằng CI).
 */
export const APP_NAME = 'ecommerce-api';
export const APP_VERSION = '0.1.0';
