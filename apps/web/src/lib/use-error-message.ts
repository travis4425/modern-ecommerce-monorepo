import { useTranslation } from 'react-i18next';
import { errorTranslationKey } from '@ecom/shared';
import { ApiError, NETWORK_ERROR_CODE } from './api-client';

/**
 * Đổi bất kỳ thứ gì bị ném ra thành một câu người đọc được, đúng ngôn ngữ đang chọn.
 *
 * Trường `message` trong response của backend cố ý KHÔNG dùng để hiển thị — nó
 * viết cho lập trình viên đọc log và có thể chứa tên bảng, tên cột. Thứ đem
 * hiển thị luôn là bản dịch tra theo `error.code`.
 */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();

  return (error: unknown): string => {
    const code =
      error instanceof ApiError
        ? error.code
        : error instanceof Error
          ? NETWORK_ERROR_CODE
          : NETWORK_ERROR_CODE;

    if (code === NETWORK_ERROR_CODE) return t('common.unreachable');

    // Mã lạ (backend mới hơn frontend) rơi về thông báo chung thay vì hiện
    // chuỗi mã trần giữa giao diện.
    const key = errorTranslationKey(code);
    const translated = t(key as never, { defaultValue: '' });
    return translated || t('errors.INTERNAL_SERVER_ERROR');
  };
}
