import type { CookieOptions, Request, Response } from 'express';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@ecom/shared';
import { API_PREFIX } from '@ecom/shared';
import { sendSuccess } from '../../common/http/api-response';
import { env, isProduction } from '../../config/env';
import { resolveLocale } from '../../common/services/email-templates';
import * as authService from './auth.service';
import type { IssuedSession } from './auth.service';
import type { SessionMetadata } from './auth.types';

const REFRESH_COOKIE = 'refreshToken';

/**
 * Cấu hình cookie chứa refresh token — từng thuộc tính đều có lý do:
 *
 *  httpOnly  JavaScript không đọc được, nên XSS không lấy được token.
 *  sameSite  'strict' chặn CSRF: trình duyệt không gửi cookie này khi request
 *            xuất phát từ trang khác.
 *  secure    Chỉ gửi qua HTTPS. Tắt ở dev vì localhost chạy HTTP.
 *  path      Chỉ đính kèm vào các endpoint auth. Mọi request API khác không
 *            mang theo token này, giảm hẳn bề mặt rò rỉ.
 */
function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: `${API_PREFIX}/auth`,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function metadataOf(req: Request): SessionMetadata {
  const metadata: SessionMetadata = {};
  const userAgent = req.get('user-agent');
  if (userAgent) metadata.userAgent = userAgent.slice(0, 255);
  if (req.ip) metadata.ipAddress = req.ip;
  return metadata;
}

/** Đặt cookie rồi trả về phần còn lại. Refresh token KHÔNG bao giờ vào body. */
function respondWithSession(res: Response, session: IssuedSession, statusCode = 200): void {
  const { refreshToken, ...body } = session;
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  sendSuccess(res, body, statusCode);
}

export async function register(req: Request, res: Response): Promise<void> {
  const session = await authService.register(req.body as RegisterInput, metadataOf(req));
  respondWithSession(res, session, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const session = await authService.login(req.body as LoginInput, metadataOf(req));
  respondWithSession(res, session);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const session = await authService.refresh(cookies?.[REFRESH_COOKIE], metadataOf(req));
  respondWithSession(res, session);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  await authService.logout(cookies?.[REFRESH_COOKIE]);

  // clearCookie phải nhận ĐÚNG path đã dùng lúc đặt, nếu không trình duyệt giữ
  // nguyên cookie cũ và người dùng vẫn làm mới token được sau khi đăng xuất.
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  sendSuccess(res, { loggedOut: true });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const revoked = await authService.logoutAllDevices(req.auth!.sub);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  sendSuccess(res, { loggedOut: true, revokedSessions: revoked });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordInput;
  await authService.requestPasswordReset(email, resolveLocale(req.get('accept-language')));

  // Cùng một phản hồi cho mọi email, dù có tài khoản hay không. Đây là điều
  // duy nhất ngăn endpoint này bị dùng để liệt kê tài khoản.
  sendSuccess(res, {
    message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(
    req.body as ResetPasswordInput,
    resolveLocale(req.get('accept-language')),
  );

  // Mật khẩu đổi xong thì mọi phiên đều chết, kể cả phiên đang gọi request này.
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  sendSuccess(res, { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
}

export async function me(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await authService.getCurrentUser(req.auth!.sub));
}
