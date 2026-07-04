export default function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#7A8A96', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </label>
  );
}
