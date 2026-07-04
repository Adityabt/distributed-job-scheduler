import { X } from 'lucide-react';
import IconButton from './IconButton';

export default function Modal({ title, children, onClose, wide }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#0B0F14CC', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="djs-fade"
        style={{ width: wide ? 560 : 380, maxWidth: '100%', border: '1px solid #1E2932', borderRadius: 6, background: '#0E1419' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1E2932' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <IconButton onClick={onClose} title="Close"><X size={13} /></IconButton>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
