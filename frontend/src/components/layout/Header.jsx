import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import IconButton from '../ui/IconButton';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} />
        <span className="disp" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          re<span style={{ color: 'var(--accent)' }}>lay</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', borderLeft: '1px solid var(--border)', paddingLeft: 10, marginLeft: 2 }}>
          distributed job scheduler
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-dim)' }}>
        <span>{user?.email}</span>
        <IconButton onClick={logout} title="Sign out"><LogOut size={13} /></IconButton>
      </div>
    </header>
  );
}