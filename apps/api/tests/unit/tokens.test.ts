import { generateOpaqueToken, hashToken, safeCompareHash } from '../../src/common/security/tokens';

describe('token mờ', () => {
  it('không sinh trùng trong 2000 lần', () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(2000);
  });

  it('mã hoá 256 bit entropy', () => {
    // 32 byte ngẫu nhiên, base64url không đệm => 43 ký tự
    expect(generateOpaqueToken()).toHaveLength(43);
  });

  it('hash ổn định và không phải chính token', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('token khác nhau cho hash khác nhau', () => {
    expect(hashToken(generateOpaqueToken())).not.toBe(hashToken(generateOpaqueToken()));
  });

  it('safeCompareHash so đúng và xử lý được độ dài lệch', () => {
    const hash = hashToken('abc');
    expect(safeCompareHash(hash, hashToken('abc'))).toBe(true);
    expect(safeCompareHash(hash, hashToken('xyz'))).toBe(false);
    expect(safeCompareHash(hash, 'abcd')).toBe(false);
  });
});
