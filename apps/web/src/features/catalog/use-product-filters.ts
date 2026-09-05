import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCT_SORTS, type ProductSort } from '@ecom/shared';
import type { ProductFilters } from './catalog.api';

const FILTER_KEYS = ['q', 'category', 'brand', 'minPrice', 'maxPrice', 'inStock'] as const;

function readSort(value: string | null): ProductSort | undefined {
  return PRODUCT_SORTS.includes(value as ProductSort) ? (value as ProductSort) : undefined;
}

/**
 * URL là NGUỒN SỰ THẬT DUY NHẤT của bộ lọc.
 *
 * Không có state song song trong component. Đổi lấy được ba thứ mà giữ state
 * riêng không bao giờ có: nút Back của trình duyệt lùi đúng một bước lọc, dán
 * link cho người khác thì họ thấy đúng kết quả đó, và F5 không mất gì.
 *
 * Cái giá phải trả là mọi thứ đều là chuỗi — nhưng backend cũng nhận chuỗi, nên
 * thật ra không có bước chuyển kiểu nào bị bỏ lỡ.
 */
export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<ProductFilters>(() => {
    const inStock = searchParams.get('inStock');

    return {
      page: searchParams.get('page') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      minPrice: searchParams.get('minPrice') ?? undefined,
      maxPrice: searchParams.get('maxPrice') ?? undefined,
      inStock: inStock === 'true' ? 'true' : undefined,
      sort: readSort(searchParams.get('sort')),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ProductFilters>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') next.delete(key);
            else next.set(key, value);
          }

          /**
           * Đổi bộ lọc thì luôn quay về trang 1.
           *
           * Không làm việc này là lỗi kinh điển: đang ở trang 5, lọc lại còn 2
           * trang, và người dùng nhận một danh sách rỗng dù rõ ràng có kết quả.
           * Trừ khi chính `page` là thứ vừa đổi.
           */
          if (!('page' in patch)) next.delete('page');

          return next;
        },
        // replace: true để mỗi ký tự gõ vào ô tìm kiếm không thành một mục
        // riêng trong lịch sử — nếu không, bấm Back mười lần mới thoát ra được.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const activeFilterCount = useMemo(
    () => FILTER_KEYS.filter((key) => Boolean(searchParams.get(key))).length,
    [searchParams],
  );

  return { filters, setFilters, clearFilters, activeFilterCount };
}
