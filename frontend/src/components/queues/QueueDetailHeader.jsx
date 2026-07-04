import { Play, Pause, Plus } from 'lucide-react';

export default function QueueDetailHeader({ queue, onToggleStatus, onNewJob }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div>
        <h2 className="disp" style={{ margin: 0, fontSize: 18 }}>{queue.name}</h2>
        <div style={{ fontSize: 11, color: '#7A8A96', marginTop: 4 }}>
          priority {queue.priority} · concurrency {queue.concurrency_limit} · retry {queue.strategy_type} ×{queue.max_retries}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="djs-btn"
          onClick={onToggleStatus}
          style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {queue.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
          {queue.status === 'active' ? 'pause' : 'resume'}
        </button>
        <button
          className="djs-btn djs-btn-primary"
          onClick={onNewJob}
          style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={13} /> new job
        </button>
      </div>
    </div>
  );
}
