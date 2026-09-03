import { ERROR_CODES, type ErrorCode, type FieldError } from '@ecom/shared';

/**
 * Lớp lỗi gốc của toàn ứng dụng.
 *
 * Quy tắc: không bao giờ `throw` một chuỗi hay object trần. Mọi lỗi nghiệp vụ
 * đều là một lớp kế thừa AppError, nhờ đó middleware xử lý lỗi biết chính xác
 * phải trả status code nào và mã lỗi nào mà không cần đoán.
 */
export class AppError extends Error {
  constructor(
    /** Mã ổn định để frontend tra bảng i18n. */
    public readonly code: ErrorCode,
    /** Mô tả cho developer đọc log. KHÔNG hiển thị cho người dùng cuối. */
    message: string,
    public readonly statusCode: number = 400,
    /**
     * true  = lỗi nằm trong dự liệu (nhập sai, không tìm thấy, hết quyền).
     * false = bug của chúng ta. Được log ở mức nghiêm trọng hơn và che chi tiết
     *         khi ở production.
     */
    public readonly isOperational: boolean = true,
    /** Chỉ dùng cho lỗi validate, để frontend gắn thông báo vào đúng ô input. */
    public readonly details?: FieldError[],
  ) {
    super(message);
    this.name = new.target.name;
    // Cần thiết khi biên dịch xuống ES5/ES2015 để `instanceof` hoạt động đúng.
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, new.target);
  }
}

/** 404 — tài nguyên không tồn tại. Sinh mã dạng `<TÀI_NGUYÊN>_NOT_FOUND`. */
export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404);
  }
}

/** 422 — dữ liệu gửi lên không hợp lệ. */
export class ValidationError extends AppError {
  constructor(details: FieldError[], message = 'Request validation failed') {
    super(ERROR_CODES.VALIDATION_FAILED, message, 422, true, details);
  }
}

/** 409 — xung đột trạng thái, ví dụ trùng ràng buộc duy nhất. */
export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 409);
  }
}

/** 400 — yêu cầu sai định dạng ở mức thô. */
export class BadRequestError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 400);
  }
}

/**
 * 500 — bug của chúng ta. `isOperational: false` khiến logger nâng mức nghiêm
 * trọng và error handler che chi tiết khi chạy production.
 */
export class InternalError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INTERNAL_SERVER_ERROR, message, 500, false);
  }
}
