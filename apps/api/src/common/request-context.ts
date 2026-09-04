import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  /** Định danh duy nhất của request, dùng để nối mọi dòng log của nó lại. */
  requestId: string;
  /** Được điền sau khi middleware xác thực chạy xong. */
  userId?: string;
  /** Chụp lại để nhật ký thao tác đọc được cả khi tài khoản đã bị xoá mềm. */
  userEmail?: string;
  ipAddress?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Kho lưu trữ theo ngữ cảnh request.
 *
 * Nhờ nó, tầng service ghi log kèm requestId mà không phải nhận thêm tham số
 * `context` xuyên suốt mọi chữ ký hàm — thứ làm bẩn toàn bộ business logic chỉ
 * vì nhu cầu của việc ghi log.
 */
export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Gắn danh tính người dùng vào ngữ cảnh. Middleware xác thực gọi hàm này. */
export function setContextUser(userId: string, userEmail: string): void {
  const context = storage.getStore();
  if (context) {
    context.userId = userId;
    context.userEmail = userEmail;
  }
}
