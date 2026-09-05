import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
