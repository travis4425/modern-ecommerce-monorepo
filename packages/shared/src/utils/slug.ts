/**
 * Tạo slug an toàn cho URL từ tiếng Việt có dấu.
 *
 * Đặt ở packages/shared vì cả ba nơi cần đúng một quy tắc: seed sinh slug ban
 * đầu, backend sinh slug khi tạo sản phẩm, và frontend hiển thị slug xem trước
 * trong form admin. Ba bản sao chép tay là ba cơ hội để chúng lệch nhau.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFD')
      // Bỏ các dấu thanh và dấu phụ đã tách ra sau khi chuẩn hoá NFD.
      .replace(/[̀-ͯ]/g, '')
      // đ/Đ không phải là 'd' + dấu phụ nên NFD không tách được, phải thay tay.
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Thêm hậu tố số cho tới khi slug không còn trùng.
 *
 * `taken` là tập slug đã tồn tại trong database. Tách phần quyết định ra khỏi
 * phần truy vấn để test được mọi nhánh mà không cần database.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
