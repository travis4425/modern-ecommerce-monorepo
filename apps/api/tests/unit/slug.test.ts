import { slugify, uniqueSlug } from '@ecom/shared';

describe('slugify', () => {
  it.each([
    ['Bàn phím cơ', 'ban-phim-co'],
    ['Ổ cứng SSD', 'o-cung-ssd'],
    ['Tai nghe chụp tai', 'tai-nghe-chup-tai'],
    ['Đèn nền RGB', 'den-nen-rgb'],
    ['Akko 3068B Plus World Tour Tokyo', 'akko-3068b-plus-world-tour-tokyo'],
    ['Keychron K8 Pro QMK/VIA', 'keychron-k8-pro-qmk-via'],
    ['Hub & Dock', 'hub-dock'],
  ])('%p -> %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('xử lý được chữ đ và Đ, thứ mà chuẩn hoá NFD không tách được', () => {
    // 'đ' không phải 'd' cộng dấu phụ nên NFD để nguyên — phải thay tay.
    expect(slugify('Đồng hồ đo điện')).toBe('dong-ho-do-dien');
  });

  it('không để lại dấu gạch ở đầu hoặc cuối', () => {
    expect(slugify('  --- Bàn phím ---  ')).toBe('ban-phim');
    expect(slugify('!!!')).toBe('');
  });

  it('gộp nhiều ký tự không hợp lệ liên tiếp thành một gạch', () => {
    expect(slugify('Chuột   gaming / văn phòng')).toBe('chuot-gaming-van-phong');
  });
});

describe('uniqueSlug', () => {
  it('giữ nguyên khi chưa có ai dùng', () => {
    expect(uniqueSlug('ban-phim', new Set())).toBe('ban-phim');
  });

  it('thêm hậu tố 2 khi đã trùng', () => {
    expect(uniqueSlug('ban-phim', new Set(['ban-phim']))).toBe('ban-phim-2');
  });

  it('nhảy qua các hậu tố đã bị chiếm', () => {
    expect(uniqueSlug('ban-phim', new Set(['ban-phim', 'ban-phim-2', 'ban-phim-3']))).toBe(
      'ban-phim-4',
    );
  });

  it('không nhầm slug khác có cùng tiền tố', () => {
    // 'ban-phim-co' KHÔNG được coi là chiếm chỗ của 'ban-phim'.
    expect(uniqueSlug('ban-phim', new Set(['ban-phim-co', 'ban-phim-khong-day']))).toBe('ban-phim');
  });
});
