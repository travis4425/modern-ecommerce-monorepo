import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { api, loginAs, url } from '../helpers/api';

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe('xoay refresh token và phát hiện đánh cắp', () => {
  it('mỗi lần làm mới sinh refresh token MỚI', async () => {
    const { cookie } = await loginAs('khach1@example.com');

    const response = await api().post(url('/auth/refresh')).set('Cookie', cookie).expect(200);

    const newCookies = response.headers['set-cookie'] as unknown as string[];
    expect(newCookies.find((c) => c.startsWith('refreshToken='))).not.toBe(
      cookie.find((c) => c.startsWith('refreshToken=')),
    );
    expect(typeof response.body.data.accessToken).toBe('string');
  });

  it('dùng lại token CŨ thì thu hồi cả family', async () => {
    const { cookie: original } = await loginAs('khach1@example.com');

    // Lần một: hợp lệ, token bị xoay.
    const rotated = await api().post(url('/auth/refresh')).set('Cookie', original).expect(200);
    const rotatedCookie = rotated.headers['set-cookie'] as unknown as string[];

    // Lần hai với token CŨ: đây là điều không thể xảy ra trong luồng bình
    // thường, nên hệ thống coi là token đã bị đánh cắp.
    const reused = await api().post(url('/auth/refresh')).set('Cookie', original).expect(401);
    expect(reused.body.error.code).toBe('AUTH_REFRESH_TOKEN_REUSED');

    // Và token MỚI cũng phải chết theo — cả family bị thu hồi, kẻ trộm lẫn
    // người dùng thật đều phải đăng nhập lại.
    //
    // Mã ở đây là INVALID chứ không phải REUSED: token này chưa từng được dùng
    // lại, nó chỉ chết theo family. Phân biệt hai mã giữ cho cảnh báo "bị đánh
    // cắp" chỉ nổ đúng lúc thật sự có token bị dùng hai lần.
    const afterRevoke = await api()
      .post(url('/auth/refresh'))
      .set('Cookie', rotatedCookie)
      .expect(401);
    expect(afterRevoke.body.error.code).toBe('AUTH_REFRESH_TOKEN_INVALID');
  });

  it('thu hồi một family KHÔNG ảnh hưởng phiên đăng nhập khác', async () => {
    // Mỗi lần đăng nhập mở một family riêng, nên phát hiện trộm ở điện thoại
    // không được đá luôn phiên trên laptop.
    const phone = await loginAs('khach2@example.com');
    const laptop = await loginAs('khach2@example.com');

    await api().post(url('/auth/refresh')).set('Cookie', phone.cookie).expect(200);
    await api().post(url('/auth/refresh')).set('Cookie', phone.cookie).expect(401);

    // Phiên laptop vẫn phải sống bình thường.
    await api().post(url('/auth/refresh')).set('Cookie', laptop.cookie).expect(200);
  });

  it('thiếu cookie thì báo đúng mã lỗi', async () => {
    const response = await api().post(url('/auth/refresh')).expect(401);
    expect(response.body.error.code).toBe('AUTH_REFRESH_TOKEN_MISSING');
  });

  it('đăng xuất làm refresh token chết ngay', async () => {
    const { cookie } = await loginAs('khach1@example.com');

    await api().post(url('/auth/logout')).set('Cookie', cookie).expect(200);

    const afterLogout = await api().post(url('/auth/refresh')).set('Cookie', cookie).expect(401);
    expect(afterLogout.body.error.code).toBe('AUTH_REFRESH_TOKEN_INVALID');
  });

  it('đăng xuất không kèm cookie vẫn thành công', async () => {
    // Đăng xuất phải luôn thành công. Báo lỗi chỉ khiến người dùng mắc kẹt.
    await api().post(url('/auth/logout')).expect(200);
  });
});
