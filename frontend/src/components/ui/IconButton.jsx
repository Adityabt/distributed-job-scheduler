export default function IconButton({ onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="djs-btn"
      style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 4, padding: 0 }}
    >
      {children}
    </button>
  );
}
