import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ecom/shared';

describe('schema xác thực dùng chung', () => {
  it('chuẩn hoá email: cắt khoảng trắng và hạ về chữ thường', () => {
    // Postgres phân biệt hoa thường. Không chuẩn hoá thì 'A@x.com' và 'a@x.com'
    // thành hai tài khoản khác nhau cho cùng một người.
    const parsed = registerSchema.parse({
      email: '  TRAVIS@Example.COM  ',
      password: 'Password@123',
      fullName: 'Travis',
    });
    expect(parsed.email).toBe('travis@example.com');
  });

  it.each([
    ['password', 'PASSWORD_NEEDS_UPPERCASE'],
    ['PASSWORD', 'PASSWORD_NEEDS_LOWERCASE'],
    ['Password', 'PASSWORD_NEEDS_DIGIT'],
    ['Pass1', 'PASSWORD_TOO_SHORT'],
  ])('từ chối mật khẩu %p kèm mã %p', (password, code) => {
    const result = registerSchema.safeParse({
      email: 'a@example.com',
      password,
      fullName: 'Người dùng',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(code);
    }
  });

  it('chặn mật khẩu dài quá 72 ký tự ngay tại schema', () => {
    const result = registerSchema.safeParse({
      email: 'a@example.com',
      password: `Aa1${'x'.repeat(80)}`,
      fullName: 'Người dùng',
    });
    expect(result.success).toBe(false);
  });

  it('đăng nhập KHÔNG áp quy tắc độ mạnh', () => {
    // Áp quy tắc ở màn đăng nhập là tiết lộ quy tắc cho kẻ dò mật khẩu, và làm
    // hỏng đăng nhập của tài khoản cũ đặt theo quy tắc trước đây.
    expect(loginSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true);
  });

  it.each(['123', '0912345', '+84912345678', '912345678'])('từ chối số điện thoại %p', (phone) => {
    const result = registerSchema.safeParse({
      email: 'a@example.com',
      password: 'Password@123',
      fullName: 'Người dùng',
      phone,
    });
    expect(result.success).toBe(false);
  });

  it('chấp nhận số điện thoại Việt Nam 10 chữ số', () => {
    expect(
      registerSchema.safeParse({
        email: 'a@example.com',
        password: 'Password@123',
        fullName: 'Người dùng',
        phone: '0912345678',
      }).success,
    ).toBe(true);
  });

  it('forgot-password cũng chuẩn hoá email giống lúc đăng ký', () => {
    expect(forgotPasswordSchema.parse({ email: 'A@Example.COM' }).email).toBe('a@example.com');
  });

  it('reset-password đòi token đủ dài và mật khẩu đủ mạnh', () => {
    expect(resetPasswordSchema.safeParse({ token: 'ngan', password: 'Password@123' }).success).toBe(
      false,
    );
    expect(resetPasswordSchema.safeParse({ token: 'x'.repeat(43), password: 'yeu' }).success).toBe(
      false,
    );
    expect(
      resetPasswordSchema.safeParse({ token: 'x'.repeat(43), password: 'Password@123' }).success,
    ).toBe(true);
  });
});
