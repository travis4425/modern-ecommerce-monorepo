import { useTranslation } from 'react-i18next';
import { type ProductSort } from '@ecom/shared';

/**
 * Chỉ liệt kê những cách sắp xếp có nghĩa với người mua hàng.
 *
 * PRODUCT_SORTS ở backend còn có 'created_at' tăng dần và 'rating' — hàng cũ
 * nhất trước thì không ai chọn, nên không đưa vào. Danh sách này là tập con có
 * chủ ý, không phải bản sao thiếu sót.
 */
// `as const` chứ KHÔNG chú thích `labelKey: string`: chú thích kiểu rộng sẽ nới
// khoá dịch về `string`, và toàn bộ ràng buộc kiểu của t() biến mất đúng ở chỗ
// nó cần nhất — nơi khoá đến từ một biến chứ không viết thẳng.
const OPTIONS = [
  { value: 'relevance', labelKey: 'catalog.sortRelevance' },
  { value: '-created_at', labelKey: 'catalog.sortNewest' },
  { value: 'price', labelKey: 'catalog.sortPriceAsc' },
  { value: '-price', labelKey: 'catalog.sortPriceDesc' },
  { value: 'rating', labelKey: 'catalog.sortRating' },
  { value: 'name', labelKey: 'catalog.sortName' },
] as const satisfies ReadonlyArray<{ value: ProductSort; labelKey: string }>;

export function SortSelect({
  value,
  onChange,
}: {
  value: ProductSort;
  onChange: (value: ProductSort) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <label className="whitespace-nowrap text-xs font-semibold text-ink-muted" htmlFor="sort">
        {t('catalog.sortLabel')}
      </label>
      <select
        id="sort"
        value={value}
        onChange={(event) => onChange(event.target.value as ProductSort)}
        className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-brand-400"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
