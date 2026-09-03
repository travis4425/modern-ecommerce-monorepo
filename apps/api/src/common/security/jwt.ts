import jwt, { type SignOptions } from 'jsonwebtoken';
import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';
import { env } from '../../config/env';

/**
 * Nội dung access token.
 *
 * Quyền được nhúng thẳng vào token để mỗi request không phải join ba bảng
 * (users → roles → role_permissions). Cái giá là quyền có thể cũ tối đa bằng
 * tuổi thọ access token — 15 phút. Đổi quyền cho ai đó thì trong vòng 15 phút
 * họ vẫn dùng quyền cũ. Đây là đánh đổi có ý thức; nếu cần hiệu lực tức thì thì
 * phải chuyển sang tra quyền từ database mỗi request.
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
}

interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: 'ecom-api',
    audience: 'ecom-web',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

/**
 * Xác thực access token.
 *
 * `issuer` và `audience` được kiểm bắt buộc: nếu sau này có thêm loại token
 * khác ký bằng cùng khoá, việc kiểm hai trường này ngăn token của hệ thống
 * khác được dùng nhầm ở đây.
 */
export function verifyAccessToken(token: string): DecodedAccessToken {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'ecom-api',
      audience: 'ecom-web',
    }) as DecodedAccessToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Access token expired', 401);
    }
    throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'Access token is not valid', 401);
  }
}

/**
 * Tách token khỏi header `Authorization: Bearer <token>`.
 * Trả null nếu thiếu hoặc sai định dạng — tầng gọi quyết định có bắt buộc hay không.
 */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/** Số giây sống của access token, gửi cho frontend để nó chủ động làm mới trước hạn. */
export function accessTokenLifetimeSeconds(): number {
  const decoded = jwt.decode(
    signAccessToken({ sub: '', email: '', role: '', permissions: [] }),
  ) as {
    iat: number;
    exp: number;
  };
  return decoded.exp - decoded.iat;
}
