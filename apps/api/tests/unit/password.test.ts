import {
  fakePasswordCompare,
  hashPassword,
  verifyPassword,
} from '../../src/common/security/password';

describe('băm mật khẩu', () => {
  it('sinh hash khác nhau cho cùng một mật khẩu (có salt ngẫu nhiên)', async () => {
    const [a, b] = await Promise.all([hashPassword('Password@123'), hashPassword('Password@123')]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^\$2[aby]\$/);
  });

  it('xác thực đúng mật khẩu', async () => {
    expect(await verifyPassword('Password@123', await hashPassword('Password@123'))).toBe(true);
  });

  it('từ chối sai mật khẩu', async () => {
    expect(await verifyPassword('SaiMatKhau@1', await hashPassword('Password@123'))).toBe(false);
  });

  it('chặn mật khẩu vượt 72 BYTE, không phải 72 ký tự', async () => {
    // 'Mật' chiếm 4 byte UTF-8 nhưng chỉ là 3 ký tự. Đếm ký tự sẽ lọt, và bcrypt
    // lặng lẽ cắt cụt — hai mật khẩu dài khác nhau sẽ cùng cho một hash.
    const longPassword = 'Mật'.repeat(30);
    expect(longPassword.length).toBeLessThan(100);
    expect(Buffer.byteLength(longPassword, 'utf8')).toBeGreaterThan(72);
    await expect(hashPassword(longPassword)).rejects.toThrow(/72 byte/);
  });

  it('phép so giả tốn thời gian tương đương phép so thật', async () => {
    const hash = await hashPassword('Password@123');

    // Gọi trước một lần để hash giả được sinh xong, nếu không lần đo đầu tiên
    // sẽ tính cả thời gian sinh hash chứ không chỉ thời gian so sánh.
    await fakePasswordCompare();

    const t0 = process.hrtime.bigint();
    await fakePasswordCompare();
    const fake = Number(process.hrtime.bigint() - t0) / 1e6;

    const t1 = process.hrtime.bigint();
    await verifyPassword('SaiMatKhau@1', hash);
    const real = Number(process.hrtime.bigint() - t1) / 1e6;

    // Không có bước này, request với email không tồn tại trả về nhanh hơn hẳn,
    // và kẻ tấn công đo thời gian là liệt kê được email đã đăng ký.
    //
    // Khoảng cho phép hẹp (0.5–2 lần) là có chủ ý: nó bắt được cả trường hợp
    // hash giả bị sinh ở chi phí khác với chi phí đang cấu hình — chênh một bậc
    // bcrypt là gấp đôi thời gian, và test này phải đỏ khi điều đó xảy ra.
    expect(fake / real).toBeGreaterThan(0.5);
    expect(fake / real).toBeLessThan(2);
  });
});
