import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { api, bearer, loginAs, SEED_PASSWORD, uniqueEmail, url } from '../helpers/api';

/**
 * Test tích hợp — cần PostgreSQL đang chạy VÀ đã seed.
 *
 *   pnpm db:up && pnpm db:reset && pnpm --filter @ecom/api test:integration
 *
 * Chúng gọi API thật qua Supertest và đi xuống tới database thật, nên bắt được
 * những thứ test unit không thể: transaction, ràng buộc của database, và thứ tự
 * middleware.
 */
afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe('POST /auth/register', () => {
  it('tạo tài khoản và trả về access token kèm cookie refresh', async () => {
    const email = uniqueEmail('dangky');
    const response = await api()
      .post(url('/auth/register'))
      .send({ email, password: SEED_PASSWORD, fullName: 'Người Dùng Mới' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe('USER');
    expect(response.body.data.user.permissions).toEqual([]);
    expect(typeof response.body.data.accessToken).toBe('string');

    // Refresh token KHÔNG được xuất hiện trong body — nó chỉ đi bằng cookie.
    expect(response.body.data).not.toHaveProperty('refreshToken');

    const cookies = response.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Strict');
    expect(refreshCookie).toContain('Path=/api/v1/auth');
  });

  it('từ chối email đã tồn tại', async () => {
    const email = uniqueEmail('trung');
    const body = { email, password: SEED_PASSWORD, fullName: 'Người Dùng' };

    await api().post(url('/auth/register')).send(body).expect(201);
    const second = await api().post(url('/auth/register')).send(body).expect(409);

    expect(second.body.error.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');
  });

  it('coi email khác hoa thường là CÙNG một tài khoản', async () => {
    // Nếu chỗ này hỏng, ai đó có thể đăng ký bản sao viết hoa email của người
    // khác rồi mạo danh. Chặn ở hai lớp: Zod hạ chữ thường, và unique index
    // trên lower(email) trong database.
    const email = uniqueEmail('hoathuong');
    await api()
      .post(url('/auth/register'))
      .send({ email, password: SEED_PASSWORD, fullName: 'Người Dùng' })
      .expect(201);

    const upper = await api()
      .post(url('/auth/register'))
      .send({ email: email.toUpperCase(), password: SEED_PASSWORD, fullName: 'Kẻ Mạo Danh' })
      .expect(409);

    expect(upper.body.error.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');
  });

  it('từ chối mật khẩu yếu kèm chi tiết theo field', async () => {
    const response = await api()
      .post(url('/auth/register'))
      .send({ email: uniqueEmail('yeu'), password: 'yeuqua', fullName: 'Người Dùng' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'password')).toBe(
      true,
    );
  });
});

describe('POST /auth/login', () => {
  it('đăng nhập admin và trả về đủ 25 quyền', async () => {
    const response = await api()
      .post(url('/auth/login'))
      .send({ email: 'admin@example.com', password: SEED_PASSWORD })
      .expect(200);

    expect(response.body.data.user.role).toBe('ADMIN');
    expect(response.body.data.user.permissions.length).toBeGreaterThanOrEqual(25);
    expect(response.body.data.expiresIn).toBe(900);
  });

  it('trả cùng một mã lỗi cho sai mật khẩu và email không tồn tại', async () => {
    // Nếu hai trường hợp khác mã, endpoint này thành công cụ liệt kê tài khoản.
    const wrongPassword = await api()
      .post(url('/auth/login'))
      .send({ email: 'admin@example.com', password: 'SaiMatKhau@1' })
      .expect(401);

    const noSuchUser = await api()
      .post(url('/auth/login'))
      .send({ email: uniqueEmail('khongtontai'), password: 'SaiMatKhau@1' })
      .expect(401);

    expect(wrongPassword.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(noSuchUser.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('đăng nhập được bằng email viết hoa', async () => {
    await api()
      .post(url('/auth/login'))
      .send({ email: 'ADMIN@EXAMPLE.COM', password: SEED_PASSWORD })
      .expect(200);
  });
});

describe('GET /auth/me', () => {
  it('trả 401 khi không có token', async () => {
    const response = await api().get(url('/auth/me')).expect(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('trả 401 khi token bị sửa', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const tampered = `${accessToken.slice(0, -3)}aaa`;
    const response = await api()
      .get(url('/auth/me'))
      .set(...bearer(tampered))
      .expect(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('trả hồ sơ và không bao giờ lộ passwordHash', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const response = await api()
      .get(url('/auth/me'))
      .set(...bearer(accessToken))
      .expect(200);

    expect(response.body.data.email).toBe('admin@example.com');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('$2');
  });
});
