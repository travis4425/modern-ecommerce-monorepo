import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { HealthCheckData } from '@ecom/shared';
import { apiRequest } from '../lib/api-client';
import { useErrorMessage } from '../lib/use-error-message';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { StatusDot } from '../components/ui/StatusDot';

type Row = { label: string; value: string; state: 'pending' | 'ok' | 'fail' };

export default function SystemStatusPage() {
  const { t } = useTranslation();
  const describeError = useErrorMessage();

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest<HealthCheckData>('/health'),
    // Trang chẩn đoán phải phản ánh hiện tại, không phải bộ nhớ đệm 30 giây trước.
    staleTime: 0,
  });

  const data = health.data;
  const state = (ok: boolean): Row['state'] => (health.isPending ? 'pending' : ok ? 'ok' : 'fail');

  const rows: Row[] = [
    { label: t('system.frontend'), value: 'Vite · React 18 · TS', state: 'ok' },
    {
      label: t('system.backend'),
      value: health.isPending
        ? t('system.checking')
        : data
          ? `v${data.version} · ${data.environment}`
          : describeError(health.error),
      state: state(Boolean(data)),
    },
    {
      label: t('system.database'),
      // Kiểm cả `latencyMs !== null` chứ không chỉ `connected`: kiểu dữ liệu
      // cho phép hai trường lệch nhau, và bỏ qua thì giao diện hiện "null ms".
      // Contract kiểu của i18next là thứ bắt được chuyện này lúc biên dịch.
      value: health.isPending
        ? t('system.checking')
        : data?.database.connected && data.database.latencyMs !== null
          ? t('system.latency', { ms: data.database.latencyMs })
          : t('system.notConnected'),
      state: state(Boolean(data?.database.connected)),
    },
    {
      label: t('system.seed'),
      value: health.isPending
        ? t('system.checking')
        : data?.catalog
          ? t('system.catalogSummary', {
              categories: data.catalog.categories,
              products: data.catalog.products,
            })
          : t('system.notSeeded'),
      state: state((data?.catalog?.products ?? 0) > 0),
    },
    { label: t('system.sharedTypes'), value: '@ecom/shared', state: 'ok' },
  ];

  return (
    <Container className="max-w-2xl py-14">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
        {t('system.eyebrow')}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t('system.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('system.subtitle')}</p>

      <dl className="mt-8 divide-y divide-line rounded-card border border-line bg-surface px-5 shadow-card">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-3.5">
            <StatusDot state={row.state} />
            <dt className="text-sm font-semibold">{row.label}</dt>
            <dd className="ml-auto text-right font-mono text-xs tabular-nums text-ink-muted">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {health.isError && <p className="mt-4 text-sm text-ink-subtle">{t('system.hint')}</p>}

      {data?.database.error && (
        <div className="mt-4 rounded-r-card border-l-[3px] border-danger bg-danger-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-danger">
            {t('system.diagnosticTitle')}
          </p>
          <p className="mt-1.5 break-words font-mono text-xs leading-relaxed">
            {data.database.error}
          </p>
          <p className="mt-2 text-sm text-ink-muted">{t('system.diagnosticHint')}</p>
        </div>
      )}

      <Button
        variant="secondary"
        className="mt-6"
        disabled={health.isFetching}
        onClick={() => void health.refetch()}
      >
        {health.isFetching ? t('common.loading') : t('common.retry')}
      </Button>
    </Container>
  );
}
