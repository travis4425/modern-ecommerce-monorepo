import { useTranslation } from 'react-i18next';
import type { PaginationMeta } from '@ecom/shared';
import { Button } from '../ui/Button';

/**
 * Dãy số trang rút gọn: luôn có trang đầu, trang cuối, trang hiện tại và một
 * trang hai bên. Chỗ bị lược bỏ thay bằng '…'.
 *
 * Không rút gọn thì một danh mục 40 trang sẽ vẽ ra 40 nút và tràn khỏi màn hình
 * điện thoại.
 */
function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: Array<number | 'gap'> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('gap');
    result.push(page);
    previous = page;
  }
  return result;
}

export function Pagination({
  meta,
  onChange,
}: {
  meta: PaginationMeta;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label={t('catalog.pagination')} className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="secondary"
        disabled={!meta.hasPrev}
        onClick={() => onChange(meta.page - 1)}
        className="!px-3 !py-1.5 text-xs"
      >
        {t('catalog.previous')}
      </Button>

      {pageWindow(meta.page, meta.totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-ink-subtle" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === meta.page ? 'page' : undefined}
            className={`min-w-8 rounded-control px-2 py-1.5 text-xs font-semibold transition-colors ${
              entry === meta.page
                ? 'bg-brand-500 text-white'
                : 'border border-line bg-surface text-ink-muted hover:border-brand-400 hover:text-brand-600'
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <Button
        variant="secondary"
        disabled={!meta.hasNext}
        onClick={() => onChange(meta.page + 1)}
        className="!px-3 !py-1.5 text-xs"
      >
        {t('catalog.next')}
      </Button>
    </nav>
  );
}
