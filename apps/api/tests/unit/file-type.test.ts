import { ALLOWED_IMAGE_MIMES, detectImageType } from '../../src/common/upload/file-type';

/** Ghép chữ ký thật rồi độn cho đủ độ dài tối thiểu — nội dung phía sau không quan trọng. */
function withHeader(bytes: number[], length = 32): Buffer {
  const buffer = Buffer.alloc(length);
  Buffer.from(bytes).copy(buffer);
  return buffer;
}

const ascii = (text: string) => Array.from(text, (character) => character.charCodeAt(0));

describe('detectImageType — nhận dạng theo chữ ký byte', () => {
  it('nhận ra JPEG', () => {
    expect(detectImageType(withHeader([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('nhận ra PNG', () => {
    expect(detectImageType(withHeader([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({
      mime: 'image/png',
      extension: 'png',
    });
  });

  it('nhận ra WebP', () => {
    // RIFF + 4 byte độ dài (bất kỳ) + WEBP
    const bytes = [...ascii('RIFF'), 0x1a, 0x00, 0x00, 0x00, ...ascii('WEBP')];
    expect(detectImageType(withHeader(bytes))).toEqual({ mime: 'image/webp', extension: 'webp' });
  });

  it('nhận ra AVIF', () => {
    const bytes = [0x00, 0x00, 0x00, 0x20, ...ascii('ftyp'), ...ascii('avif')];
    expect(detectImageType(withHeader(bytes))).toEqual({ mime: 'image/avif', extension: 'avif' });
  });

  it('TỪ CHỐI SVG — là XML, chứa được <script>, phục vụ lại từ origin của mình là XSS lưu trữ', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(detectImageType(svg)).toBeNull();
  });

  it('từ chối GIF — không nằm trong danh sách cho phép', () => {
    expect(detectImageType(withHeader(ascii('GIF89a')))).toBeNull();
  });

  it('từ chối tệp văn bản dù được đặt tên .png', () => {
    expect(detectImageType(Buffer.from('day khong phai anh, chi la chu thoi'))).toBeNull();
  });

  it('từ chối buffer rỗng và buffer quá ngắn để kết luận', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    // Đúng 8 byte đầu của PNG nhưng thiếu phần còn lại: chưa đủ để kết luận.
    expect(
      detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBeNull();
  });

  it('RIFF không phải WEBP thì bị từ chối', () => {
    // File WAV cũng bắt đầu bằng RIFF — chỉ bốn byte đầu là không đủ.
    const wav = [...ascii('RIFF'), 0x1a, 0x00, 0x00, 0x00, ...ascii('WAVE')];
    expect(detectImageType(withHeader(wav))).toBeNull();
  });

  it('danh sách MIME cho phép không chứa svg hay gif', () => {
    expect(ALLOWED_IMAGE_MIMES).not.toContain('image/svg+xml');
    expect(ALLOWED_IMAGE_MIMES).not.toContain('image/gif');
    expect(ALLOWED_IMAGE_MIMES).toContain('image/png');
  });
});
