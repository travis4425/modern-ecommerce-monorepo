import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryNode } from '@ecom/shared';
import { formatCount } from '../../lib/format';
import { useLocale } from '../../lib/use-locale';
import { Button } from '../ui/Button';
import type { ProductFilters } from '../../features/catalog/catalog.api';

interface Props {
  filters: ProductFilters;
  categories: CategoryNode[];
  brands: string[];
  activeCount: number;
  onChange: (patch: Partial<ProductFilters>) => void;
  onClear: () => void;
}

export function FilterPanel({
  filters,
  categories,
  brands,
  activeCount,
  onChange,
  onClear,
}: Props) {
  const { t } = useTranslation();
  const locale = useLocale();

  /**
   * Khoảng giá giữ trong state cục bộ và chỉ đẩy lên URL khi người dùng bấm Áp
   * dụng hoặc rời khỏi ô nhập.
   *
   * Đẩy theo từng ký tự sẽ gọi API với "1", rồi "19", rồi "199"… — vừa tốn
   * request vừa cho ra những kết quả trung gian vô nghĩa nhấp nháy trên màn hình.
   */
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? '');

  /**
   * Đồng bộ ngược khi URL đổi từ bên ngoài (bấm Back, bấm "Xoá bộ lọc").
   *
   * Chỉnh state ngay trong lúc render, KHÔNG dùng useEffect: effect chạy sau khi
   * trình duyệt đã vẽ xong nên ô nhập sẽ nhấp nháy giá trị cũ một khung hình.
   * Cách này React huỷ lần render dở dang và dựng lại ngay, không kịp lọt ra
   * màn hình. Cặp state `seen*` là mốc so sánh — thiếu nó thì mỗi lần gõ đều bị
   * ghi đè ngược về giá trị trên URL.
   */
  const [seenMin, setSeenMin] = useState(filters.minPrice ?? '');
  const [seenMax, setSeenMax] = useState(filters.maxPrice ?? '');

  if ((filters.minPrice ?? '') !== seenMin) {
    setSeenMin(filters.minPrice ?? '');
    setMinPrice(filters.minPrice ?? '');
  }
  if ((filters.maxPrice ?? '') !== seenMax) {
    setSeenMax(filters.maxPrice ?? '');
    setMaxPrice(filters.maxPrice ?? '');
  }

  const applyPrice = () => {
    // Người dùng nhập ngược thì đảo lại giúp, thay vì trả về lỗi 400 của backend
    // với một mã lỗi mà họ không làm gì được.
    const min = minPrice.trim();
    const max = maxPrice.trim();
    const swap = min !== '' && max !== '' && Number(min) > Number(max);

    onChange({ minPrice: swap ? max : min, maxPrice: swap ? min : max });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-subtle">
          {t('catalog.filters')}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            {t('catalog.clearFilters')}
          </button>
        )}
      </div>

      {/* ── Danh mục ─────────────────────────────────── */}
      <section className="space-y-1.5">
        <h3 className="text-xs font-bold text-ink-muted">{t('catalog.category')}</h3>
        <ul className="space-y-0.5 text-sm">
          <li>
            <FilterRow
              active={!filters.category}
              onClick={() => onChange({ category: undefined })}
              label={t('catalog.allCategories')}
            />
          </li>
          {categories.map((parent) => (
            <li key={parent.id}>
              <FilterRow
                active={filters.category === parent.slug}
                onClick={() => onChange({ category: parent.slug })}
                label={parent.name}
                count={formatCount(parent.productCount, locale)}
              />
              {parent.children.length > 0 && (
                <ul className="ml-3 border-l border-line pl-2">
                  {parent.children.map((child) => (
                    <li key={child.id}>
                      <FilterRow
                        active={filters.category === child.slug}
                        onClick={() => onChange({ category: child.slug })}
                        label={child.name}
                        count={formatCount(child.productCount, locale)}
                        subtle
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Thương hiệu ──────────────────────────────── */}
      <section className="space-y-1.5">
        <label className="text-xs font-bold text-ink-muted" htmlFor="brand">
          {t('catalog.brand')}
        </label>
        <select
          id="brand"
          value={filters.brand ?? ''}
          onChange={(event) => onChange({ brand: event.target.value || undefined })}
          className="w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-brand-400"
        >
          <option value="">{t('catalog.allBrands')}</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </section>

      {/* ── Khoảng giá ───────────────────────────────── */}
      <section className="space-y-1.5">
        <h3 className="text-xs font-bold text-ink-muted">{t('catalog.priceRange')}</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            onBlur={applyPrice}
            placeholder={t('catalog.priceMin')}
            aria-label={t('catalog.priceMin')}
            className="w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-brand-400"
          />
          <span className="text-ink-subtle">–</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            onBlur={applyPrice}
            placeholder={t('catalog.priceMax')}
            aria-label={t('catalog.priceMax')}
            className="w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-brand-400"
          />
        </div>
        <Button variant="secondary" className="w-full !py-1.5 text-xs" onClick={applyPrice}>
          {t('catalog.applyPrice')}
        </Button>
      </section>

      {/* ── Còn hàng ─────────────────────────────────── */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.inStock === 'true'}
          onChange={(event) => onChange({ inStock: event.target.checked ? 'true' : undefined })}
          className="size-4 accent-brand-500"
        />
        {t('catalog.inStockOnly')}
      </label>
    </div>
  );
}

function FilterRow({
  active,
  label,
  count,
  subtle = false,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: string;
  subtle?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-current cho trình đọc màn hình biết mục nào đang được chọn — thông
      // tin mà ở đây chỉ có màu chữ truyền đạt.
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-2 rounded-control px-2 py-1 text-left transition-colors ${
        active
          ? 'bg-brand-50 font-semibold text-brand-700'
          : `hover:bg-ground ${subtle ? 'text-ink-muted' : 'text-ink'}`
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="ml-auto text-xs text-ink-subtle">{count}</span>}
    </button>
  );
}
