/**
 * Nhận dạng ảnh bằng CHỮ KÝ BYTE, không bằng lời khai của client.
 *
 * Content-Type trong multipart và phần mở rộng tên tệp đều do người gửi tự đặt.
 * Đổi tên `payload.svg` thành `anh.png` và khai `image/png` là việc của một
 * dòng lệnh; nếu chỉ tin lời khai thì tệp đó được lưu lại rồi phục vụ từ chính
 * origin của chúng ta — nghĩa là XSS lưu trữ, kẻ tấn công chạy JavaScript dưới
 * tên miền của cửa hàng và đọc được mọi thứ trang quản trị đang mở.
 *
 * Vì vậy danh sách dưới đây cố tình KHÔNG có:
 *  - SVG: là XML, chứa được <script>. Không có cách nào làm nó an toàn ngoài
 *    việc lọc lại toàn bộ nội dung, và đó là cuộc chơi không thắng được.
 *  - GIF: cửa hàng không cần ảnh động, mà thêm một định dạng là thêm một bề mặt.
 *
 * Hàm này THUẦN: nhận Buffer, trả kết quả, không đọc đĩa, không đụng request —
 * nên test được trực tiếp bằng vài chục byte dựng tay.
 */

export interface DetectedImageType {
  /** MIME thật, suy ra từ nội dung. Đây mới là giá trị được lưu và phục vụ lại. */
  mime: string;
  /** Phần mở rộng chuẩn hoá, dùng đặt tên tệp trên đĩa. */
  extension: string;
}

/** Số byte tối thiểu cần đọc để kết luận được. */
const HEADER_BYTES = 12;

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString('latin1');
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const SIGNATURES: Array<{
  type: DetectedImageType;
  matches: (buffer: Buffer) => boolean;
}> = [
  {
    type: { mime: 'image/jpeg', extension: 'jpg' },
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: { mime: 'image/png', extension: 'png' },
    matches: (b) => b.subarray(0, 8).equals(PNG_MAGIC),
  },
  {
    // RIFF....WEBP — bốn byte ở giữa là độ dài, không kiểm.
    type: { mime: 'image/webp', extension: 'webp' },
    matches: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  },
  {
    // Hộp ISO-BMFF: [4 byte độ dài]['ftyp'][brand]. 'avis' là AVIF chuỗi ảnh.
    type: { mime: 'image/avif', extension: 'avif' },
    matches: (b) => ascii(b, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(b, 8, 12)),
  },
];

/** Trả về kiểu ảnh nhận ra được, hoặc null nếu nội dung không thuộc danh sách cho phép. */
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < HEADER_BYTES) return null;
  return SIGNATURES.find((signature) => signature.matches(buffer))?.type ?? null;
}

/** Danh sách MIME được chấp nhận, để in ra trong thông báo lỗi và tài liệu API. */
export const ALLOWED_IMAGE_MIMES = SIGNATURES.map((signature) => signature.type.mime);
