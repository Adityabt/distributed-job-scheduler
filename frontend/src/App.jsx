import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Plus, ChevronRight, X, Clock, Layers, Zap, RotateCw, LogOut } from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

const STATUS_COLOR = {
  queued: '#F5A623',
  scheduled: '#F5A623',
  claimed: '#4FD1C5',
  running: '#4FD1C5',
  completed: '#3DDC84',
  failed: '#EF4444',
  dead_letter: '#EF4444',
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  .djs { font-family: 'JetBrains Mono', ui-monospace, monospace; background: #0B0F14; color: #D8E1E8; min-height: 100vh; }
  .djs h1, .djs h2, .djs h3, .djs .disp { font-family: 'Space Grotesk', ui-sans-serif, sans-serif; }
  .djs ::selection { background: #F5A62344; }
  .djs input, .djs select, .djs button { font-family: inherit; }
  .djs-scroll::-webkit-scrollbar { width: 6px; }
  .djs-scroll::-webkit-scrollbar-thumb { background: #1E2932; border-radius: 3px; }
  .djs-fade { animation: djsFade .25s ease both; }
  @keyframes djsFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .djs-pulse { animation: djsPulse 1.8s ease-in-out infinite; }
  @keyframes djsPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  .djs-btn { cursor: pointer; border: 1px solid #1E2932; background: #101720; color: #D8E1E8; transition: all .15s ease; }
  .djs-btn:hover { border-color: #F5A623; color: #F5A623; }
  .djs-btn:focus-visible { outline: 2px solid #F5A623; outline-offset: 2px; }
  .djs-btn-primary { background: #F5A623; border-color: #F5A623; color: #0B0F14; font-weight: 600; }
  .djs-btn-primary:hover { background: #ffb944; color: #0B0F14; }
  .djs-row:hover { background: #101720; }
  @media (max-width: 720px) { .djs-sidebar { display: none; } }
`;

function useAuth() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  return { token, user, setToken, setUser };
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function Badge({ status }) {
  const color = STATUS_COLOR[status] || '#7A8A96';
  const live = status === 'running' || status === 'claimed';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 3, border: `1px solid ${color}55`, color,
    }}>
      <span className={live ? 'djs-pulse' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {status.replace('_', ' ')}
    </span>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const data = await api(path, { method: 'POST', body });
      onAuthed(data.token, data.user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="djs djs-fade" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <style>{STYLES}</style>
      <div style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 10, height: 10, background: '#F5A623', borderRadius: 2 }} />
          <h1 className="disp" style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-.01em' }}>
            job<span style={{ color: '#F5A623' }}>rail</span>
          </h1>
        </div>
        <form onSubmit={submit} style={{ border: '1px solid #1E2932', borderRadius: 6, padding: 24, background: '#0E1419' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#101720', borderRadius: 5, padding: 3 }}>
            {['login', 'register'].map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase',
                  background: mode === m ? '#F5A623' : 'transparent',
                  color: mode === m ? '#0B0F14' : '#7A8A96', fontWeight: 600,
                }}>{m}</button>
            ))}
          </div>

          {mode === 'register' && (
            <Field label="name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          )}
          <Field label="email">
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="password">
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          {err && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}

          <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '10px 0', borderRadius: 5, fontSize: 13 }}>
            {busy ? 'working…' : mode === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#7A8A96', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      {children}
      <style>{`
        .djs input, .djs select {
          width: 100%; background: #101720; border: 1px solid #1E2932; color: #D8E1E8;
          padding: 9px 10px; border-radius: 4px; font-size: 13px;
        }
        .djs input:focus, .djs select:focus { outline: none; border-color: #F5A623; }
      `}</style>
    </label>
  );
}

function Panel({ title, action, children, empty }) {
  return (
    <div style={{ border: '1px solid #1E2932', borderRadius: 6, background: '#0E1419', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1E2932' }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#7A8A96' }}>{title}</span>
        {action}
      </div>
      {empty ? (
        <div style={{ padding: '28px 14px', textAlign: 'center', color: '#4A5A66', fontSize: 12 }}>{empty}</div>
      ) : (
        <div className="djs-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>{children}</div>
      )}
    </div>
  );
}

function IconBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} className="djs-btn"
      style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 4, padding: 0 }}>
      {children}
    </button>
  );
}

export default function App() {
  const { token, user, setToken, setUser } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [queues, setQueues] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [activeOrg, setActiveOrg] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [activeQueue, setActiveQueue] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobDetail, setJobDetail] = useState(null);

  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewQueue, setShowNewQueue] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, isErr) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3200);
  };

  const loadOrgs = useCallback(async () => {
    try { setOrgs(await api('/organizations', { token })); }
    catch (e) { notify(e.message, true); }
  }, [token]);

  const loadProjects = useCallback(async (orgId) => {
    try { setProjects(await api(`/projects?organization_id=${orgId}`, { token })); }
    catch (e) { notify(e.message, true); }
  }, [token]);

  const loadQueues = useCallback(async (projectId) => {
    try { setQueues(await api(`/queues?project_id=${projectId}`, { token })); }
    catch (e) { notify(e.message, true); }
  }, [token]);

  const loadJobs = useCallback(async (queueId, status) => {
    try {
      const q = status ? `&status=${status}` : '';
      setJobs(await api(`/jobs?queue_id=${queueId}${q}`, { token }));
    } catch (e) { notify(e.message, true); }
  }, [token]);

  useEffect(() => { if (token) loadOrgs(); }, [token, loadOrgs]);
  useEffect(() => { if (activeOrg) loadProjects(activeOrg.id); }, [activeOrg, loadProjects]);
  useEffect(() => { if (activeProject) loadQueues(activeProject.id); }, [activeProject, loadQueues]);
  useEffect(() => { if (activeQueue) loadJobs(activeQueue.id, statusFilter); }, [activeQueue, statusFilter, loadJobs]);

  if (!token) return <AuthScreen onAuthed={(t, u) => { setToken(t); setUser(u); }} />;

  const logout = () => {
    setToken(null); setUser(null); setOrgs([]); setProjects([]); setQueues([]); setJobs([]);
    setActiveOrg(null); setActiveProject(null); setActiveQueue(null);
  };

  const toggleQueue = async (q) => {
    try {
      const status = q.status === 'active' ? 'paused' : 'active';
      await api(`/queues/${q.id}/status`, { method: 'PATCH', token, body: { status } });
      loadQueues(activeProject.id);
      notify(`Queue ${status}`);
    } catch (e) { notify(e.message, true); }
  };

  const openJob = async (id) => {
    try { setJobDetail(await api(`/jobs/${id}`, { token })); }
    catch (e) { notify(e.message, true); }
  };

  return (
    <div className="djs">
      <style>{STYLES}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1E2932' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, background: '#F5A623', borderRadius: 2 }} />
          <span className="disp" style={{ fontSize: 16, fontWeight: 700 }}>job<span style={{ color: '#F5A623' }}>rail</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#7A8A96' }}>
          <span>{user?.email}</span>
          <IconBtn onClick={logout} title="Sign out"><LogOut size={13} /></IconBtn>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, padding: 16 }}>
        <div className="djs-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel title="Organizations" action={<IconBtn onClick={() => setShowNewOrg(true)} title="New org"><Plus size={13} /></IconBtn>}
            empty={orgs.length === 0 ? 'No organizations yet — create one to get started.' : null}>
            {orgs.map((o) => (
              <Row key={o.id} active={activeOrg?.id === o.id} onClick={() => { setActiveOrg(o); setActiveProject(null); setActiveQueue(null); setQueues([]); setJobs([]); }}>
                {o.name}
              </Row>
            ))}
          </Panel>

          {activeOrg && (
            <Panel title={`Projects — ${activeOrg.name}`} action={<IconBtn onClick={() => setShowNewProject(true)} title="New project"><Plus size={13} /></IconBtn>}
              empty={projects.length === 0 ? 'No projects in this org yet.' : null}>
              {projects.map((p) => (
                <Row key={p.id} active={activeProject?.id === p.id} onClick={() => { setActiveProject(p); setActiveQueue(null); setJobs([]); }}>
                  {p.name}
                </Row>
              ))}
            </Panel>
          )}

          {activeProject && (
            <Panel title={`Queues — ${activeProject.name}`} action={<IconBtn onClick={() => setShowNewQueue(true)} title="New queue"><Plus size={13} /></IconBtn>}
              empty={queues.length === 0 ? 'No queues in this project yet.' : null}>
              {queues.map((q) => (
                <Row key={q.id} active={activeQueue?.id === q.id} onClick={() => setActiveQueue(q)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.status === 'active' ? '#3DDC84' : '#4A5A66' }} />
                    {q.name}
                  </span>
                </Row>
              ))}
            </Panel>
          )}
        </div>

        <div>
          {!activeQueue ? (
            <div style={{ display: 'grid', placeItems: 'center', height: 320, color: '#4A5A66', fontSize: 13, border: '1px dashed #1E2932', borderRadius: 6 }}>
              Select or create a queue to view its job track.
            </div>
          ) : (
            <div className="djs-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 className="disp" style={{ margin: 0, fontSize: 18 }}>{activeQueue.name}</h2>
                  <div style={{ fontSize: 11, color: '#7A8A96', marginTop: 4 }}>
                    priority {activeQueue.priority} · concurrency {activeQueue.concurrency_limit} · retry {activeQueue.strategy_type} ×{activeQueue.max_retries}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="djs-btn" onClick={() => toggleQueue(activeQueue)} style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activeQueue.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                    {activeQueue.status === 'active' ? 'pause' : 'resume'}
                  </button>
                  <button className="djs-btn djs-btn-primary" onClick={() => setShowNewJob(true)} style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> new job
                  </button>
                </div>
              </div>

              <StatusRail jobs={jobs} />

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['', 'queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dead_letter'].map((s) => (
                  <button key={s || 'all'} onClick={() => setStatusFilter(s)} className="djs-btn"
                    style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11,
                      borderColor: statusFilter === s ? '#F5A623' : '#1E2932',
                      color: statusFilter === s ? '#F5A623' : '#7A8A96',
                    }}>{s || 'all'}</button>
                ))}
              </div>

              <div style={{ border: '1px solid #1E2932', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 140px', padding: '8px 14px', borderBottom: '1px solid #1E2932', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#4A5A66' }}>
                  <span>payload</span><span>type</span><span>status</span><span>attempts</span><span>created</span>
                </div>
                {jobs.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: '#4A5A66', fontSize: 12 }}>No jobs match this filter.</div>
                ) : jobs.map((j) => (
                  <div key={j.id} onClick={() => openJob(j.id)} className="djs-row"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 140px', padding: '10px 14px', borderBottom: '1px solid #131C24', fontSize: 12, cursor: 'pointer', alignItems: 'center' }}>
                    <span style={{ color: '#D8E1E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{JSON.stringify(j.payload)}</span>
                    <span style={{ color: '#7A8A96' }}>{j.type}</span>
                    <Badge status={j.status} />
                    <span style={{ color: '#7A8A96' }}>{j.attempt_count}/{j.max_attempts}</span>
                    <span style={{ color: '#4A5A66' }}>{new Date(j.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewOrg && <Modal onClose={() => setShowNewOrg(false)} title="New organization">
        <SimpleForm fields={[{ key: 'name', label: 'name' }]} submitLabel="create"
          onSubmit={async (v) => { await api('/organizations', { method: 'POST', token, body: v }); setShowNewOrg(false); loadOrgs(); notify('Organization created'); }} />
      </Modal>}

      {showNewProject && <Modal onClose={() => setShowNewProject(false)} title={`New project in ${activeOrg?.name}`}>
        <SimpleForm fields={[{ key: 'name', label: 'name' }]} submitLabel="create"
          onSubmit={async (v) => { await api('/projects', { method: 'POST', token, body: { ...v, organization_id: activeOrg.id } }); setShowNewProject(false); loadProjects(activeOrg.id); notify('Project created'); }} />
      </Modal>}

      {showNewQueue && <Modal onClose={() => setShowNewQueue(false)} title={`New queue in ${activeProject?.name}`}>
        <SimpleForm fields={[
          { key: 'name', label: 'name' },
          { key: 'priority', label: 'priority', type: 'number', default: 0 },
          { key: 'concurrency_limit', label: 'concurrency limit', type: 'number', default: 5 },
        ]} submitLabel="create"
          onSubmit={async (v) => {
            await api('/queues', { method: 'POST', token, body: { ...v, project_id: activeProject.id, priority: Number(v.priority) || 0, concurrency_limit: Number(v.concurrency_limit) || 5 } });
            setShowNewQueue(false); loadQueues(activeProject.id); notify('Queue created');
          }} />
      </Modal>}

      {showNewJob && <Modal onClose={() => setShowNewJob(false)} title={`New job in ${activeQueue?.name}`}>
        <NewJobForm onSubmit={async (v) => {
          await api('/jobs', { method: 'POST', token, body: { ...v, queue_id: activeQueue.id } });
          setShowNewJob(false); loadJobs(activeQueue.id, statusFilter); notify('Job created');
        }} />
      </Modal>}

      {jobDetail && <Modal onClose={() => setJobDetail(null)} title="Job detail" wide>
        <JobDetail job={jobDetail} />
      </Modal>}

      {toast && (
        <div className="djs-fade" style={{
          position: 'fixed', bottom: 20, right: 20, padding: '10px 16px', borderRadius: 5,
          background: toast.isErr ? '#2A1315' : '#0E1419', border: `1px solid ${toast.isErr ? '#EF4444' : '#3DDC84'}`,
          color: toast.isErr ? '#EF4444' : '#3DDC84', fontSize: 12,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

function Row({ children, active, onClick }) {
  return (
    <div onClick={onClick} className="djs-row" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 14px', fontSize: 12, cursor: 'pointer',
      background: active ? '#101720' : 'transparent', color: active ? '#F5A623' : '#D8E1E8',
      borderLeft: active ? '2px solid #F5A623' : '2px solid transparent',
    }}>
      {children}
      <ChevronRight size={12} color="#4A5A66" />
    </div>
  );
}

function StatusRail({ jobs }) {
  const stages = ['queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dead_letter'];
  const counts = stages.map((s) => jobs.filter((j) => j.status === s).length);
  const total = Math.max(counts.reduce((a, b) => a + b, 0), 1);
  return (
    <div style={{ border: '1px solid #1E2932', borderRadius: 6, padding: 14, background: '#0E1419' }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#101720', marginBottom: 10 }}>
        {stages.map((s, i) => counts[i] > 0 && (
          <div key={s} style={{ width: `${(counts[i] / total) * 100}%`, background: STATUS_COLOR[s] }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#7A8A96' }}>
        {stages.map((s, i) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[s] }} />
            {s.replace('_', ' ')} <b style={{ color: '#D8E1E8' }}>{counts[i]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0B0F14CC', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="djs-fade" style={{ width: wide ? 560 : 380, maxWidth: '100%', border: '1px solid #1E2932', borderRadius: 6, background: '#0E1419' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1E2932' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <IconBtn onClick={onClose} title="Close"><X size={13} /></IconBtn>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function SimpleForm({ fields, onSubmit, submitLabel }) {
  const init = Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
  const [v, setV] = useState(init);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await onSubmit(v); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="djs">
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          <input required type={f.type || 'text'} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
        </Field>
      ))}
      {err && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}
      <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 12 }}>
        {busy ? 'working…' : submitLabel}
      </button>
    </form>
  );
}

function NewJobForm({ onSubmit }) {
  const [type, setType] = useState('immediate');
  const [payload, setPayload] = useState('{}');
  const [runAt, setRunAt] = useState('');
  const [cron, setCron] = useState('');
  const [priority, setPriority] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      let parsedPayload;
      try { parsedPayload = JSON.parse(payload); } catch { throw new Error('Payload must be valid JSON'); }
      const body = { type, payload: parsedPayload, priority: Number(priority), max_attempts: Number(maxAttempts) };
      if (type === 'delayed' || type === 'scheduled') body.run_at = new Date(runAt).toISOString();
      if (type === 'recurring') body.cron_expression = cron;
      await onSubmit(body);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="djs">
      <Field label="type">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {['immediate', 'delayed', 'scheduled', 'recurring'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      {(type === 'delayed' || type === 'scheduled') && (
        <Field label="run at"><input required type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} /></Field>
      )}
      {type === 'recurring' && (
        <Field label="cron expression"><input required placeholder="*/5 * * * *" value={cron} onChange={(e) => setCron(e.target.value)} /></Field>
      )}
      <Field label="payload (json)">
        <textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={4}
          style={{ width: '100%', background: '#101720', border: '1px solid #1E2932', color: '#D8E1E8', padding: 9, borderRadius: 4, fontSize: 12, resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="priority"><input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></Field>
        <Field label="max attempts"><input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} /></Field>
      </div>
      {err && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}
      <button disabled={busy} className="djs-btn djs-btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 12 }}>
        {busy ? 'working…' : 'create job'}
      </button>
    </form>
  );
}

function JobDetail({ job }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge status={job.status} />
        <span style={{ color: '#4A5A66' }}>{job.id}</span>
      </div>
      <div>
        <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>payload</div>
        <pre style={{ background: '#101720', border: '1px solid #1E2932', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>{JSON.stringify(job.payload, null, 2)}</pre>
      </div>
      {job.schedule && (
        <div>
          <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> schedule</div>
          <pre style={{ background: '#101720', border: '1px solid #1E2932', borderRadius: 5, padding: 10, overflowX: 'auto', margin: 0 }}>{JSON.stringify(job.schedule, null, 2)}</pre>
        </div>
      )}
      <div>
        <div style={{ color: '#7A8A96', marginBottom: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}><RotateCw size={11} /> executions ({job.executions?.length || 0})</div>
        {(!job.executions || job.executions.length === 0) ? (
          <div style={{ color: '#4A5A66' }}>No execution attempts yet.</div>
        ) : job.executions.map((ex) => (
          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', border: '1px solid #1E2932', borderRadius: 4, marginBottom: 6 }}>
            <span>attempt {ex.attempt_number}</span>
            <Badge status={ex.status === 'succeeded' ? 'completed' : ex.status} />
          </div>
        ))}
      </div>
    </div>
  );
}