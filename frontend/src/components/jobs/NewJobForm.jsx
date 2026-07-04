import { useState } from 'react';
import Field from '../ui/Field';
import { JOB_TYPES } from '../../constants/jobStatus';

const CRON_PRESETS = [
  { label: 'Every 1 minute', value: '*/1 * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Custom…', value: 'custom' },
];

const DELAY_PRESETS = [
  { label: 'In 1 minute', minutes: 1 },
  { label: 'In 5 minutes', minutes: 5 },
  { label: 'In 30 minutes', minutes: 30 },
  { label: 'In 1 hour', minutes: 60 },
  { label: 'Custom date & time…', minutes: null },
];

const TASK_PRESETS = [
  { label: 'Send email', payload: { task: 'send_email', to: 'user@example.com', template: 'welcome' } },
  { label: 'Sync inventory', payload: { task: 'sync_inventory' } },
  { label: 'Resize image', payload: { task: 'resize_image', file: 'banner.jpg', width: 800 } },
  { label: 'Generate report', payload: { task: 'generate_report', type: 'weekly' } },
  { label: 'Custom (advanced)…', payload: null },
];

export default function NewJobForm({ onSubmit }) {
  const [type, setType] = useState('immediate');

  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[1].value);
  const [customCron, setCustomCron] = useState('');

  const [delayPreset, setDelayPreset] = useState(DELAY_PRESETS[0].minutes);
  const [runAt, setRunAt] = useState('');

  const [taskIndex, setTaskIndex] = useState(0);
  const [customPayload, setCustomPayload] = useState('{}');

  const [priority, setPriority] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isCustomTask = TASK_PRESETS[taskIndex].payload === null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let payload = TASK_PRESETS[taskIndex].payload;
      if (isCustomTask) {
        try {
          payload = JSON.parse(customPayload);
        } catch {
          throw new Error('Custom payload must be valid JSON');
        }
      }

      const body = { type, payload, priority: Number(priority), max_attempts: Number(maxAttempts) };

      if (type === 'delayed' || type === 'scheduled') {
        if (delayPreset === null) {
          if (!runAt) throw new Error('Pick a date & time');
          body.run_at = new Date(runAt).toISOString();
        } else {
          body.run_at = new Date(Date.now() + delayPreset * 60000).toISOString();
        }
      }

      if (type === 'recurring') {
        body.cron_expression = cronPreset === 'custom' ? customCron : cronPreset;
        if (!body.cron_expression) throw new Error('Enter a cron expression');
      }

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
        <>
          <Field label="when">
            <select
              className="djs-input"
              value={delayPreset === null ? 'custom' : delayPreset}
              onChange={(e) => setDelayPreset(e.target.value === 'custom' ? null : Number(e.target.value))}
            >
              {DELAY_PRESETS.map((d) => (
                <option key={d.label} value={d.minutes === null ? 'custom' : d.minutes}>{d.label}</option>
              ))}
            </select>
          </Field>
          {delayPreset === null && (
            <Field label="date & time">
              <input className="djs-input" required type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
            </Field>
          )}
        </>
      )}

      {type === 'recurring' && (
        <>
          <Field label="repeat">
            <select className="djs-input" value={cronPreset} onChange={(e) => setCronPreset(e.target.value)}>
              {CRON_PRESETS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          {cronPreset === 'custom' && (
            <Field label="cron expression">
              <input className="djs-input" required placeholder="*/5 * * * *" value={customCron} onChange={(e) => setCustomCron(e.target.value)} />
            </Field>
          )}
        </>
      )}

      <Field label="what should this job do">
        <select className="djs-input" value={taskIndex} onChange={(e) => setTaskIndex(Number(e.target.value))}>
          {TASK_PRESETS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
        </select>
      </Field>

      {isCustomTask && (
        <Field label="payload (json)">
          <textarea
            className="djs-input"
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </Field>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="priority">
          <input className="djs-input" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </Field>
        <Field label="max attempts">
          <input className="djs-input" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
        </Field>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 12 }}>
        {busy ? 'working…' : 'create job'}
      </button>
    </form>
  );
}