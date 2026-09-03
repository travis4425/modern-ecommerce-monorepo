/**
 * Quyết định phải làm gì với một refresh token — hàm THUẦN.
 *
 * Tách riêng khỏi service để test được mọi nhánh mà không cần database. Đây là
 * đoạn logic tinh tế nhất của toàn bộ hệ thống xác thực, nên nó xứng đáng được
 * kiểm tra trực tiếp thay vì chỉ kiểm gián tiếp qua endpoint.
 */

export interface StoredRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export type RotationDecision =
  /** Token hợp lệ — cấp cặp token mới, thu hồi token này. */
  | { action: 'rotate'; token: StoredRefreshToken }
  /** Không có dòng nào khớp: token bịa, hoặc đã bị dọn khỏi database. */
  | { action: 'reject_unknown' }
  /** Còn trong database nhưng đã quá hạn. */
  | { action: 'reject_expired' }
  /**
   * Token ĐÃ bị thu hồi mà vẫn được dùng lại.
   *
   * Trong luồng bình thường điều này không xảy ra: mỗi token chỉ dùng đúng một
   * lần rồi bị thay. Nếu nó xảy ra, nghĩa là có hai bên cùng giữ token — gần
   * như chắc chắn token đã bị đánh cắp. Phản ứng là thu hồi TOÀN BỘ family,
   * đá cả kẻ trộm lẫn người dùng thật ra ngoài, buộc đăng nhập lại.
   */
  | { action: 'revoke_family'; familyId: string; userId: string };

export function decideRotation(
  stored: StoredRefreshToken | null,
  now: Date = new Date(),
): RotationDecision {
  if (!stored) return { action: 'reject_unknown' };

  if (stored.revokedAt !== null) {
    return { action: 'revoke_family', familyId: stored.familyId, userId: stored.userId };
  }

  // Kiểm hạn SAU khi kiểm thu hồi: một token vừa bị thu hồi vừa quá hạn vẫn là
  // dấu hiệu bị đánh cắp, và tín hiệu đó quan trọng hơn.
  if (stored.expiresAt.getTime() <= now.getTime()) {
    return { action: 'reject_expired' };
  }

  return { action: 'rotate', token: stored };
}
