import { randomUUID } from 'node:crypto';
import { ERROR_CODES, type AuthSession, type AuthUser } from '@ecom/shared';
import { AppError, ConflictError } from '../../common/errors';
import { createLogger } from '../../common/logger';
import { fakePasswordCompare, hashPassword, verifyPassword } from '../../common/security/password';
import { generateOpaqueToken, hashToken } from '../../common/security/tokens';
import { sendMail } from '../../common/services/mailer';
import {
  passwordChangedEmail,
  passwordResetEmail,
  type Locale,
} from '../../common/services/email-templates';
import { decideReset } from './password-reset';
import { accessTokenLifetimeSeconds, signAccessToken } from '../../common/security/jwt';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { decideRotation } from './refresh-rotation';
import type { SessionMetadata, UserWithPermissions } from './auth.types';

const log = createLogger('auth');

function toAuthUser(user: UserWithPermissions): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role.name,
    permissions: user.role.permissions.map((entry) => entry.permission.code),
    emailVerified: user.emailVerifiedAt !== null,
  };
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Cặp token trả về cho tầng controller. Refresh token được đặt vào cookie ở đó. */
export interface IssuedSession extends AuthSession {
  refreshToken: string;
}

function issueSession(user: UserWithPermissions): AuthSession {
  const authUser = toAuthUser(user);
  return {
    user: authUser,
    accessToken: signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      permissions: authUser.permissions,
    }),
    expiresIn: accessTokenLifetimeSeconds(),
  };
}

async function startNewFamily(
  user: UserWithPermissions,
  metadata: SessionMetadata,
): Promise<IssuedSession> {
  const refreshToken = generateOpaqueToken();

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    // Mỗi lần đăng nhập mở một family mới. Nhờ vậy phát hiện trộm ở thiết bị
    // này chỉ đá phiên của thiết bị đó ra, không đá luôn mọi thiết bị khác.
    familyId: randomUUID(),
    expiresAt: refreshExpiry(),
    ...metadata,
  });

  return { ...issueSession(user), refreshToken };
}

// ── Đăng ký ───────────────────────────────────────────────────────────────

export async function register(
  input: { email: string; password: string; fullName: string; phone?: string },
  metadata: SessionMetadata,
): Promise<IssuedSession> {
  if (await authRepository.emailExists(input.email)) {
    throw new ConflictError(ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS, 'Email is already registered');
  }

  const user = await authRepository.createCustomer({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    fullName: input.fullName,
    ...(input.phone ? { phone: input.phone } : {}),
  });

  log.info({ userId: user.id }, 'đăng ký tài khoản mới');
  return startNewFamily(user, metadata);
}

// ── Đăng nhập ─────────────────────────────────────────────────────────────

export async function login(
  input: { email: string; password: string },
  metadata: SessionMetadata,
): Promise<IssuedSession> {
  const user = await authRepository.findByEmail(input.email);

  if (!user) {
    // Vẫn tốn đúng chừng ấy thời gian băm dù không có tài khoản. Không làm vậy
    // thì kẻ tấn công đo thời gian phản hồi là liệt kê được email đã đăng ký.
    await fakePasswordCompare();
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    log.warn({ userId: user.id }, 'đăng nhập sai mật khẩu');
    // Cùng một mã lỗi cho cả hai trường hợp: nói rõ "email không tồn tại" là
    // tặng kẻ tấn công công cụ dò danh sách người dùng.
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError(ERROR_CODES.AUTH_ACCOUNT_DISABLED, 'Account has been disabled', 403);
  }

  await authRepository.touchLastLogin(user.id);
  log.info({ userId: user.id }, 'đăng nhập thành công');

  return startNewFamily(user, metadata);
}

// ── Làm mới token ─────────────────────────────────────────────────────────

export async function refresh(
  rawToken: string | undefined,
  metadata: SessionMetadata,
): Promise<IssuedSession> {
  if (!rawToken) {
    throw new AppError(
      ERROR_CODES.AUTH_REFRESH_TOKEN_MISSING,
      'Refresh token cookie is missing',
      401,
    );
  }

  const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
  const decision = decideRotation(stored);

  switch (decision.action) {
    case 'reject_unknown':
      throw new AppError(
        ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
        'Refresh token not recognised',
        401,
      );

    case 'reject_expired':
      throw new AppError(ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED, 'Refresh token has expired', 401);

    case 'reject_revoked':
      // Phiên đã kết thúc bình thường. Ghi ở mức debug, KHÔNG phải error —
      // đây không phải sự cố bảo mật, và cảnh báo giả làm hỏng giá trị của
      // cảnh báo thật.
      log.debug('refresh token thuộc phiên đã kết thúc');
      throw new AppError(
        ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
        'Session has ended, please sign in again',
        401,
      );

    case 'revoke_family': {
      const revoked = await authRepository.revokeFamily(decision.familyId);
      log.error(
        { userId: decision.userId, familyId: decision.familyId, revoked },
        'PHÁT HIỆN DÙNG LẠI REFRESH TOKEN — đã thu hồi toàn bộ family',
      );
      throw new AppError(
        ERROR_CODES.AUTH_REFRESH_TOKEN_REUSED,
        'Refresh token was already used; all sessions in this family have been revoked',
        401,
      );
    }

    case 'rotate': {
      const user = await authRepository.findById(decision.token.userId);

      // Tài khoản bị khoá hoặc xoá sau khi đã đăng nhập: chặn ngay tại đây.
      // Đây là lý do access token chỉ sống 15 phút — đó là độ trễ tối đa để
      // một tài khoản bị khoá thật sự mất quyền truy cập.
      if (!user || !user.isActive) {
        await authRepository.revokeFamily(decision.token.familyId);
        throw new AppError(ERROR_CODES.AUTH_ACCOUNT_DISABLED, 'Account is no longer active', 403);
      }

      const newRefreshToken = generateOpaqueToken();
      await authRepository.rotateRefreshToken({
        oldTokenId: decision.token.id,
        userId: user.id,
        familyId: decision.token.familyId,
        newTokenHash: hashToken(newRefreshToken),
        expiresAt: refreshExpiry(),
        ...metadata,
      });

      return { ...issueSession(user), refreshToken: newRefreshToken };
    }
  }
}

