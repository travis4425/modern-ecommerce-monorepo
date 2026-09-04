/**
 * Luật sắp xếp và chọn ảnh đại diện — THUẦN, không chạm database.
 *
 * Tách ra khỏi service vì đây là phần dễ sai nhất và cũng là phần dễ test nhất:
 * mọi nhánh (sản phẩm chưa có ảnh, xoá đúng ảnh đại diện, gửi thiếu một id khi
 * sắp xếp) kiểm được bằng vài mảng dựng tay, không cần dựng Postgres.
 */

export interface ImageRow {
  id: string;
  sortOrder: number;
  isPrimary: boolean;
}

/** Ảnh mới luôn xếp cuối hàng. */
export function nextSortOrder(existing: readonly { sortOrder: number }[]): number {
  if (existing.length === 0) return 0;
  return Math.max(...existing.map((image) => image.sortOrder)) + 1;
}

/**
 * Ảnh vừa thêm có trở thành ảnh đại diện không.
 *
 * Sản phẩm chưa có ảnh nào thì ảnh đầu tiên BẮT BUỘC là đại diện, bất kể client
 * gửi gì: một sản phẩm có ảnh nhưng không ảnh nào được đánh dấu đại diện sẽ
 * hiện ô trống ở trang danh sách, và không ai nhìn màn hình quản trị mà đoán ra
 * nguyên nhân.
 */
export function shouldBecomePrimary(
  existingCount: number,
  requested: boolean | undefined,
): boolean {
  return existingCount === 0 || requested === true;
}

/**
 * Ảnh nào kế thừa vai trò đại diện sau khi ảnh đại diện bị xoá: ảnh còn lại
 * đứng đầu theo thứ tự. Trả null khi không phải xử lý gì.
 */
export function primaryAfterDelete(
  remaining: readonly ImageRow[],
  deletedWasPrimary: boolean,
): string | null {
  if (!deletedWasPrimary || remaining.length === 0) return null;
  if (remaining.some((image) => image.isPrimary)) return null;

  const first = [...remaining].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return first ? first.id : null;
}

export type ReorderPlan =
  { ok: true; updates: Array<{ id: string; sortOrder: number }> } | { ok: false };

/**
 * Dựng kế hoạch sắp xếp lại từ danh sách id client gửi lên.
 *
 * Yêu cầu danh sách phải là HOÁN VỊ ĐẦY ĐỦ của tập ảnh hiện có — không thiếu,
 * không thừa, không trùng. Chấp nhận danh sách một phần nghe có vẻ tiện, nhưng
 * khi đó thứ tự của những ảnh không được nhắc tới là không xác định, và giao
 * diện sẽ nhảy lung tung sau mỗi lần lưu.
 */
export function planReorder(
  existing: readonly ImageRow[],
  desired: readonly string[],
): ReorderPlan {
  if (desired.length !== existing.length) return { ok: false };
  if (new Set(desired).size !== desired.length) return { ok: false };

  const known = new Set(existing.map((image) => image.id));
  if (desired.some((id) => !known.has(id))) return { ok: false };

  return { ok: true, updates: desired.map((id, index) => ({ id, sortOrder: index })) };
}
