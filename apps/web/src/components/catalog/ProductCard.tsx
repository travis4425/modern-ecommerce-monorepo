import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProductListItem } from '@ecom/shared';
import { discountPercent, formatMoney } from '../../lib/format';
import { useLocale } from '../../lib/use-locale';
import { ProductImage } from './ProductImage';
import { Rating } from './Rating';

export function ProductCard({ product }: { product: ProductListItem }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const discount = discountPercent(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-raised">
      <div className="relative aspect-square overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {discount !== null && !soldOut && (
          <span className="absolute left-2 top-2 rounded-control bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
            {t('catalog.discountBadge', { percent: discount })}
          </span>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <span className="rounded-control bg-ink/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {t('catalog.soldOut')}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          {product.brand ?? product.category.name}
        </p>

        <h3 className="text-sm font-semibold leading-snug">
          {/*
            Toàn bộ thẻ là vùng bấm được nhờ ::after phủ lên, nhưng phần tử có
            thể focus vẫn chỉ là MỘT liên kết quanh tên sản phẩm. Bọc cả thẻ
            trong <a> sẽ khiến trình đọc màn hình xướng lại toàn bộ nội dung ảnh,
            giá, đánh giá như một cái tên liên kết dài dằng dặc.
          */}
          <Link to={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        <Rating average={product.ratingAverage} count={product.reviewCount} />

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="text-base font-bold text-brand-600">
            {formatMoney(product.price, locale)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-ink-subtle line-through">
              {formatMoney(product.compareAtPrice, locale)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
