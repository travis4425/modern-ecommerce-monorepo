import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchBrands, fetchCategories, fetchProductBySlug, fetchProducts } from './catalog.api';
import type { ProductFilters } from './catalog.api';

/**
 * Khoá cache gom về một chỗ.
 *
 * Rải chuỗi khoá khắp nơi là cách nhanh nhất để hai chỗ cùng đọc một dữ liệu mà
 * dùng hai khoá khác nhau — rồi làm mới chỗ này không cập nhật chỗ kia, và
 * không ai hiểu vì sao.
 */
export const catalogKeys = {
  all: ['catalog'] as const,
  products: (filters: ProductFilters) => [...catalogKeys.all, 'products', filters] as const,
  product: (slug: string) => [...catalogKeys.all, 'product', slug] as const,
  brands: () => [...catalogKeys.all, 'brands'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: ({ signal }) => fetchProducts(filters, signal),
    /**
     * Giữ kết quả cũ trong lúc tải trang mới.
     *
     * Không có nó, mỗi lần đổi bộ lọc hay sang trang là lưới sản phẩm biến mất
     * rồi hiện lại, trang nhảy lên đầu và người dùng mất chỗ đang xem. Giữ lại
     * dữ liệu cũ và làm mờ đi thì chuyển cảnh êm hơn hẳn.
     */
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: ({ signal }) => fetchProductBySlug(slug, signal),
    enabled: slug.length > 0,
  });
}

/** Danh mục và thương hiệu gần như không đổi trong một phiên: giữ lâu hơn nhiều. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: catalogKeys.brands(),
    queryFn: ({ signal }) => fetchBrands(signal),
    staleTime: 5 * 60_000,
  });
}
