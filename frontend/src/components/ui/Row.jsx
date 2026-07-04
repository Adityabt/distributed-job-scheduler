import { ChevronRight, Trash2 } from 'lucide-react';

export default function Row({ children, active, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className="djs-row"
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 14px', fontSize: 12, cursor: 'pointer',
        background: active ? 'var(--surface-hover)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text)',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        gap: 8,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, border: 'none', background: 'transparent',
              color: 'var(--text-faint)', cursor: 'pointer', borderRadius: 3,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
          >
            <Trash2 size={12} />
          </button>
        )}
        <ChevronRight size={12} color="var(--text-faint)" />
      </span>
    </div>
  );
}