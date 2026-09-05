/**
 * Định dạng để HIỂN THỊ. Kết quả của những hàm này không bao giờ được đưa ngược
 * vào tính toán.
 *
 * Tiền đi từ backend xuống dưới dạng CHUỖI và giữ nguyên chuỗi suốt đường —
 * numeric(12,2) của Postgres vượt độ chính xác an toàn của số dấu phẩy động
 * JavaScript. Ở đúng bước cuối cùng, ngay trước khi vẽ ra màn hình, ta mới đổi
 * sang number cho Intl.NumberFormat.
 *
 * Vì sao bước đó an toàn: numeric(12,2) tối đa là 10 chữ số phần nguyên, tức
 * dưới 10^10, còn số nguyên an toàn của JavaScript là 2^53 ≈ 9×10^15. Không có
 * sai số. Nếu sau này cột tiền nới rộng hơn, chỗ này phải đổi sang thư viện
 * decimal — nên ràng buộc được ghi lại ngay đây.
 */

/** Bộ định dạng được ghi nhớ: dựng Intl.NumberFormat là thao tác đắt. */
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(locale: string): Intl.NumberFormat {
  const cached = moneyFormatters.get(locale);
  if (cached) return cached;

  const created = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    style: 'currency',
    currency: 'VND',
    // Đồng Việt Nam không dùng phần thập phân. Để mặc định thì Intl in ra
    // "1.990.000,00 ₫", vừa dài vừa sai quy ước.
    maximumFractionDigits: 0,
  });

  moneyFormatters.set(locale, created);
  return created;
}

export function formatMoney(value: string, locale: string): string {
  const amount = Number(value);
  // Chuỗi hỏng thì trả về nguyên trạng, tuyệt đối không in ra "NaN ₫".
  if (!Number.isFinite(amount)) return value;
  return moneyFormatter(locale).format(amount);
}

/** Phần trăm giảm giá, làm tròn xuống — không bao giờ hứa hẹn nhiều hơn thực tế. */
export function discountPercent(price: string, compareAtPrice: string | null): number | null {
  if (!compareAtPrice) return null;

  const now = Number(price);
  const before = Number(compareAtPrice);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= now) return null;

  return Math.floor(((before - now) / before) * 100);
}

/** Điểm đánh giá dạng '4.50' → '4,5' (vi) hoặc '4.5' (en). */
export function formatRating(value: string, locale: string): string {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return value;
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN').format(value);
}
