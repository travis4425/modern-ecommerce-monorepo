import multer, { MulterError } from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';
import { env } from '../../config/env';

export const MAX_FILE_SIZE_BYTES = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Ảnh được giữ trong BỘ NHỚ, không ghi thẳng xuống đĩa.
 *
 * multer.diskStorage() ghi tệp ra đĩa TRƯỚC khi bất kỳ dòng mã nào của chúng ta
 * nhìn thấy nội dung nó. Nghĩa là mọi tệp rác đều để lại dấu vết phải đi dọn,
 * và tệp độc hại đã nằm sẵn trên hệ thống tệp trước khi bị từ chối. Giữ trong
 * bộ nhớ thì tệp không hợp lệ chết ngay tại chỗ, không để lại gì.
 *
 * An toàn vì `limits.fileSize` chặn trước: bộ nhớ tiêu tốn tối đa là
 * UPLOAD_MAX_FILE_SIZE_MB cho mỗi request đang bay.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
    // Chặn cả số lượng trường văn bản: một multipart với hàng vạn trường rỗng
    // cũng là một kiểu tấn công, và nó không vướng giới hạn fileSize nào.
    fields: 10,
    fieldSize: 4096,
  },
  fileFilter(_req, file, callback) {
    // Lọc RẺ theo lời khai của client, chỉ để chặn sớm những gì rõ ràng không
    // phải ảnh. Đây KHÔNG phải bước kiểm tra thật — bước thật là đọc chữ ký
    // byte ở tầng service, sau khi đã có toàn bộ nội dung trong tay.
    if (!file.mimetype.startsWith('image/')) {
      callback(
        new AppError(
          ERROR_CODES.UPLOAD_FILE_TYPE_UNSUPPORTED,
          `Only image uploads are accepted, received ${file.mimetype}`,
          415,
        ),
      );
      return;
    }
    callback(null, true);
  },
}).single('file');

/** Quy lỗi của multer về AppError để error handler trả đúng mã và đúng status. */
function translate(error: unknown): unknown {
  if (!(error instanceof MulterError)) return error;

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(
        ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
        `File exceeds the ${env.UPLOAD_MAX_FILE_SIZE_MB}MB limit`,
        413,
      );
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError(
        ERROR_CODES.UPLOAD_TOO_MANY_FILES,
        'Send exactly one file in a field named "file"',
        400,
      );
    default:
      return new AppError(ERROR_CODES.UPLOAD_FILE_MISSING, error.message, 400);
  }
}

/**
 * Phải đặt TRƯỚC validate() trong chuỗi middleware: với request multipart, các
 * trường văn bản chỉ xuất hiện trong req.body sau khi multer chạy xong. Đảo thứ
 * tự thì validator luôn nhìn thấy body rỗng.
 */
export function uploadSingleImage(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, (error: unknown) => {
    next(error ? translate(error) : undefined);
  });
}
