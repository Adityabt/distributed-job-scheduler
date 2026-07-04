import { useState } from 'react';
import Field from './Field';

export default function SimpleForm({ fields, onSubmit, submitLabel }) {
  const initial = Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          <input
            className="djs-input"
            required
            type={f.type || 'text'}
            value={values[f.key]}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
          />
        </Field>
      ))}
      {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
      <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 12 }}>
        {busy ? 'working…' : submitLabel}
      </button>
    </form>
  );
}
