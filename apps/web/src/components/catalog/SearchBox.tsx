import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Ô tìm kiếm có hoãn.
 *
 * Gõ tới đâu gọi API tới đó thì mỗi chữ cái là một request, và request về sau
 * có thể tới trước request về trước — người dùng gõ "ban phim" rồi nhìn thấy
 * kết quả của "ban ph". Hoãn 350 ms: đủ để không thấy trễ, đủ để gộp cả một từ
 * thành một lần gọi.
 *
 * `onChange` BẮT BUỘC phải ổn định giữa các lần render (bọc `useCallback` ở
 * phía gọi). Nó nằm trong mảng phụ thuộc của effect dưới đây; nếu mỗi lần render
 * lại là một hàm mới thì bộ đếm bị dọn và dựng lại liên tục, và lần hoãn không
 * bao giờ chạm đích.
 */
export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [seenValue, setSeenValue] = useState(value);

  /**
   * Đồng bộ ngược khi URL đổi từ bên ngoài — bấm Back, bấm "Xoá bộ lọc", mở một
   * đường dẫn đã dán sẵn.
   *
   * Đây là mẫu "chỉnh state ngay trong lúc render" mà React khuyến nghị cho
   * trường hợp này, KHÔNG dùng useEffect. Effect chạy sau khi trình duyệt đã vẽ
   * xong, nên người dùng sẽ thấy giá trị cũ nhấp nháy một khung hình rồi mới
   * đổi. Cách này React huỷ luôn lần render dở dang và dựng lại ngay, không
   * kịp lọt ra màn hình.
   */
  if (value !== seenValue) {
    setSeenValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;

    const timer = window.setTimeout(() => onChange(draft), 350);
    // Dọn bộ đếm ở mỗi lần gõ tiếp — đây chính là phần làm nên "hoãn".
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className="relative flex-1">
      <label className="sr-only" htmlFor="product-search">
        {t('catalog.searchLabel')}
      </label>
      <input
        id="product-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t('catalog.searchPlaceholder')}
        className="w-full rounded-control border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-subtle focus:border-brand-400"
      />
    </div>
  );
}
