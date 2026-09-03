/**
 * Kiểm tra quyền — hàm thuần, không chạm database, không chạm request.
 * Tách riêng để test được trực tiếp mà không cần dựng cả server.
 */
export function hasPermission(granted: readonly string[], required: string): boolean {
  return granted.includes(required);
}

/** Đúng khi có ĐỦ mọi quyền được yêu cầu. */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => granted.includes(permission));
}

/** Đúng khi có ÍT NHẤT MỘT trong các quyền được yêu cầu. */
export function hasAnyPermission(granted: readonly string[], required: readonly string[]): boolean {
  return required.some((permission) => granted.includes(permission));
}
