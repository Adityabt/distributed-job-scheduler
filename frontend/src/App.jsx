import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useOrganizations } from './hooks/useOrganizations';
import { useProjects } from './hooks/useProjects';
import { useQueues } from './hooks/useQueues';
import { useJobs } from './hooks/useJobs';

import AuthScreen from './components/auth/AuthScreen';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import QueueDetailHeader from './components/queues/QueueDetailHeader';
import StatusRail from './components/queues/StatusRail';
import StatusFilterBar from './components/jobs/StatusFilterBar';
import JobTable from './components/jobs/JobTable';
import NewJobForm from './components/jobs/NewJobForm';
import JobDetailView from './components/jobs/JobDetailView';
import Modal from './components/ui/Modal';
import SimpleForm from './components/ui/SimpleForm';
import ToastViewport from './components/ui/ToastViewport';

export default function App() {
  const { token } = useAuth();

  const { orgs, loadOrgs, createOrg } = useOrganizations();
  const { projects, loadProjects, createProject } = useProjects();
  const { queues, loadQueues, createQueue, toggleQueueStatus } = useQueues();
  const { jobs, loadJobs, createJob, jobDetail, openJobDetail, closeJobDetail } = useJobs();

  const [activeOrg, setActiveOrg] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [activeQueue, setActiveQueue] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewQueue, setShowNewQueue] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);

  useEffect(() => { if (token) loadOrgs(); }, [token, loadOrgs]);
  useEffect(() => { if (activeOrg) loadProjects(activeOrg.id); }, [activeOrg, loadProjects]);
  useEffect(() => { if (activeProject) loadQueues(activeProject.id); }, [activeProject, loadQueues]);
  useEffect(() => { if (activeQueue) loadJobs(activeQueue.id, statusFilter); }, [activeQueue, statusFilter, loadJobs]);

  if (!token) return <AuthScreen />;

  const selectOrg = (o) => { setActiveOrg(o); setActiveProject(null); setActiveQueue(null); };
  const selectProject = (p) => { setActiveProject(p); setActiveQueue(null); };
  const selectQueue = (q) => setActiveQueue(q);

  const handleToggleQueue = async () => {
    await toggleQueueStatus(activeQueue, activeProject.id);
  };

  return (
    <div className="djs">
      <Header />

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
          <Sidebar
            orgs={orgs} activeOrg={activeOrg} onSelectOrg={selectOrg} onNewOrg={() => setShowNewOrg(true)}
            projects={projects} activeProject={activeProject} onSelectProject={selectProject} onNewProject={() => setShowNewProject(true)}
            queues={queues} activeQueue={activeQueue} onSelectQueue={selectQueue} onNewQueue={() => setShowNewQueue(true)}
          />

          <div>
            {!activeQueue ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, minHeight: 360, color: '#4A5A66', fontSize: 13, border: '1px dashed #1E2932', borderRadius: 6, textAlign: 'center', padding: 24,
              }}>
                <span style={{ color: '#7A8A96', fontSize: 14 }}>No queue selected</span>
                <span style={{ maxWidth: 280 }}>
                  Pick an organization, then a project, then a queue from the left — that's where jobs live and run.
                  Don't have any yet? Use the <b style={{ color: '#F5A623' }}>+</b> button on each panel to create one.
                </span>
              </div>
            ) : (
              <div className="djs-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <QueueDetailHeader
                  queue={queues.find((q) => q.id === activeQueue.id) || activeQueue}
                  onToggleStatus={handleToggleQueue}
                  onNewJob={() => setShowNewJob(true)}
                />
                <div>
                  <StatusRail jobs={jobs} />
                  <p style={{ fontSize: 11, color: '#4A5A66', marginTop: 8 }}>
                    Every job created in this queue moves left to right through these stages as it's picked up and run.
                    A job only reaches <b style={{ color: '#3DDC84' }}>completed</b> once it succeeds —
                    otherwise it retries according to this queue's policy, or lands in <b style={{ color: '#EF4444' }}>dead letter</b> after too many failures.
                  </p>
                </div>
                <StatusFilterBar value={statusFilter} onChange={setStatusFilter} />
                <JobTable jobs={jobs} onSelectJob={openJobDetail} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewOrg && (
        <Modal title="New organization" onClose={() => setShowNewOrg(false)}>
          <SimpleForm
            fields={[{ key: 'name', label: 'name' }]}
            submitLabel="create"
            onSubmit={async (v) => { await createOrg(v.name); setShowNewOrg(false); }}
          />
        </Modal>
      )}

      {showNewProject && (
        <Modal title={`New project in ${activeOrg?.name}`} onClose={() => setShowNewProject(false)}>
          <SimpleForm
            fields={[{ key: 'name', label: 'name' }]}
            submitLabel="create"
            onSubmit={async (v) => { await createProject(activeOrg.id, v.name); setShowNewProject(false); }}
          />
        </Modal>
      )}

      {showNewQueue && (
        <Modal title={`New queue in ${activeProject?.name}`} onClose={() => setShowNewQueue(false)}>
          <SimpleForm
            fields={[
              { key: 'name', label: 'name' },
              { key: 'priority', label: 'priority', type: 'number', default: 0 },
              { key: 'concurrency_limit', label: 'concurrency limit', type: 'number', default: 5 },
            ]}
            submitLabel="create"
            onSubmit={async (v) => {
              await createQueue(activeProject.id, {
                name: v.name,
                priority: Number(v.priority) || 0,
                concurrency_limit: Number(v.concurrency_limit) || 5,
              });
              setShowNewQueue(false);
            }}
          />
        </Modal>
      )}

      {showNewJob && (
        <Modal title={`New job in ${activeQueue?.name}`} onClose={() => setShowNewJob(false)}>
          <NewJobForm onSubmit={async (body) => {
            await createJob(activeQueue.id, body);
            await loadJobs(activeQueue.id, statusFilter);
            setShowNewJob(false);
          }} />
        </Modal>
      )}

      {jobDetail && (
        <Modal title="Job detail" onClose={closeJobDetail} wide>
          <JobDetailView job={jobDetail} />
        </Modal>
      )}

      <ToastViewport />
    </div>
  );
}
