import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="toast-icon text-success" size={18} />,
    error: <AlertCircle className="toast-icon text-danger" size={18} />,
    warning: <AlertTriangle className="toast-icon text-warning" size={18} />,
    info: <Info className="toast-icon text-info" size={18} />,
  };

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast-box toast-${toast.type || 'info'} animate-slide-up`}>
        <div className="toast-icon-wrapper">
          {icons[toast.type] || icons.info}
        </div>
        <div className="toast-message">
          {toast.message}
        </div>
        <button 
          type="button" 
          className="toast-close-btn" 
          onClick={onClose}
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
