import type {
  CategoryNode,
  PaginationMeta,
  ProductDetail,
  ProductListItem,
  ProductSort,
} from '@ecom/shared';
import { apiRequest, apiRequestWithMeta } from '../../lib/api-client';

/**
 * Bộ lọc danh sách sản phẩm — đúng hình dạng mà backend nhận.
 *
 * Mọi trường đều là CHUỖI hoặc undefined, kể cả giá và trang, vì nguồn duy nhất
 * của chúng là query string trên URL. Đổi qua number rồi lại đổi về chuỗi ở
 * giữa đường chỉ tạo thêm chỗ để lệch nhau.
 */
export interface ProductFilters {
  page?: string;
  limit?: string;
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: 'true' | 'false';
  sort?: ProductSort;
}

/** Bỏ mọi tham số rỗng: '?q=&brand=' làm URL bẩn và làm hỏng khoá cache. */
export function toSearchParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  return params;
}

export async function fetchProducts(
  filters: ProductFilters,
  signal?: AbortSignal,
): Promise<{ items: ProductListItem[]; meta: PaginationMeta }> {
  const query = toSearchParams(filters).toString();
  const result = await apiRequestWithMeta<ProductListItem[]>(
    `/products${query ? `?${query}` : ''}`,
    signal ? { signal } : {},
  );

  return {
    items: result.data,
    // meta luôn có ở endpoint danh sách; giá trị dự phòng chỉ để kiểu không
    // phải optional ở mọi nơi phía dưới.
    meta: result.meta ?? {
      page: 1,
      limit: result.data.length,
      total: result.data.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export function fetchProductBySlug(slug: string, signal?: AbortSignal): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/products/${slug}`, signal ? { signal } : {});
}

export function fetchBrands(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<string[]>('/products/brands', signal ? { signal } : {});
}

export function fetchCategories(signal?: AbortSignal): Promise<CategoryNode[]> {
  return apiRequest<CategoryNode[]>('/categories', signal ? { signal } : {});
}
