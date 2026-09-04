import {
  ERROR_CODES,
  type PaginationMeta,
  type ProductDetail,
  type ProductListItem,
} from '@ecom/shared';
import { NotFoundError } from '../../common/errors';
import { buildPaginationMeta, resolvePagination } from '../../common/http/pagination';
import { toMoneyString, toMoneyStringOrNull } from '../../common/http/money';
import { productRepository } from './product.repository';
import type { ListProductsQuery, ProductRawRow } from './product.types';

function toListItem(row: ProductRawRow): ProductListItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    price: toMoneyString(row.price),
    compareAtPrice: toMoneyStringOrNull(row.compare_at_price),
    ratingAverage: toMoneyString(row.rating_average),
    reviewCount: row.review_count,
    isFeatured: row.is_featured,
    imageUrl: row.image_url,
    stock: Number(row.stock),
    category: { name: row.category_name, slug: row.category_slug },
  };
}

export async function listProducts(
  query: ListProductsQuery,
): Promise<{ items: ProductListItem[]; meta: PaginationMeta }> {
  const { page, limit, skip } = resolvePagination(query);
  const { rows, total } = await productRepository.list({ ...query, limit }, skip);

  return { items: rows.map(toListItem), meta: buildPaginationMeta(total, page, limit) };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const product = await productRepository.findBySlug(slug);

  if (!product) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product "${slug}" not found`);
  }

  const stock = product.inventory?.quantity ?? 0;
  const threshold = product.inventory?.lowStockThreshold ?? 0;
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    // Prisma trả Decimal, driver pg trả chuỗi — toMoneyString gộp cả hai về
    // cùng một định dạng để hai endpoint không mâu thuẫn nhau.
    price: toMoneyString(product.price),
    compareAtPrice: toMoneyStringOrNull(product.compareAtPrice),
    ratingAverage: toMoneyString(product.ratingAverage),
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    imageUrl: primaryImage?.url ?? null,
    stock,
    category: product.category,
    description: product.description,
    shortDescription: product.shortDescription,
    images: product.images,
    attributes: product.attributes,
    // Cờ này để giao diện hiện "Chỉ còn N sản phẩm" — một tín hiệu khan hiếm
    // có thật, tính từ ngưỡng của kho chứ không phải con số bịa ra.
    lowStock: stock > 0 && stock <= threshold,
  };
}

/**
 * Bộ so sánh dùng chung cho mọi danh sách hiển thị cho người đọc.
 *
 * Node bản hiện đại đóng gói sẵn ICU đầy đủ, nên Intl.Collator cho ra CÙNG một
 * thứ tự trên mọi hệ điều hành — khác với ORDER BY của database (phụ thuộc
 * collation của cluster) và khác với Array.sort() mặc định của JavaScript (so
 * theo mã ký tự UTF-16, khiến 'ASUS' đứng trước 'Akko').
 *
 * `sensitivity: 'base'` bỏ qua khác biệt hoa thường và dấu, đúng cách người
 * đọc mong đợi một danh sách được xếp.
 */
const displayCollator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

export function compareForDisplay(a: string, b: string): number {
  return displayCollator.compare(a, b);
}

export async function listBrands(): Promise<string[]> {
  const brands = await productRepository.listDistinctBrands();
  return brands.sort(compareForDisplay);
}
