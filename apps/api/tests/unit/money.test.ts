import { toMoneyString, toMoneyStringOrNull } from '../../src/common/http/money';

/** Giả lập Decimal của Prisma: thứ duy nhất ta cần là toFixed. */
const decimal = (value: string) => ({
  toFixed: (digits: number) => Number(value).toFixed(digits),
});

describe('toMoneyString', () => {
  it('bổ sung số 0 cho chuỗi thiếu phần thập phân', () => {
    // Đây chính là mâu thuẫn giữa hai endpoint: Prisma trả '1990000',
    // driver pg trả '1990000.00'.
    expect(toMoneyString('1990000')).toBe('1990000.00');
    expect(toMoneyString('1990000.5')).toBe('1990000.50');
  });

  it('giữ nguyên chuỗi đã đúng định dạng', () => {
    expect(toMoneyString('1990000.00')).toBe('1990000.00');
    expect(toMoneyString('0.99')).toBe('0.99');
  });

  it('xử lý Decimal của Prisma', () => {
    expect(toMoneyString(decimal('1990000'))).toBe('1990000.00');
    expect(toMoneyString(decimal('4.5'), 2)).toBe('4.50');
  });

  it('không dùng số dấu phẩy động cho chuỗi dài', () => {
    // 9999999999.99 vượt khả năng biểu diễn chính xác của float64. Xử lý bằng
    // thao tác chuỗi nên giá trị đi ra nguyên vẹn.
    expect(toMoneyString('9999999999.99')).toBe('9999999999.99');
  });

  it('cắt phần dư thay vì làm tròn im lặng', () => {
    expect(toMoneyString('100.999')).toBe('100.99');
  });

  it('giữ dấu âm', () => {
    expect(toMoneyString('-50000')).toBe('-50000.00');
  });

  it('coi null và undefined là 0', () => {
    expect(toMoneyString(null)).toBe('0.00');
    expect(toMoneyString(undefined)).toBe('0.00');
  });
});

describe('toMoneyStringOrNull', () => {
  it('giữ nguyên null cho cột cho phép rỗng', () => {
    expect(toMoneyStringOrNull(null)).toBeNull();
    expect(toMoneyStringOrNull(undefined)).toBeNull();
  });

  it('chuẩn hoá giá trị khác null', () => {
    expect(toMoneyStringOrNull('2990000')).toBe('2990000.00');
  });
});
