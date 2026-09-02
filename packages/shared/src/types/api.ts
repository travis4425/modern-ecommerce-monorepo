/**
 * Hợp đồng response giữa backend và frontend.
 *
 * Backend KHÔNG trả message đã dịch sẵn. Nó trả `error.code`
 * (ví dụ 'AUTH_INVALID_CREDENTIALS'), frontend tra bảng i18n để hiển thị
 * đúng ngôn ngữ người dùng đang chọn.
 */

/** Thông tin phân trang đi kèm mọi danh sách. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Chi tiết một lỗi validate ở cấp field, để FE gắn vào đúng ô input. */
export interface FieldError {
  field: string;
  code: string;
}

export interface ApiErrorPayload {
  /** Mã lỗi ổn định, dùng làm khoá i18n phía FE. */
  code: string;
  /** Mô tả tiếng Anh cho developer/log. Không dùng để hiển thị cho người dùng. */
  message: string;
  /** Chỉ xuất hiện với lỗi validate. */
  details?: FieldError[];
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

/** Tham số phân trang chuẩn cho mọi endpoint danh sách. */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  /** Ví dụ '-created_at' (giảm dần) hoặc 'price' (tăng dần). */
  sort?: string;
}
