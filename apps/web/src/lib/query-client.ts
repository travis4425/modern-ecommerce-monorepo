import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Thử lại chỉ có nghĩa khi lỗi là tạm thời.
       *
       * 404 thì gọi lại vẫn 404; 403 thì gọi lại vẫn 403 — thử lại chỉ làm
       * người dùng chờ lâu gấp ba rồi vẫn thấy đúng thông báo đó. Lỗi mạng và
       * lỗi 5xx thì ngược lại, đáng thử thêm.
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      // Mặc định của React Query là gọi lại mỗi khi người dùng quay lại tab.
      // Với dữ liệu danh mục sản phẩm thì đó là lưu lượng thừa.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
