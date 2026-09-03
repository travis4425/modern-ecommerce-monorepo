import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import type { FieldError } from '@ecom/shared';
import { ValidationError } from '../errors';

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate ở biên, không validate trong service.
 *
 * Sau khi qua middleware này, service được quyền tin rằng input đã đúng kiểu và
 * đúng khoảng giá trị. Nếu một service còn phải tự hỏi "cái này có thật là số
 * không", nghĩa là đã có route quên gắn schema.
 *
 * Giá trị đã parse được GHI ĐÈ lên req, nên các tầng sau nhận dữ liệu đã ép
 * kiểu (ví dụ `page` là number chứ không còn là string từ query string).
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // Express 5 đặt req.query là getter chỉ đọc, nên gán trực tiếp sẽ ném lỗi.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(toFieldErrors(error)));
        return;
      }
      next(error);
    }
  };
}

/**
 * Đổi lỗi Zod thành danh sách lỗi theo field.
 *
 * Ta trả về MÃ lỗi chứ không phải câu chữ, vì thông báo tiếng Anh mặc định của
 * Zod không dịch được sang tiếng Việt ở phía frontend. Frontend tra
 * `errors.fields.<mã>` để hiển thị.
 */
function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    code: issue.code.toUpperCase(),
  }));
}
