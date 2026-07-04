import Badge from '../ui/Badge';

export default function JobTable({ jobs, onSelectJob }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 130px 80px 140px', padding: '8px 14px',
        borderBottom: '1px solid var(--border)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-faint)',
      }}>
        <span>payload</span><span>type</span><span>status</span><span>attempts</span><span>created</span>
      </div>

      {jobs.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>No jobs match this filter.</div>
      ) : jobs.map((j) => (
        <div
          key={j.id}
          onClick={() => onSelectJob(j.id)}
          className="djs-row"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 90px 130px 80px 140px', padding: '10px 14px',
            borderBottom: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {JSON.stringify(j.payload)}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>{j.type}</span>
          <Badge status={j.status} />
          <span style={{ color: 'var(--text-dim)' }}>{j.attempt_count}/{j.max_attempts}</span>
          <span style={{ color: 'var(--text-faint)' }}>{new Date(j.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}