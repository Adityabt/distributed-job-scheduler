import { Plus } from 'lucide-react';
import Panel from '../ui/Panel';
import Row from '../ui/Row';
import IconButton from '../ui/IconButton';

export default function Sidebar({
  orgs, activeOrg, onSelectOrg, onNewOrg,
  projects, activeProject, onSelectProject, onNewProject,
  queues, activeQueue, onSelectQueue, onNewQueue,
}) {
  return (
    <div className="djs-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel
        title="Organizations"
        action={<IconButton onClick={onNewOrg} title="New org"><Plus size={13} /></IconButton>}
        empty={orgs.length === 0 ? 'No organizations yet — create one to get started.' : null}
      >
        {orgs.map((o) => (
          <Row key={o.id} active={activeOrg?.id === o.id} onClick={() => onSelectOrg(o)}>
            {o.name}
          </Row>
        ))}
      </Panel>

      {activeOrg && (
        <Panel
          title={`Projects — ${activeOrg.name}`}
          action={<IconButton onClick={onNewProject} title="New project"><Plus size={13} /></IconButton>}
          empty={projects.length === 0 ? 'No projects in this org yet.' : null}
        >
          {projects.map((p) => (
            <Row key={p.id} active={activeProject?.id === p.id} onClick={() => onSelectProject(p)}>
              {p.name}
            </Row>
          ))}
        </Panel>
      )}

      {activeProject && (
        <Panel
          title={`Queues — ${activeProject.name}`}
          action={<IconButton onClick={onNewQueue} title="New queue"><Plus size={13} /></IconButton>}
          empty={queues.length === 0 ? 'No queues in this project yet.' : null}
        >
          {queues.map((q) => (
            <Row key={q.id} active={activeQueue?.id === q.id} onClick={() => onSelectQueue(q)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.status === 'active' ? '#3DDC84' : '#4A5A66' }} />
                {q.name}
              </span>
            </Row>
          ))}
        </Panel>
      )}
    </div>
  );
}
