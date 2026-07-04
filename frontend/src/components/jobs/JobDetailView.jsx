import { Clock, RotateCw } from 'lucide-react';
import Badge from '../ui/Badge';

export default function JobDetailView({ job }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge status={job.status} />
        <span style={{ color: '#4A5A66' }}>{job.id}</span>
      </div>

      <div>
        <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>payload</div>
        <pre style={{ background: '#101720', border: '1px solid #1E2932', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>

      {job.schedule && (
        <div>
          <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} /> schedule
          </div>
          <pre style={{ background: '#101720', border: '1px solid #1E2932', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>
            {JSON.stringify(job.schedule, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RotateCw size={11} /> executions ({job.executions?.length || 0})
        </div>
        {(!job.executions || job.executions.length === 0) ? (
          <div style={{ color: '#4A5A66' }}>No execution attempts yet.</div>
        ) : job.executions.map((ex) => (
          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', border: '1px solid #1E2932', borderRadius: 4, marginBottom: 6 }}>
            <span>attempt {ex.attempt_number}</span>
            <Badge status={ex.status === 'succeeded' ? 'completed' : ex.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
