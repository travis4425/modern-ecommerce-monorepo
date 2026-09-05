import { useState } from 'react';

/**
 * Ảnh sản phẩm có đường lui.
 *
 * Ảnh hỏng là chuyện bình thường: liên kết ngoài chết, mạng rớt, tệp bị xoá.
 * Không xử lý thì trình duyệt vẽ ra biểu tượng ảnh vỡ xấu xí giữa lưới sản
 * phẩm. Ở đây rơi về một ô nền có chữ cái đầu — vẫn cân đối, vẫn đọc được.
 */
export function ProductImage({
  src,
  alt,
  className = '',
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-50 text-brand-200 ${className}`}
        aria-hidden
      >
        <span className="text-3xl font-bold">{alt.trim().charAt(0).toUpperCase() || '?'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      // loading="lazy" để lưới nhiều sản phẩm không tải hết ảnh ngay lập tức.
      loading="lazy"
      // decoding="async" giữ cho việc giải mã ảnh không chặn luồng dựng trang.
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-brand-50 object-cover ${className}`}
    />
  );
}
