import { decideRotation, type StoredRefreshToken } from '../../src/domains/auth/refresh-rotation';

function token(overrides: Partial<StoredRefreshToken> = {}): StoredRefreshToken {
  return {
    id: 'token-1',
    userId: 'user-1',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    revokedAt: null,
    replacedById: null,
    ...overrides,
  };
}

describe('quyết định xoay refresh token', () => {
  it('token hợp lệ thì xoay', () => {
    expect(decideRotation(token()).action).toBe('rotate');
  });

  it('không có bản ghi thì từ chối', () => {
    expect(decideRotation(null).action).toBe('reject_unknown');
  });

  it('token quá hạn thì từ chối', () => {
    expect(decideRotation(token({ expiresAt: new Date(Date.now() - 1000) })).action).toBe(
      'reject_expired',
    );
  });

  it('token ĐÃ XOAY mà được dùng lại thì thu hồi cả family', () => {
    // replacedById khác null nghĩa là token này từng được dùng thành công một
    // lần rồi. Nó xuất hiện lần nữa nghĩa là có hai bên cùng giữ nó.
    const decision = decideRotation(token({ revokedAt: new Date(), replacedById: 'token-2' }));
    expect(decision).toEqual({
      action: 'revoke_family',
      familyId: 'family-1',
      userId: 'user-1',
    });
  });

  it('token thu hồi do ĐĂNG XUẤT thì KHÔNG báo bị đánh cắp', () => {
    // Đây là phân biệt then chốt. Đăng xuất thu hồi token mà không đặt
    // replacedById. Gộp chung với trường hợp trên sẽ khiến mọi lần đăng xuất
    // bình thường bắn ra một cảnh báo bảo mật giả — và cảnh báo giả nhiều thì
    // cảnh báo thật cũng bị bỏ qua.
    const decision = decideRotation(token({ revokedAt: new Date(), replacedById: null }));
    expect(decision.action).toBe('reject_revoked');
  });

  it('token chết theo family cũng chỉ là reject_revoked', () => {
    // Khi cả family bị thu hồi, token mới nhất chưa từng được xoay nên
    // replacedById của nó vẫn null. Chủ tài khoản không làm gì sai.
    expect(decideRotation(token({ revokedAt: new Date() })).action).toBe('reject_revoked');
  });

  it('vừa xoay vừa quá hạn thì vẫn báo bị đánh cắp', () => {
    // Thứ tự kiểm tra quan trọng: tín hiệu bị đánh cắp giá trị hơn tín hiệu hết hạn.
    const decision = decideRotation(
      token({
        revokedAt: new Date(),
        replacedById: 'token-2',
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    expect(decision.action).toBe('revoke_family');
  });

  it('hết hạn đúng thời điểm hiện tại thì tính là quá hạn', () => {
    const now = new Date();
    expect(decideRotation(token({ expiresAt: now }), now).action).toBe('reject_expired');
  });

  it('còn đúng một mili giây thì vẫn xoay được', () => {
    const now = new Date();
    expect(decideRotation(token({ expiresAt: new Date(now.getTime() + 1) }), now).action).toBe(
      'rotate',
    );
  });
});
