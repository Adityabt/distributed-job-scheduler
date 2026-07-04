import { useToast } from '../../context/ToastContext';

export default function ToastViewport() {
  const { toast } = useToast();
  if (!toast) return null;

  return (
    <div
      className="djs-fade"
      style={{
        position: 'fixed', bottom: 20, right: 20, padding: '10px 16px', borderRadius: 5,
        background: toast.isErr ? '#2A1315' : '#0E1419',
        border: `1px solid ${toast.isErr ? '#EF4444' : '#3DDC84'}`,
        color: toast.isErr ? '#EF4444' : '#3DDC84', fontSize: 12, zIndex: 100,
      }}
    >
      {toast.msg}
    </div>
  );
}
