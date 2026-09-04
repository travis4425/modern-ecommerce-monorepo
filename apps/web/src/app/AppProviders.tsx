import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';

/**
 * Một chỗ duy nhất lắp các provider.
 *
 * i18next KHÔNG cần provider: `import '../i18n'` ở main.tsx đã khởi tạo instance
 * toàn cục và react-i18next tự tìm tới nó. Bọc thêm <I18nextProvider> chỉ cần
 * khi ứng dụng chạy nhiều instance cùng lúc (SSR, micro-frontend).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
