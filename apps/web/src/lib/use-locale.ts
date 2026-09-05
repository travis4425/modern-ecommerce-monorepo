import { useTranslation } from 'react-i18next';

/**
 * Ngôn ngữ đang thực sự hiển thị, để truyền cho các hàm định dạng.
 *
 * Dùng `resolvedLanguage` chứ không phải `language`: khi trình duyệt báo
 * 'vi-VN', trường `language` giữ nguyên 'vi-VN' còn `resolvedLanguage` cho ra
 * 'vi' — đúng khoá mà bảng định dạng của chúng ta dùng.
 */
export function useLocale(): string {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage ?? 'vi';
}
