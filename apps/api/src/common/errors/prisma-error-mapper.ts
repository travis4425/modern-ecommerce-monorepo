import { ERROR_CODES } from '@ecom/shared';
import { AppError, ConflictError, InternalError, NotFoundError } from './app-error';

/**
 * Hình dạng tối thiểu của một lỗi Prisma đã biết mã.
 *
 * Ta nhận diện bằng cấu trúc thay vì `instanceof PrismaClientKnownRequestError`.
 * Lý do: đường dẫn import của lớp đó đã đổi nhiều lần giữa các phiên bản Prisma
 * (và đổi lần nữa ở v7 khi client được sinh ra ngoài node_modules). Ta chỉ cần
 * `code` và `meta`, nên bám vào cấu trúc thì bền hơn nhiều so với bám vào lớp.
 */
interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; clientVersion?: unknown };
  return (
    typeof candidate.code === 'string' &&
    /^P\d{4}$/.test(candidate.code) &&
    typeof candidate.clientVersion === 'string'
  );
}

/** Tên các cột gây vi phạm ràng buộc, lấy từ `meta.target` của Prisma. */
function targetFields(meta?: Record<string, unknown>): string {
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;
  return 'unknown field';
}

/**
 * Đổi lỗi thô của tầng dữ liệu thành AppError có mã ổn định.
 *
 * Nếu không nhận ra, trả về null để tầng gọi tự quyết — ta không nuốt lỗi lạ
 * thành 400, vì như vậy sẽ che mất bug thật.
 */
export function mapPrismaError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (!isPrismaKnownError(error)) return null;

  switch (error.code) {
    case 'P2002':
      return new ConflictError(
        ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION,
        `Unique constraint violated on: ${targetFields(error.meta)}`,
      );

    case 'P2003':
      return new ConflictError(
        ERROR_CODES.FOREIGN_KEY_CONSTRAINT_VIOLATION,
        `Foreign key constraint violated on: ${targetFields(error.meta)}`,
      );

    case 'P2025':
      return new NotFoundError(
        ERROR_CODES.RECORD_NOT_FOUND,
        typeof error.meta?.cause === 'string' ? error.meta.cause : 'Record not found',
      );

    // P1001/P1002: không kết nối được database. Đây là sự cố hạ tầng, không
    // phải lỗi của người dùng, nên isOperational phải là false để được log ở
    // mức nghiêm trọng và kêu gọi sự chú ý.
    case 'P1001':
    case 'P1002':
      return new InternalError('Cannot reach database server');

    default:
      return null;
  }
}
