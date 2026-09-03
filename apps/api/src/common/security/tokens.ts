import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Refresh token và token đặt lại mật khẩu là chuỗi ngẫu nhiên mờ, KHÔNG phải JWT.
 *
 * Lý do: JWT tự chứng thực nên không thể thu hồi trước hạn. Còn token mờ thì
 * chỉ có giá trị khi tồn tại một dòng tương ứng trong database — xoá dòng đó là
 * token chết ngay lập tức. Đó là điều kiện cần để làm rotation và thu hồi.
 */
const TOKEN_BYTES = 32; // 256 bit

export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Database chỉ lưu HASH của token, không bao giờ lưu token thô.
 *
 * Dùng SHA-256 chứ không bcrypt: token đã có 256 bit ngẫu nhiên nên không thể
 * dò bằng từ điển, và mỗi lần làm mới đều phải tra cứu — bcrypt sẽ khiến thao
 * tác này chậm một cách vô ích.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** So sánh hai hash theo thời gian hằng định. */
export function safeCompareHash(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
