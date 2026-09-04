import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

/**
 * bcrypt chỉ đọc 72 byte đầu của mật khẩu và lặng lẽ bỏ phần còn lại. Zod đã
 * chặn ở 72 ký tự, nhưng ký tự tiếng Việt có dấu chiếm nhiều byte hơn một ký
 * tự, nên kiểm lại theo BYTE ở đây mới thật sự an toàn.
 */
const BCRYPT_MAX_BYTES = 72;

export async function hashPassword(plain: string): Promise<string> {
  if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_BYTES) {
    throw new Error('Mật khẩu vượt quá 72 byte, bcrypt sẽ cắt cụt');
  }
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

/**
 * So sánh mật khẩu. Luôn dùng bcrypt.compare chứ không so chuỗi hash trực tiếp:
 * hàm này so sánh theo thời gian hằng định, không rò rỉ thông tin qua thời gian
 * phản hồi.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash giả, sinh bằng ĐÚNG chi phí đang cấu hình.
 *
 * Trước đây đây là một chuỗi hash cứng cost 12. Sai lầm tinh vi: chi phí của
 * hash quyết định thời gian so sánh, nên hash cứng cost 12 mà hệ thống đang
 * chạy cost 10 sẽ khiến phép so giả tốn GẤP BỐN phép so thật — vẫn là chênh
 * lệch thời gian đo được, chỉ đảo chiều. Nó chỉ khớp khi BCRYPT_ROUNDS tình cờ
 * bằng 12.
 *
 * Sinh một lần rồi giữ lại, và khởi động sớm ngay khi nạp module để request
 * đầu tiên không phải trả giá cho lần sinh đó.
 */
let dummyHash: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('mat-khau-gia-de-ton-thoi-gian', env.BCRYPT_ROUNDS);
  return dummyHash;
}

// Làm nóng sẵn, không chặn tiến trình khởi động.
void getDummyHash();

/**
 * Tiêu tốn đúng lượng thời gian như khi so mật khẩu thật.
 *
 * Dùng khi không tìm thấy email lúc đăng nhập. Không có nó, request với email
 * không tồn tại trả về nhanh hơn hẳn request với email có thật, và kẻ tấn công
 * đo thời gian phản hồi là dò ra được email nào đã đăng ký.
 */
export async function fakePasswordCompare(): Promise<void> {
  await bcrypt.compare('mat-khau-gia-de-ton-thoi-gian', await getDummyHash());
}
