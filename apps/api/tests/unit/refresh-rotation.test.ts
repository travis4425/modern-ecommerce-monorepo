import { decideRotation, type StoredRefreshToken } from '../../src/domains/auth/refresh-rotation';

function token(overrides: Partial<StoredRefreshToken> = {}): StoredRefreshToken {
  return {
    id: 'token-1',
    userId: 'user-1',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    revokedAt: null,
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

  it('token ĐÃ thu hồi được dùng lại thì thu hồi cả family', () => {
    // Trong luồng bình thường điều này bất khả: mỗi token dùng đúng một lần.
    // Xảy ra nghĩa là hai bên cùng giữ token — gần như chắc chắn đã bị đánh cắp.
    const decision = decideRotation(token({ revokedAt: new Date() }));
    expect(decision).toEqual({
      action: 'revoke_family',
      familyId: 'family-1',
      userId: 'user-1',
    });
  });

  it('vừa thu hồi vừa quá hạn thì vẫn báo bị đánh cắp', () => {
    // Thứ tự kiểm tra quan trọng: tín hiệu bị đánh cắp giá trị hơn tín hiệu hết hạn.
    const decision = decideRotation(
      token({ revokedAt: new Date(), expiresAt: new Date(Date.now() - 1000) }),
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
