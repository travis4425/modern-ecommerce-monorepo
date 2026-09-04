import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';

const LABELS: Record<SupportedLanguage, string> = {
  vi: 'VI',
  en: 'EN',
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'vi') as SupportedLanguage;

  return (
    // role="group" + aria-label để trình đọc màn hình biết hai nút này là một
    // cụm lựa chọn, không phải hai nút rời rạc.
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex items-center rounded-control border border-line bg-surface p-0.5"
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = language === current;
        return (
          <button
            key={language}
            type="button"
            // aria-pressed cho biết nút nào đang được chọn — thứ mà màu nền
            // truyền đạt cho người nhìn thấy, còn người dùng trình đọc thì không.
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(language)}
            className={`rounded-[0.375rem] px-2.5 py-1 text-xs font-bold tracking-wide transition-colors ${
              active ? 'bg-brand-500 text-white' : 'text-ink-muted hover:text-brand-600'
            }`}
          >
            {LABELS[language]}
          </button>
        );
      })}
    </div>
  );
}
