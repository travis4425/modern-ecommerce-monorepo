import { useTranslation } from 'react-i18next';
import { formatCount, formatRating } from '../../lib/format';
import { useLocale } from '../../lib/use-locale';

export function Rating({ average, count }: { average: string; count: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const value = Number(average);

  if (count === 0) {
    return <span className="text-xs text-ink-subtle">{t('catalog.noReviews')}</span>;
  }

  return (
    // Nội dung sao chỉ để nhìn; câu đầy đủ nằm trong aria-label cho trình đọc
    // màn hình, vì "★★★★☆" đọc lên không thành nghĩa gì.
    <span
      className="inline-flex items-center gap-1 text-xs text-ink-muted"
      aria-label={t('catalog.ratingLabel', {
        rating: formatRating(average, locale),
        reviews: formatCount(count, locale),
      })}
    >
      <span aria-hidden className="text-warn">
        {'★'.repeat(Math.round(value))}
        <span className="text-line-strong">{'★'.repeat(5 - Math.round(value))}</span>
      </span>
      <span aria-hidden>
        {formatRating(average, locale)} ({formatCount(count, locale)})
      </span>
    </span>
  );
}
