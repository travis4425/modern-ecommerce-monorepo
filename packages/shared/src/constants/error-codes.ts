/**
 * Bảng mã lỗi — hợp đồng giữa backend và bảng dịch của frontend.
 *
 * Backend KHÔNG trả về câu chữ đã dịch. Nó trả mã ổn định ở đây, frontend tra
 * `errors.<MÃ>` trong file i18n để hiển thị đúng ngôn ngữ người dùng đang chọn.
 * Trường `message` trong response chỉ dành cho developer đọc log, không bao giờ
 * đem hiển thị thẳng cho người dùng.
 *
 * Quy tắc thêm mã mới:
 *  • Dạng `<TÀI_NGUYÊN>_<TÌNH_HUỐNG>`, chữ hoa, gạch dưới.
 *  • Thêm ở đây TRƯỚC, rồi mới dùng trong service.
 *  • Mỗi mã thêm vào phải có bản dịch tương ứng ở cả en.json lẫn vi.json.
 *  • Không bao giờ đổi hay xoá mã đã phát hành — nó là API công khai.
 */
export const ERROR_CODES = {
  // ── Chung ───────────────────────────────────────────────────────────────
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MALFORMED_JSON: 'MALFORMED_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // ── Tầng dữ liệu ────────────────────────────────────────────────────────
  /** Vi phạm ràng buộc duy nhất, ví dụ trùng email hoặc trùng slug. */
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  /** Tham chiếu tới bản ghi không tồn tại, hoặc xoá bản ghi đang được tham chiếu. */
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
  /** Prisma không tìm thấy bản ghi cần thao tác. */
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',

  // ── Xác thực ────────────────────────────────────────────────────────────
  /** Sai email hoặc sai mật khẩu. Cố ý KHÔNG phân biệt hai trường hợp. */
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  /** Không gửi kèm access token, hoặc header Authorization sai định dạng. */
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  /** Chữ ký sai, token bị sửa, hoặc sai loại token. */
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_TOKEN_MISSING: 'AUTH_REFRESH_TOKEN_MISSING',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_REFRESH_TOKEN_EXPIRED: 'AUTH_REFRESH_TOKEN_EXPIRED',
  /**
   * Một refresh token đã bị thu hồi lại được dùng lần nữa. Dấu hiệu token bị
   * đánh cắp: toàn bộ phiên của người dùng đó đã bị thu hồi.
   */
  AUTH_REFRESH_TOKEN_REUSED: 'AUTH_REFRESH_TOKEN_REUSED',
  /** Token đặt lại mật khẩu không tồn tại, đã dùng, hoặc đã hết hạn. */
  AUTH_RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID',
  AUTH_RESET_TOKEN_EXPIRED: 'AUTH_RESET_TOKEN_EXPIRED',
  /** Đã đăng nhập nhưng không đủ quyền cho hành động này. */
  AUTH_INSUFFICIENT_PERMISSION: 'AUTH_INSUFFICIENT_PERMISSION',

  // ── Catalog ─────────────────────────────────────────────────────────────
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  /** Cây danh mục chỉ có hai cấp: không thể đặt danh mục con làm cha. */
  CATEGORY_DEPTH_EXCEEDED: 'CATEGORY_DEPTH_EXCEEDED',
  /** Không thể xoá danh mục đang còn danh mục con. */
  CATEGORY_HAS_CHILDREN: 'CATEGORY_HAS_CHILDREN',
  /** Không thể xoá danh mục đang còn sản phẩm. */
  CATEGORY_HAS_PRODUCTS: 'CATEGORY_HAS_PRODUCTS',
  /** Không thể gán sản phẩm vào danh mục cha — sản phẩm chỉ thuộc danh mục lá. */
  CATEGORY_NOT_LEAF: 'CATEGORY_NOT_LEAF',
  PRODUCT_SKU_EXISTS: 'PRODUCT_SKU_EXISTS',

  // ── Tải ảnh lên ─────────────────────────────────────────────────────────
  /** Request multipart nhưng không có phần tệp nào tên `file`. */
  UPLOAD_FILE_MISSING: 'UPLOAD_FILE_MISSING',
  UPLOAD_FILE_TOO_LARGE: 'UPLOAD_FILE_TOO_LARGE',
  /**
   * Nội dung tệp không phải ảnh thuộc danh sách cho phép. Kết luận này dựa
   * trên chữ ký byte đầu tệp, KHÔNG dựa trên Content-Type do client khai.
   */
  UPLOAD_FILE_TYPE_UNSUPPORTED: 'UPLOAD_FILE_TYPE_UNSUPPORTED',
  UPLOAD_TOO_MANY_FILES: 'UPLOAD_TOO_MANY_FILES',
  /** Lưu trữ (đĩa hoặc Cloudinary) từ chối. Lỗi hạ tầng, không phải lỗi người dùng. */
  UPLOAD_STORAGE_FAILED: 'UPLOAD_STORAGE_FAILED',
  PRODUCT_IMAGE_NOT_FOUND: 'PRODUCT_IMAGE_NOT_FOUND',
  PRODUCT_IMAGE_LIMIT_REACHED: 'PRODUCT_IMAGE_LIMIT_REACHED',
  /** Danh sách sắp xếp gửi lên không khớp đúng tập ảnh hiện có của sản phẩm. */
  PRODUCT_IMAGE_ORDER_MISMATCH: 'PRODUCT_IMAGE_ORDER_MISMATCH',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Khoá i18n tương ứng của một mã lỗi, dùng ở frontend. */
export function errorTranslationKey(code: string): string {
  return `errors.${code}`;
}
