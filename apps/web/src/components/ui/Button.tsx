import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Kiểu dáng khai báo một lần ở đây, không rải class Tailwind trong từng trang.
 * Đổi hình dáng nút toàn ứng dụng là sửa đúng ba dòng dưới.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'border border-line bg-surface text-ink hover:border-brand-400 hover:text-brand-600',
  ghost: 'text-ink-muted hover:bg-brand-50 hover:text-brand-600',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/**
 * Nút trông giống Button nhưng thật ra là liên kết.
 *
 * Điều hướng phải dùng thẻ <a>, không phải <button onClick>: chỉ liên kết mới
 * mở được bằng chuột giữa, mới hiện URL ở thanh trạng thái, và mới được trình
 * đọc màn hình xướng đúng vai trò.
 */
export function ButtonLink({
  to,
  variant = 'primary',
  className = '',
  external = false,
  children,
}: {
  to: string;
  variant?: Variant;
  className?: string;
  external?: boolean;
  children: ReactNode;
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (external) {
    return (
      <a className={classes} href={to} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} to={to}>
      {children}
    </Link>
  );
}