// ── Đăng xuất ─────────────────────────────────────────────────────────────

export async function logout(rawToken: string | undefined): Promise<void> {
  // Không có token thì coi như đã đăng xuất. Đăng xuất phải luôn thành công —
  // báo lỗi ở đây chỉ khiến người dùng mắc kẹt trong trạng thái nửa vời.
  if (!rawToken) return;
  await authRepository.revokeByHash(hashToken(rawToken));
}

/** Thu hồi mọi phiên của một người dùng — "đăng xuất khỏi tất cả thiết bị". */
export async function logoutAllDevices(userId: string): Promise<number> {
  const revoked = await authRepository.revokeAllForUser(userId);
  log.info({ userId, revoked }, 'thu hồi toàn bộ phiên đăng nhập');
  return revoked;
}

// ── Quên mật khẩu ─────────────────────────────────────────────────────────

/**
 * Luôn kết thúc êm, dù email có tồn tại hay không.
 *
 * Nếu báo "email không tồn tại", endpoint này trở thành công cụ liệt kê tài
 * khoản: gõ vào một danh sách email và đọc phản hồi là biết ai có tài khoản.
 * Vì vậy controller luôn trả cùng một thông điệp, và hàm này im lặng bỏ qua
 * những email không khớp.
 */
export async function requestPasswordReset(email: string, locale: Locale): Promise<void> {
  const user = await authRepository.findByEmail(email);

  if (!user) {
    log.info({ email }, 'yêu cầu đặt lại mật khẩu cho email không tồn tại — bỏ qua');
    return;
  }

  if (!user.isActive) {
    log.warn({ userId: user.id }, 'yêu cầu đặt lại mật khẩu trên tài khoản đã khoá — bỏ qua');
    return;
  }

  const token = generateOpaqueToken();
  const ttlMinutes = env.PASSWORD_RESET_TTL_MINUTES;

  await authRepository.issuePasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });

  await sendMail({
    to: user.email,
    content: passwordResetEmail({ fullName: user.fullName, token, locale, ttlMinutes }),
  });

  log.info({ userId: user.id }, 'đã phát token đặt lại mật khẩu');
}

/**
 * Đặt lại mật khẩu bằng token nhận qua email.
 *
 * Kết thúc thành công thì mọi phiên đăng nhập đều bị thu hồi (xử lý trong
 * repository, cùng một transaction với việc đổi mật khẩu).
 */
export async function resetPassword(
  input: { token: string; password: string },
  locale: Locale,
): Promise<void> {
  const stored = await authRepository.findPasswordResetToken(hashToken(input.token));
  const decision = decideReset(stored);

  switch (decision.action) {
    case 'reject_unknown':
    case 'reject_used':
      // Gộp hai trường hợp vào một mã: phân biệt chúng là tiết lộ token nào đã
      // từng tồn tại.
      throw new AppError(
        ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
        'Reset token is invalid or has already been used',
        400,
      );

    case 'reject_expired':
      throw new AppError(
        ERROR_CODES.AUTH_RESET_TOKEN_EXPIRED,
        'Reset token has expired, request a new one',
        400,
      );

    case 'accept': {
      const user = await authRepository.findById(decision.token.userId);
      if (!user) {
        throw new AppError(ERROR_CODES.AUTH_RESET_TOKEN_INVALID, 'Account no longer exists', 400);
      }

      await authRepository.completePasswordReset({
        tokenId: decision.token.id,
        userId: user.id,
        passwordHash: await hashPassword(input.password),
      });

      log.info({ userId: user.id }, 'đã đặt lại mật khẩu, thu hồi toàn bộ phiên');

      // Thông báo sau khi đổi: nếu không phải chủ tài khoản thực hiện, đây là
      // tín hiệu duy nhất họ nhận được để phản ứng kịp.
      await sendMail({
        to: user.email,
        content: passwordChangedEmail({ fullName: user.fullName, locale }),
      });
      return;
    }
  }
}

// ── Hồ sơ ─────────────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'User no longer exists', 401);
  }
  return toAuthUser(user);
}
