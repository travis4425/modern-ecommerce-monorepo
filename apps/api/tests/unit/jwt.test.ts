import jwt from 'jsonwebtoken';
import {
  accessTokenLifetimeSeconds,
  extractBearerToken,
  signAccessToken,
  verifyAccessToken,
} from '../../src/common/security/jwt';

const payload = {
  sub: 'user-1',
  email: 'travis@example.com',
  role: 'ADMIN',
  permissions: ['order:read_all'],
};

describe('access token', () => {
  it('ký rồi xác thực lấy lại nguyên payload', () => {
    const decoded = verifyAccessToken(signAccessToken(payload));
    expect(decoded.sub).toBe('user-1');
    expect(decoded.permissions).toEqual(['order:read_all']);
  });

  it('từ chối token bị sửa dù chỉ một ký tự', () => {
    const token = signAccessToken(payload);
    const tampered = `${token.slice(0, -3)}${token.slice(-3) === 'aaa' ? 'bbb' : 'aaa'}`;
    expect(() => verifyAccessToken(tampered)).toThrow(
      expect.objectContaining({ code: 'AUTH_TOKEN_INVALID' }),
    );
  });

  it('từ chối token ký bằng khoá khác', () => {
    const alien = jwt.sign(payload, 'mot-khoa-hoan-toan-khac-dai-hon-32-ky-tu', {
      issuer: 'ecom-api',
      audience: 'ecom-web',
    });
    expect(() => verifyAccessToken(alien)).toThrow();
  });

  it('từ chối token sai issuer', () => {
    const wrongIssuer = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
      issuer: 'he-thong-khac',
      audience: 'ecom-web',
    });
    expect(() => verifyAccessToken(wrongIssuer)).toThrow();
  });

  it('phân biệt hết hạn với không hợp lệ', () => {
    const expired = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
      issuer: 'ecom-api',
      audience: 'ecom-web',
      expiresIn: '-1s',
    });
    // Frontend cần phân biệt hai mã này: hết hạn thì gọi /refresh, còn không
    // hợp lệ thì phải đăng nhập lại.
    expect(() => verifyAccessToken(expired)).toThrow(
      expect.objectContaining({ code: 'AUTH_TOKEN_EXPIRED' }),
    );
  });

  it('báo đúng tuổi thọ token cho frontend', () => {
    expect(accessTokenLifetimeSeconds()).toBe(900);
  });

  it.each([
    ['Bearer abc123', 'abc123'],
    ['bearer abc123', 'abc123'],
    ['Basic abc123', null],
    ['Bearer', null],
    ['', null],
    [undefined, null],
  ])('extractBearerToken(%p) -> %p', (header, expected) => {
    expect(extractBearerToken(header as string | undefined)).toBe(expected);
  });
});
