import type { ProductSort } from '@ecom/shared';

/** Tham số đã được validate của endpoint danh sách sản phẩm. */
export interface ListProductsQuery {
  page: number;
  limit: number;
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  brand?: string;
  inStock?: boolean;
  sort: ProductSort;
}

/**
 * Một dòng thô do PostgreSQL trả về.
 *
 * Kiểu numeric được driver pg trả về dưới dạng CHUỖI — cố ý, để không mất
 * chính xác. bigint (từ COUNT OVER) cũng vậy.
 */
export interface ProductRawRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string | null;
  price: string;
  compare_at_price: string | null;
  rating_average: string;
  review_count: number;
  is_featured: boolean;
  created_at: Date;
  category_name: string;
  category_slug: string;
  stock: number;
  image_url: string | null;
  total_count: string;
}
