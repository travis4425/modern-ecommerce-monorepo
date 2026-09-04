/**
 * Chuẩn hoá mọi giá trị tiền và điểm số về chuỗi có đúng số chữ số thập phân.
 *
 * Vì sao cần: cùng một cột numeric(12,2) ra hai dạng khác nhau tuỳ đường đi.
 *  • Qua driver pg (SQL thô): Postgres giữ nguyên scale  → "1990000.00"
 *  • Qua Prisma Decimal:      toString() bỏ số 0 thừa    → "1990000"
 *
 * Frontend không nên phải biết endpoint nào dùng đường nào. Mọi giá trị tiền
 * đi ra ngoài đều qua đây.
 *
 * Toàn bộ xử lý trên CHUỖI, không đi qua number — đó là lý do cả hệ thống giữ
 * tiền dưới dạng chuỗi ngay từ đầu.
 */
const DEFAULT_SCALE = 2;

function padScale(raw: string, scale: number): string {
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;
  const [integer = '0', fraction = ''] = digits.split('.');

  // Cắt thẳng thay vì làm tròn: dữ liệu đã đúng scale từ database, phần dư chỉ
  // xuất hiện khi ai đó truyền vào chuỗi lạ — và làm tròn im lặng sẽ giấu điều đó.
  const padded = `${fraction}${'0'.repeat(scale)}`.slice(0, scale);

  return `${negative ? '-' : ''}${integer}${scale > 0 ? `.${padded}` : ''}`;
}

/** Đối tượng Decimal của Prisma lộ ra toFixed; ta chỉ cần đúng chừng đó. */
function hasToFixed(value: unknown): value is { toFixed(digits: number): string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toFixed' in value &&
    typeof (value as { toFixed: unknown }).toFixed === 'function'
  );
}

export function toMoneyString(value: unknown, scale = DEFAULT_SCALE): string {
  if (value === null || value === undefined) return padScale('0', scale);
  if (hasToFixed(value)) return value.toFixed(scale);
  return padScale(String(value), scale);
}

/** Như trên nhưng giữ nguyên null — dùng cho các cột cho phép rỗng. */
export function toMoneyStringOrNull(value: unknown, scale = DEFAULT_SCALE): string | null {
  return value === null || value === undefined ? null : toMoneyString(value, scale);
}
