import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  /** Định danh duy nhất của request, dùng để nối mọi dòng log của nó lại. */
  requestId: string;
  /** Được điền ở Phase 3 sau khi middleware xác thực chạy xong. */
  userId?: string;
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

/** Gắn userId vào ngữ cảnh hiện tại. Middleware xác thực ở Phase 3 sẽ gọi hàm này. */
export function setContextUserId(userId: string): void {
  const context = storage.getStore();
  if (context) context.userId = userId;
}
