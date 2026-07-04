import { STATUS_COLOR } from '../../constants/jobStatus';

export default function Badge({ status }) {
  const color = STATUS_COLOR[status] || 'var(--text-dim)';
  const live = status === 'running' || status === 'claimed';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 3, border: `1px solid ${color}55`, color,
      whiteSpace: 'nowrap', width: 'fit-content', justifySelf: 'start',
    }}>
      <span
        className={live ? 'djs-pulse' : ''}
        style={{ width: 6, height: 6, minWidth: 6, minHeight: 6, flexShrink: 0, borderRadius: '50%', background: color }}
      />
      {status.replace('_', ' ')}
    </span>
  );
}