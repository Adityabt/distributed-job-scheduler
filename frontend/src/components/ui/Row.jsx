import { ChevronRight } from 'lucide-react';

export default function Row({ children, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className="djs-row"
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 14px', fontSize: 12, cursor: 'pointer',
        background: active ? '#101720' : 'transparent',
        color: active ? '#F5A623' : '#D8E1E8',
        borderLeft: active ? '2px solid #F5A623' : '2px solid transparent',
      }}
    >
      {children}
      <ChevronRight size={12} color="#4A5A66" />
    </div>
  );
}
