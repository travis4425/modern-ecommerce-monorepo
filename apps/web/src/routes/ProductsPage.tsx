import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterPanel } from '../components/catalog/FilterPanel';
import { Pagination } from '../components/catalog/Pagination';
import { ProductGrid, ProductGridSkeleton } from '../components/catalog/ProductGrid';
import { SearchBox } from '../components/catalog/SearchBox';
import { SortSelect } from '../components/catalog/SortSelect';
import { useBrands, useCategories, useProducts } from '../features/catalog/catalog.queries';
import { useProductFilters } from '../features/catalog/use-product-filters';
import { useErrorMessage } from '../lib/use-error-message';
import { formatCount } from '../lib/format';
import { useLocale } from '../lib/use-locale';

export default function ProductsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const describeError = useErrorMessage();

  const { filters, setFilters, clearFilters, activeFilterCount } = useProductFilters();
  // Bọc useCallback vì SearchBox đặt hàm này vào mảng phụ thuộc của effect hoãn:
  // hàm mới ở mỗi lần render sẽ dọn bộ đếm liên tục và lần hoãn không bao giờ nổ.
  const handleSearch = useCallback((q: string) => setFilters({ q }), [setFilters]);

  const products = useProducts(filters);
  const categories = useCategories();
  const brands = useBrands();

  const meta = products.data?.meta;
  const items = products.data?.items ?? [];

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight">{t('catalog.title')}</h1>

      <div className="mt-5 grid gap-8 lg:grid-cols-[15rem_1fr]">
        {/*
          Bộ lọc là <aside>, và trên điện thoại nó nằm trong <details> gập lại
          được — chiếm hết màn hình đầu tiên bằng bộ lọc là cách chắc chắn khiến
          người dùng không bao giờ nhìn thấy sản phẩm.
        */}
        <aside>
          <details
            className="rounded-card border border-line bg-surface p-4 lg:hidden"
            open={false}
          >
            <summary className="cursor-pointer text-sm font-semibold">
              {t('catalog.filters')}
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </summary>
            <div className="mt-4">
              <FilterPanel
                filters={filters}
                categories={categories.data ?? []}
                brands={brands.data ?? []}
                activeCount={activeFilterCount}
                onChange={setFilters}
                onClear={clearFilters}
              />
            </div>
          </details>

          <div className="hidden lg:block">
            <FilterPanel
              filters={filters}
              categories={categories.data ?? []}
              brands={brands.data ?? []}
              activeCount={activeFilterCount}
              onChange={setFilters}
              onClear={clearFilters}
            />
          </div>
        </aside>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchBox value={filters.q ?? ''} onChange={handleSearch} />
            <SortSelect
              value={filters.sort ?? 'relevance'}
              onChange={(sort) => setFilters({ sort })}
            />
          </div>

          {/*
            aria-live="polite" để trình đọc màn hình xướng lên số kết quả mới sau
            mỗi lần lọc. Không có nó, người dùng bàn phím gõ vào ô tìm kiếm mà
            không hề biết danh sách đã đổi.
          */}
          <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {products.isPending
              ? t('common.loading')
              : t('catalog.resultCount', { total: formatCount(meta?.total ?? 0, locale) })}
          </p>

          <div className="mt-4">
            {products.isPending && <ProductGridSkeleton />}

            {products.isError && (
              <EmptyState
                title={t('catalog.errorTitle')}
                body={describeError(products.error)}
                action={
                  <Button variant="secondary" onClick={() => void products.refetch()}>
                    {t('common.retry')}
                  </Button>
                }
              />
            )}

            {products.isSuccess && items.length === 0 && (
              <EmptyState
                title={t('catalog.emptyTitle')}
                body={t('catalog.emptyBody')}
                action={
                  activeFilterCount > 0 ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('catalog.clearFilters')}
                    </Button>
                  ) : undefined
                }
              />
            )}

            {products.isSuccess && items.length > 0 && (
              // Làm mờ trong lúc tải trang mới thay vì gỡ lưới đi: giữ chiều cao
              // trang ổn định, người dùng không bị đẩy lên đầu.
              <div className={products.isFetching ? 'opacity-60 transition-opacity' : undefined}>
                <ProductGrid products={items} />
              </div>
            )}
          </div>

          {meta && items.length > 0 && (
            <div className="mt-8">
              <Pagination
                meta={meta}
                onChange={(page) => {
                  setFilters({ page: String(page) });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
