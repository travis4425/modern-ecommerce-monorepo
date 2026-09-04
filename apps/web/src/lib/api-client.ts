import { API_PREFIX, ERROR_CODES, type ApiResponse, type PaginationMeta } from '@ecom/shared';

/**
 * Để TRỐNG ở dev: frontend gọi '/api/...' cùng origin, đi qua proxy của Vite.
 * Nhờ vậy không vướng CORS và cookie HTTPOnly của refresh token gửi đi bình thường.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Mã lỗi do CHÍNH frontend sinh ra khi không chạm được tới máy chủ.
 *
 * Không nằm trong bảng mã của backend vì backend chưa từng nhận request này —
 * nhưng vẫn cần một mã ổn định để giao diện tra bảng dịch, thay vì hiện thẳng
 * "Failed to fetch" của trình duyệt.
 */
export const NETWORK_ERROR_CODE = 'API_UNREACHABLE';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Đúng khi máy chủ không trả lời — dùng để quyết định có thử lại hay không. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Object sẽ được JSON hoá, hoặc FormData để gửi tệp. */
  body?: unknown;
}

function buildInit(options: RequestOptions): RequestInit {
  const { body, headers, ...rest } = options;

  const isFormData = body instanceof FormData;
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');

  // KHÔNG tự đặt Content-Type cho FormData: trình duyệt phải tự sinh nó kèm
  // chuỗi boundary. Đặt tay là hỏng luôn phần multipart, và lỗi hiện ra rất
  // khó hiểu ở phía server.
  if (body !== undefined && !isFormData) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  return {
    // Bắt buộc để cookie refresh token (HTTPOnly, SameSite) đi kèm request.
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    ...(body === undefined ? {} : { body: isFormData ? body : JSON.stringify(body) }),
  };
}

async function readEnvelope<TData>(response: Response): Promise<ApiResponse<TData>> {
  // 204 No Content không có thân; gọi .json() sẽ ném lỗi phân tích cú pháp.
  if (response.status === 204) {
    return { success: true, data: undefined as TData };
  }

  try {
    return (await response.json()) as ApiResponse<TData>;
  } catch {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      response.status,
      `Máy chủ trả về nội dung không phải JSON (HTTP ${response.status})`,
    );
  }
}

/**
 * Gọi API và trả về phần `data` đã bóc khỏi envelope.
 *
 * Mọi lỗi — kể cả lỗi mạng — đều ra khỏi hàm này dưới dạng `ApiError` có
 * `code`. Nhờ đó tầng giao diện chỉ cần một nhánh xử lý duy nhất, và luôn có
 * khoá để tra bảng dịch.
 */
export async function apiRequest<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  return (await apiRequestWithMeta<TData>(path, options)).data;
}

/** Như trên nhưng giữ lại `meta` — dùng cho các endpoint có phân trang. */
export async function apiRequestWithMeta<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: TData; meta?: PaginationMeta }> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${API_PREFIX}${path}`, buildInit(options));
  } catch (error) {
    // fetch chỉ ném khi không tới được máy chủ. Lỗi 4xx/5xx là một response
    // hợp lệ và đi tiếp xuống dưới.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(NETWORK_ERROR_CODE, 0, 'Không kết nối được máy chủ');
  }

  const body = await readEnvelope<TData>(response);

  if (!body.success) {
    throw new ApiError(body.error.code, response.status, body.error.message, body.error.details);
  }

  return { data: body.data, ...(body.meta ? { meta: body.meta } : {}) };
}
