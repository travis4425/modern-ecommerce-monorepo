/**
 * Quyết định với một token đặt lại mật khẩu — hàm THUẦN, không chạm database.
 * Tách riêng vì đây là chỗ dễ viết sai nhất: bỏ sót một nhánh là token dùng
 * được nhiều lần hoặc dùng được sau khi hết hạn.
 */
export interface StoredResetToken {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export type ResetDecision =
  | { action: 'accept'; token: StoredResetToken }
  | { action: 'reject_unknown' }
  | { action: 'reject_used' }
  | { action: 'reject_expired' };

export function decideReset(
  stored: StoredResetToken | null,
  now: Date = new Date(),
): ResetDecision {
  if (!stored) return { action: 'reject_unknown' };
  if (stored.usedAt !== null) return { action: 'reject_used' };
  if (stored.expiresAt.getTime() <= now.getTime()) return { action: 'reject_expired' };
  return { action: 'accept', token: stored };
}
