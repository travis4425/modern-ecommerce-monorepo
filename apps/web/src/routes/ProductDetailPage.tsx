import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductGallery } from '../components/catalog/ProductGallery';
import { Rating } from '../components/catalog/Rating';
import { useProduct } from '../features/catalog/catalog.queries';
import { ApiError } from '../lib/api-client';
import { useErrorMessage } from '../lib/use-error-message';
import { discountPercent, formatCount, formatMoney } from '../lib/format';
import { useLocale } from '../lib/use-locale';

export default function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const locale = useLocale();
  const describeError = useErrorMessage();

  const product = useProduct(slug);

  if (product.isPending) {
    return (
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-2" aria-hidden>
          <div className="aspect-square animate-pulse rounded-card bg-line/60" />
          <div className="space-y-4">
            <div className="h-7 w-3/4 animate-pulse rounded bg-line/60" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-line/60" />
            <div className="h-9 w-2/5 animate-pulse rounded bg-line/60" />
            <div className="h-24 w-full animate-pulse rounded bg-line/60" />
          </div>
        </div>
      </Container>
    );
  }

  if (product.isError) {
    // 404 là một câu trả lời hợp lệ, không phải sự cố: người dùng cần lối đi
    // tiếp, không cần nút "thử lại" mà bấm bao nhiêu lần cũng vẫn 404.
    const notFound = product.error instanceof ApiError && product.error.status === 404;

    return (
      <Container className="py-16">
        <EmptyState
          title={notFound ? t('catalog.notFoundTitle') : t('catalog.errorTitle')}
          body={notFound ? t('catalog.notFoundBody') : describeError(product.error)}
          action={
            notFound ? (
              <ButtonLink to="/products">{t('catalog.backToList')}</ButtonLink>
            ) : (
              <Button variant="secondary" onClick={() => void product.refetch()}>
                {t('common.retry')}
              </Button>
            )
          }
        />
      </Container>
    );
  }

  const data = product.data;
  const discount = discountPercent(data.price, data.compareAtPrice);
  const soldOut = data.stock <= 0;

  return (
    <Container className="py-8">
      <nav aria-label={t('catalog.breadcrumb')} className="mb-5 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/products" className="hover:text-brand-600">
              {t('catalog.title')}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to={`/products?category=${data.category.slug}`} className="hover:text-brand-600">
              {data.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-ink">
            {data.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={data.images} name={data.name} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {data.brand ?? data.category.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{data.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Rating average={data.ratingAverage} count={data.reviewCount} />
            <span className="font-mono text-xs text-ink-subtle">
              {t('catalog.sku', { sku: data.sku })}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-brand-600">
              {formatMoney(data.price, locale)}
            </span>
            {data.compareAtPrice && (
              <span className="text-base text-ink-subtle line-through">
                {formatMoney(data.compareAtPrice, locale)}
              </span>
            )}
            {discount !== null && (
              <span className="rounded-control bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                {t('catalog.discountBadge', { percent: discount })}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm">
            {soldOut ? (
              <span className="font-semibold text-danger">{t('catalog.soldOut')}</span>
            ) : data.lowStock ? (
              <span className="font-semibold text-warn">
                {t('catalog.lowStock', { quantity: formatCount(data.stock, locale) })}
              </span>
            ) : (
              <span className="font-semibold text-success">{t('catalog.inStock')}</span>
            )}
          </p>

          {data.shortDescription && (
            <p className="mt-4 leading-relaxed text-ink-muted">{data.shortDescription}</p>
          )}

          {/*
            Nút thêm vào giỏ chưa nối được — giỏ hàng là Phase 7. Để `disabled`
            kèm nhãn nói rõ lý do, thay vì một nút bấm vào không có gì xảy ra.
          */}
          <Button className="mt-6 w-full sm:w-auto" disabled>
            {t('catalog.addToCartSoon')}
          </Button>

          {data.attributes.length > 0 && (
            <dl className="mt-8 divide-y divide-line rounded-card border border-line bg-surface px-4">
              {data.attributes.map((attribute) => (
                <div key={attribute.name} className="flex gap-4 py-2.5 text-sm">
                  <dt className="w-2/5 shrink-0 text-ink-muted">{attribute.name}</dt>
                  <dd className="font-medium">{attribute.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {data.description && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-lg font-bold">{t('catalog.description')}</h2>
          {/*
            whitespace-pre-line để xuống dòng của người biên tập được giữ lại.
            KHÔNG dùng dangerouslySetInnerHTML: mô tả là nội dung do người dùng
            khu quản trị nhập, đổ thẳng vào DOM là mở cửa cho XSS lưu trữ.
          */}
          <p className="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-ink-muted">
            {data.description}
          </p>
        </section>
      )}
    </Container>
  );
}
