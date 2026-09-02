import { useCallback, useEffect, useState } from 'react';
import { API_PREFIX, type ApiResponse, type HealthCheckData } from '@ecom/shared';

type Probe =
  | { phase: 'loading' }
  | { phase: 'ready'; data: HealthCheckData }
  | { phase: 'unreachable'; reason: string };

/**
 * Trang kiểm chứng của Phase 0.
 *
 * Mục đích duy nhất: chứng minh ba mắt xích đã nối thông — web gọi được api,
 * api nói chuyện được với database, và cả hai dùng chung kiểu dữ liệu từ
 * packages/shared. Phase 5 sẽ thay trang này bằng bộ khung giao diện thật.
 */
export default function App() {
  const [probe, setProbe] = useState<Probe>({ phase: 'loading' });

  const check = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${API_PREFIX}/health`, { signal });
      const body = (await response.json()) as ApiResponse<HealthCheckData>;

      if (body.success) {
        setProbe({ phase: 'ready', data: body.data });
      } else {
        setProbe({ phase: 'unreachable', reason: body.error.code });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setProbe({ phase: 'unreachable', reason: 'API_UNREACHABLE' });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    return () => controller.abort();
  }, [check]);

  const apiUp = probe.phase === 'ready';
  const dbUp = probe.phase === 'ready' && probe.data.database.connected;
  const dbError = probe.phase === 'ready' ? probe.data.database.error : null;

  const dotState = (up: boolean) => (up ? 'ok' : probe.phase === 'loading' ? '' : 'fail');

  return (
    <main className="shell">
      <p className="eyebrow">Phase 0 · Nền móng</p>
      <h1>E-Commerce Platform</h1>
      <p className="subtitle">
        Bộ khung monorepo đã dựng xong. Trang này kiểm tra ba mắt xích của hệ thống.
      </p>

      <div className="card">
        <div className="row">
          <span className="dot ok" />
          <span className="label">Frontend</span>
          <span className="value">Vite · React 18 · TS</span>
        </div>

        <div className="row">
          <span className={`dot ${dotState(apiUp)}`} />
          <span className="label">Backend API</span>
          <span className="value">
            {probe.phase === 'loading' && 'đang kiểm tra…'}
            {probe.phase === 'ready' && `v${probe.data.version} · ${probe.data.environment}`}
            {probe.phase === 'unreachable' && probe.reason}
          </span>
        </div>

        <div className="row">
          <span className={`dot ${dotState(dbUp)}`} />
          <span className="label">PostgreSQL</span>
          <span className="value">
            {probe.phase === 'loading' && 'đang kiểm tra…'}
            {probe.phase === 'ready' &&
              (probe.data.database.connected
                ? `${probe.data.database.latencyMs} ms`
                : 'chưa kết nối')}
            {probe.phase === 'unreachable' && '—'}
          </span>
        </div>

        <div className="row">
          <span className="dot ok" />
          <span className="label">Kiểu dùng chung</span>
          <span className="value">@ecom/shared</span>
        </div>
      </div>

      {probe.phase === 'unreachable' && (
        <p className="hint">
          Chưa gọi được API. Kiểm tra <code>pnpm dev</code> đã chạy chưa.
        </p>
      )}

      {dbError && (
        <div className="diagnostic">
          <p className="diagnostic-title">Lý do PostgreSQL đỏ</p>
          <p className="diagnostic-body">{dbError}</p>
          <p className="diagnostic-hint">
            Chạy <code>docker compose ps</code> để xem container, và <code>pnpm db:up</code> nếu nó
            chưa chạy.
          </p>
        </div>
      )}

      {probe.phase !== 'loading' && (
        <button className="retry" type="button" onClick={() => void check()}>
          Kiểm tra lại
        </button>
      )}
    </main>
  );
}
