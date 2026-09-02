/** Tiền tố phiên bản cho toàn bộ REST API. Đổi ở đây là đổi cả FE lẫn BE. */
export const API_PREFIX = '/api/v1' as const;

/** Giá trị mặc định cho phân trang offset-based, dùng chung FE/BE. */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
