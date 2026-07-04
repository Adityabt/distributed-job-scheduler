import { useState } from 'react';
import Field from '../ui/Field';
import { JOB_TYPES } from '../../constants/jobStatus';

export default function NewJobForm({ onSubmit }) {
  const [type, setType] = useState('immediate');
  const [payload, setPayload] = useState('{}');
  const [runAt, setRunAt] = useState('');
  const [cron, setCron] = useState('');
  const [priority, setPriority] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        throw new Error('Payload must be valid JSON');
      }

      const body = { type, payload: parsedPayload, priority: Number(priority), max_attempts: Number(maxAttempts) };
      if (type === 'delayed' || type === 'scheduled') body.run_at = new Date(runAt).toISOString();
      if (type === 'recurring') body.cron_expression = cron;

      await onSubmit(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="type">
        <select className="djs-input" value={type} onChange={(e) => setType(e.target.value)}>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      {(type === 'delayed' || type === 'scheduled') && (
        <Field label="run at">
          <input className="djs-input" required type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
        </Field>
      )}

      {type === 'recurring' && (
        <Field label="cron expression">
          <input className="djs-input" required placeholder="*/5 * * * *" value={cron} onChange={(e) => setCron(e.target.value)} />
        </Field>
      )}

      <Field label="payload (json)">
        <textarea
          className="djs-input"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={4}
          style={{ resize: 'vertical' }}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="priority">
          <input className="djs-input" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </Field>
        <Field label="max attempts">
          <input className="djs-input" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
        </Field>
      </div>

      {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 12 }}>
        {busy ? 'working…' : 'create job'}
      </button>
    </form>
  );
}
