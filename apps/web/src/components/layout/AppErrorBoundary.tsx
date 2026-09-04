import { useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';

/**
 * Ranh giới lỗi ở cấp route.
 *
 * Không có nó, một lỗi khi render bất kỳ trang nào sẽ làm React gỡ toàn bộ cây
 * component và người dùng nhìn thấy màn hình trắng — không thông báo, không lối
 * thoát. Ở đây ít nhất họ còn header, còn nút tải lại, và còn đổi được ngôn ngữ.
 */
export function AppErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();

  // Chi tiết lỗi chỉ đi vào console cho lập trình viên. Người dùng nhận câu
  // giải thích, không nhận stack trace.
  console.error('Lỗi không bắt được ở tầng route:', error);

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t('errorBoundary.title')}</h1>
      <p className="max-w-md text-ink-muted">{t('errorBoundary.body')}</p>
      <Button onClick={() => window.location.reload()}>{t('errorBoundary.reload')}</Button>
    </Container>
  );
}
