type State = 'pending' | 'ok' | 'fail';

const STYLES: Record<State, string> = {
  pending: 'bg-ink-subtle',
  ok: 'bg-success ring-4 ring-success-soft',
  fail: 'bg-danger ring-4 ring-danger-soft',
};

/** Chấm trạng thái. `aria-hidden` vì nghĩa của nó đã nằm trong chữ bên cạnh. */
export function StatusDot({ state }: { state: State }) {
  return <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${STYLES[state]}`} />;
}
