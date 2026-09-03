import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { hashToken } from '../../src/common/security/tokens';
import { api, loginAs, SEED_PASSWORD, uniqueEmail, url } from '../helpers/api';

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

/**
 * Token thật chỉ đi qua email nên test không đọc được. Thay vào đó ta tự sinh
 * token, ghi hash vào database giống hệt cách service làm, rồi dùng nó.
 */
async function issueTokenFor(userId: string, options: { expiresInMs?: number } = {}) {
  const token = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`.padEnd(43, 'x');
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + (options.expiresInMs ?? 15 * 60 * 1000)),
    },
  });
  return token;
}

async function createUser(prefix: string) {
  const email = uniqueEmail(prefix);
  const response = await api()
    .post(url('/auth/register'))
    .send({ email, password: SEED_PASSWORD, fullName: 'Người Dùng Test' })
    .expect(201);
  return { email, id: response.body.data.user.id as string };
}

describe('POST /auth/forgot-password', () => {
  it('trả về CÙNG một phản hồi cho email có thật và email không tồn tại', async () => {
    // Khác biệt bất kỳ ở đây đều biến endpoint này thành công cụ liệt kê tài khoản.
    const existing = await api()
      .post(url('/auth/forgot-password'))
      .send({ email: 'khach1@example.com' })
      .expect(200);

    const missing = await api()
      .post(url('/auth/forgot-password'))
      .send({ email: uniqueEmail('khongtontai') })
      .expect(200);

    expect(existing.body).toEqual(missing.body);
  });

  it('vô hiệu hoá token cũ khi phát token mới', async () => {
    // Bấm "quên mật khẩu" ba lần không được để lại ba liên kết cùng sống.
    const user = await createUser('nhieutoken');

    await api().post(url('/auth/forgot-password')).send({ email: user.email }).expect(200);
    await api().post(url('/auth/forgot-password')).send({ email: user.email }).expect(200);

    const unused = await prisma.passwordResetToken.count({
      where: { userId: user.id, usedAt: null },
    });
    expect(unused).toBe(1);
  });
});

describe('POST /auth/reset-password', () => {
  it('đổi được mật khẩu và đăng nhập bằng mật khẩu mới', async () => {
    const user = await createUser('doimatkhau');
    const token = await issueTokenFor(user.id);
    const newPassword = 'MatKhauMoi@456';

    await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: newPassword })
      .expect(200);

    await api()
      .post(url('/auth/login'))
      .send({ email: user.email, password: newPassword })
      .expect(200);

    await api()
      .post(url('/auth/login'))
      .send({ email: user.email, password: SEED_PASSWORD })
      .expect(401);
  });

  it('thu hồi MỌI phiên đăng nhập sau khi đổi mật khẩu', async () => {
    // Kịch bản đặt lại mật khẩu thường bắt nguồn từ việc tài khoản đã bị chiếm.
    // Đổi mật khẩu mà để phiên cũ sống tiếp thì kẻ chiếm quyền vẫn ở nguyên bên trong.
    const user = await createUser('thuhoiphien');
    const session = await loginAs(user.email);
    const token = await issueTokenFor(user.id);

    await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: 'MatKhauMoi@456' })
      .expect(200);

    const response = await api()
      .post(url('/auth/refresh'))
      .set('Cookie', session.cookie)
      .expect(401);
    expect(response.body.error.code).toBe('AUTH_REFRESH_TOKEN_INVALID');
  });

  it('token chỉ dùng được MỘT lần', async () => {
    const user = await createUser('motlan');
    const token = await issueTokenFor(user.id);

    await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: 'MatKhauMoi@456' })
      .expect(200);

    const second = await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: 'MatKhauKhac@789' })
      .expect(400);

    expect(second.body.error.code).toBe('AUTH_RESET_TOKEN_INVALID');
  });

  it('từ chối token đã hết hạn', async () => {
    const user = await createUser('hethan');
    const token = await issueTokenFor(user.id, { expiresInMs: -1000 });

    const response = await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: 'MatKhauMoi@456' })
      .expect(400);

    expect(response.body.error.code).toBe('AUTH_RESET_TOKEN_EXPIRED');
  });

  it('từ chối token bịa đặt', async () => {
    const response = await api()
      .post(url('/auth/reset-password'))
      .send({ token: 'x'.repeat(43), password: 'MatKhauMoi@456' })
      .expect(400);

    expect(response.body.error.code).toBe('AUTH_RESET_TOKEN_INVALID');
  });

  it('vẫn áp quy tắc độ mạnh cho mật khẩu mới', async () => {
    const user = await createUser('matkhauyeu');
    const token = await issueTokenFor(user.id);

    const response = await api()
      .post(url('/auth/reset-password'))
      .send({ token, password: 'yeuqua' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });
});
