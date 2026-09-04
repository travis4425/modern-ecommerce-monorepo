import { prisma } from '../../config/prisma';
import { createLogger } from '../logger';
import { getRequestContext } from '../request-context';

const log = createLogger('audit');

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Ghi nhật ký thao tác của staff và admin.
 *
 * Danh tính người thực hiện lấy từ ngữ cảnh request, không phải từ tham số —
 * nhờ vậy không có cách nào gọi hàm này mà "quên" ghi ai đã làm.
 *
 * KHÔNG BAO GIỜ ném lỗi ra ngoài. Nhật ký hỏng thì ghi lại chuyện đó và để
 * nghiệp vụ đi tiếp: chặn một thao tác hợp lệ chỉ vì bảng log gặp sự cố là đổi
 * một vấn đề nhỏ lấy một sự cố lớn hơn.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const context = getRequestContext();

  try {
    await prisma.auditLog.create({
      data: {
        actorId: context?.userId ?? null,
        // Chụp lại email để nhật ký vẫn đọc được sau khi tài khoản bị xoá mềm.
        actorEmail: context?.userEmail ?? 'system',
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: (entry.before ?? null) as never,
        after: (entry.after ?? null) as never,
        ipAddress: context?.ipAddress ?? null,
      },
    });
  } catch (error) {
    log.error({ err: error, entry }, 'ghi nhật ký thao tác thất bại');
  }
}
