import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { vi } from './locales/vi';
import { en } from './locales/en';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';
export const LANGUAGE_STORAGE_KEY = 'ecom.lang';

export const defaultNS = 'translation';

export const resources = {
  vi: { translation: vi },
  en: { translation: en },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // Trình duyệt báo 'vi-VN' hoặc 'en-US'; cờ này cho phép rơi về 'vi' / 'en'
    // thay vì bỏ qua và dùng ngôn ngữ dự phòng.
    nonExplicitSupportedLngs: true,
    detection: {
      // localStorage đứng trước navigator: lựa chọn của người dùng phải thắng
      // ngôn ngữ hệ điều hành, nếu không nút đổi ngôn ngữ sẽ bị "quên" sau mỗi
      // lần tải lại trang.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    /**
     * LƯU Ý về tên biến nội suy: `count` là từ khoá của i18next — nó dùng để
     * chọn dạng số nhiều nên bắt buộc phải là number. Chuỗi đã định dạng theo
     * locale ('1.234') không lọt qua được, và lỗi hiện ra ở tầng kiểu chứ không
     * phải lúc chạy. Đặt tên khác: `total`, `quantity`, `reviews`.
     */
    interpolation: {
      // React đã tự chống XSS khi render, escape thêm một lần nữa chỉ làm dấu
      // nháy và dấu & hiện ra thành &#39; &amp; giữa giao diện.
      escapeValue: false,
    },
  });

/**
 * Đồng bộ thuộc tính `lang` của thẻ <html>.
 *
 * Không phải chi tiết trang trí: trình đọc màn hình chọn giọng đọc theo thuộc
 * tính này, và trình duyệt dùng nó để ngắt dòng, kiểm chính tả. Để nguyên
 * lang="vi" khi giao diện đang tiếng Anh là một lỗi tiếp cận thật.
 */
function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
}

syncDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
