import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';
import { ProductGrid, ProductGridSkeleton } from '../components/catalog/ProductGrid';
import { useCategories, useProducts } from '../features/catalog/catalog.queries';
import { formatCount } from '../lib/format';
import { useLocale } from '../lib/use-locale';

export default function HomePage() {
  const { t } = useTranslation();
  const locale = useLocale();

  const categories = useCategories();
  // Bộ lọc cố định nên khoá cache ổn định — trang chủ và trang danh sách không
  // giẫm lên bộ nhớ đệm của nhau.
  const featured = useProducts({ sort: '-created_at', limit: '6' });

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            {t('home.eyebrow')}
          </p>
          <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">{t('home.subtitle')}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/products">{t('home.ctaPrimary')}</ButtonLink>
            <ButtonLink to="/system" variant="secondary">
              {t('home.ctaSecondary')}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="text-lg font-bold tracking-tight">{t('home.categoriesTitle')}</h2>

        {categories.isPending && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-card bg-line/60" />
            ))}
          </div>
        )}

        {categories.isSuccess && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.data.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="flex h-full flex-col justify-between rounded-card border border-line bg-surface p-3.5 shadow-card transition-colors hover:border-brand-400"
                >
                  <span className="text-sm font-semibold leading-snug">{category.name}</span>
                  <span className="mt-2 text-xs text-ink-subtle">
                    {t('home.categoryCount', { total: formatCount(category.productCount, locale) })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>

      <section className="border-t border-line bg-surface">
        <Container className="py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight">{t('home.newestTitle')}</h2>
            <Link to="/products" className="text-sm font-semibold text-brand-600 hover:underline">
              {t('home.seeAll')}
            </Link>
          </div>

          <div className="mt-4">
            {featured.isPending && <ProductGridSkeleton count={6} />}
            {featured.isSuccess && <ProductGrid products={featured.data.items} />}
            {featured.isError && (
              <p className="text-sm text-ink-muted">{t('common.unreachable')}</p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
