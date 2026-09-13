import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="toast-icon text-success" size={20} />,
    error: <AlertCircle className="toast-icon text-danger" size={20} />,
    info: <Info className="toast-icon text-info" size={20} />,
  };

  return (
    <div className={`toast-container toast-${toast.type || 'info'} animate-slide-up`}>
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
        <X size={16} />
      </button>
    </div>
  );
}
