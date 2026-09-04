import type { ReactNode } from 'react';

/** Giới hạn bề rộng nội dung ở một chỗ duy nhất, để mọi trang thẳng hàng nhau. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
