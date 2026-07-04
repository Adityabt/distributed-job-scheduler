import { JOB_STAGES, STATUS_COLOR } from '../../constants/jobStatus';

export default function StatusRail({ jobs }) {
  const counts = JOB_STAGES.map((s) => jobs.filter((j) => j.status === s).length);
  const total = Math.max(counts.reduce((a, b) => a + b, 0), 1);

  return (
    <div style={{ border: '1px solid #1E2932', borderRadius: 6, padding: 14, background: '#0E1419' }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#101720', marginBottom: 10 }}>
        {JOB_STAGES.map((s, i) => counts[i] > 0 && (
          <div key={s} style={{ width: `${(counts[i] / total) * 100}%`, background: STATUS_COLOR[s] }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#7A8A96' }}>
        {JOB_STAGES.map((s, i) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[s] }} />
            {s.replace('_', ' ')} <b style={{ color: '#D8E1E8' }}>{counts[i]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
