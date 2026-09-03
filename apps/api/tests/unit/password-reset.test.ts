import { decideReset, type StoredResetToken } from '../../src/domains/auth/password-reset';

function token(overrides: Partial<StoredResetToken> = {}): StoredResetToken {
  return {
    id: 'reset-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: null,
    ...overrides,
  };
}

describe('quyết định đặt lại mật khẩu', () => {
  it('token hợp lệ thì chấp nhận', () => {
    expect(decideReset(token()).action).toBe('accept');
  });

  it('token không tồn tại thì từ chối', () => {
    expect(decideReset(null).action).toBe('reject_unknown');
  });

  it('token đã dùng thì từ chối — chỉ dùng được MỘT lần', () => {
    expect(decideReset(token({ usedAt: new Date() })).action).toBe('reject_used');
  });

  it('token quá hạn thì từ chối', () => {
    expect(decideReset(token({ expiresAt: new Date(Date.now() - 1) })).action).toBe(
      'reject_expired',
    );
  });

  it('đã dùng thì ưu tiên hơn quá hạn', () => {
    expect(
      decideReset(token({ usedAt: new Date(), expiresAt: new Date(Date.now() - 1) })).action,
    ).toBe('reject_used');
  });
});
