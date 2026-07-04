export default function Panel({ title, action, children, empty }) {
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
