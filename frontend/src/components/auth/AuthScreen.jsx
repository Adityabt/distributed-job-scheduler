import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Field from '../ui/Field';

export default function AuthScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const data = await api(path, { method: 'POST', body });
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="djs djs-fade" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <div style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} />
            <h1 className="disp" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              re<span style={{ color: 'var(--accent)' }}>lay</span>
            </h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6, marginLeft: 20 }}>
            Sign in to manage queues and track jobs across your projects.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="djs-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-elevated)', borderRadius: 5, padding: 3 }}>
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? 'var(--accent-ink)' : 'var(--text-dim)', fontWeight: 600,
                  transition: 'all .15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <Field label="name">
              <input className="djs-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          )}
          <Field label="email">
            <input className="djs-input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="password">
            <input className="djs-input" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '10px 0', borderRadius: 5, fontSize: 13 }}>
            {busy ? 'working…' : mode === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>
      </div>
    </div>
  );
}