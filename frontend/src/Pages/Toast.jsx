import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast, onClose]);

  if (!toast) return null;

  return <div className={`auth-toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
    <span className="toast-icon" aria-hidden="true">{toast.type === 'success' ? '✓' : '!'}</span>
    <span className="toast-message">{toast.message}</span>
    <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">×</button>
  </div>;
}