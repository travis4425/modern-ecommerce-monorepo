import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { AppErrorBoundary } from '../components/layout/AppErrorBoundary';
import HomePage from '../routes/HomePage';
import SystemStatusPage from '../routes/SystemStatusPage';
import NotFoundPage from '../routes/NotFoundPage';

/**
 * Bảng route khai báo tập trung ở đây, không rải <Route> giữa các component.
 *
 * `errorElement` gắn ở gốc: mọi lỗi khi render hay khi loader chạy đều rơi vào
 * đó thay vì để lại màn hình trắng.
 *
 * Route '*' phải là phần tử CUỐI trong danh sách con — nó khớp mọi đường dẫn,
 * đặt sớm hơn thì các route thật phía sau không bao giờ tới lượt.
 *
 * Phase 7 sẽ bọc nhánh cần đăng nhập bằng một route <RequireAuth>; chỗ đó nằm
 * trong mảng children này, không phải rắc điều kiện vào từng trang.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'system', element: <SystemStatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
