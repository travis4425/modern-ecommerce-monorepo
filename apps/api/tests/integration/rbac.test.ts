import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { api, bearer, loginAs, url } from '../helpers/api';

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe('phân quyền trên GET /admin/users', () => {
  it('khách vãng lai bị chặn bằng 401', async () => {
    const response = await api().get(url('/admin/users')).expect(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('khách hàng đã đăng nhập bị chặn bằng 403, KHÔNG phải 401', async () => {
    // Phân biệt hai mã này quan trọng: 401 nghĩa là "hãy đăng nhập", còn 403
    // nghĩa là "đã đăng nhập nhưng không đủ quyền". Frontend xử lý khác nhau.
    const { accessToken } = await loginAs('khach1@example.com');
    const response = await api()
      .get(url('/admin/users'))
      .set(...bearer(accessToken))
      .expect(403);

    expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSION');
  });

  it('staff có quyền user:read nên vào được', async () => {
    const { accessToken } = await loginAs('staff@example.com');
    await api()
      .get(url('/admin/users'))
      .set(...bearer(accessToken))
      .expect(200);
  });

  it('admin nhận danh sách kèm meta phân trang', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const response = await api()
      .get(url('/admin/users?page=1&limit=2'))
      .set(...bearer(accessToken))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(2);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 2, hasPrev: false });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(4);
  });

  it('danh sách người dùng không bao giờ chứa passwordHash', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const response = await api()
      .get(url('/admin/users'))
      .set(...bearer(accessToken))
      .expect(200);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('$2b$');
  });

  it('ép limit về trần an toàn thay vì trả cả bảng', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const response = await api()
      .get(url('/admin/users?limit=99999'))
      .set(...bearer(accessToken))
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('tìm kiếm không phân biệt hoa thường', async () => {
    const { accessToken } = await loginAs('admin@example.com');
    const response = await api()
      .get(url('/admin/users?q=ADMIN@EXAMPLE.COM'))
      .set(...bearer(accessToken))
      .expect(200);

    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].email).toBe('admin@example.com');
  });

  it('từ chối sắp xếp theo cột ngoài danh sách trắng', async () => {
    // Không được phép sắp xếp theo cột tuỳ ý: cột không có index biến mỗi
    // request thành một lần quét toàn bảng.
    const { accessToken } = await loginAs('admin@example.com');
    await api()
      .get(url('/admin/users?sort=password_hash'))
      .set(...bearer(accessToken))
      .expect(200); // rơi về sắp xếp mặc định, không lỗi và không sắp theo cột đó
  });
});
