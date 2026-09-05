import type { ProductListItem } from '@ecom/shared';
import { ProductCard } from './ProductCard';

const GRID = 'grid grid-cols-2 gap-4 lg:grid-cols-3';

/**
 * Khung xương giữ ĐÚNG kích thước của thẻ thật (ảnh vuông + ba dòng chữ).
 *
 * Khung xương lệch kích thước còn tệ hơn không có: nội dung thật về là cả trang
 * giật một cái, và người dùng đang định bấm vào đâu thì bấm nhầm chỗ khác.
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="aspect-square animate-pulse bg-line/60" />
          <div className="space-y-2 p-3.5">
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-line/60" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-line/60" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-line/60" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-line/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
