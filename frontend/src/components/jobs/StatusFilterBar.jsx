import { JOB_STAGES } from '../../constants/jobStatus';

export default function StatusFilterBar({ value, onChange }) {
  const options = ['', ...JOB_STAGES];

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((s) => (
        <button
          key={s || 'all'}
          onClick={() => onChange(s)}
          className="djs-btn"
          style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11,
            borderColor: value === s ? '#F5A623' : '#1E2932',
            color: value === s ? '#F5A623' : '#7A8A96',
          }}
        >
          {s || 'all'}
        </button>
      ))}
    </div>
  );
}
