import { useState } from 'react';
import { Clock, RotateCw, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';

export default function JobDetailView({ job, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete(job.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge status={job.status} />
        <span style={{ color: 'var(--text-faint)' }}>{job.id}</span>
      </div>

      <div>
        <div style={{ color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>payload</div>
        <pre style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>

      {job.schedule && (
        <div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} /> schedule
          </div>
          <pre style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>
            {JSON.stringify(job.schedule, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <div style={{ color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RotateCw size={11} /> executions ({job.executions?.length || 0})
        </div>
        {(!job.executions || job.executions.length === 0) ? (
          <div style={{ color: 'var(--text-faint)' }}>No execution attempts yet.</div>
        ) : job.executions.map((ex) => (
          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 6 }}>
            <span>attempt {ex.attempt_number}</span>
            <Badge status={ex.status === 'succeeded' ? 'completed' : ex.status} />
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="djs-btn"
            style={{ padding: '8px 14px', borderRadius: 5, fontSize: 12 }}
          >
            cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="djs-btn"
          style={{
            padding: '8px 14px', borderRadius: 5, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            borderColor: confirming ? 'var(--red)' : undefined,
            color: confirming ? 'var(--red)' : undefined,
          }}
        >
          <Trash2 size={13} />
          {busy ? 'deleting…' : confirming ? 'confirm delete' : 'delete job'}
        </button>
      </div>
    </div>
  );
}