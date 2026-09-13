import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, title, description, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onClose }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Auto-focus the cancel button for safety
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button 
          type="button"
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <h3 id="modal-title" className="modal-title">{title}</h3>
        <p className="modal-description">{description}</p>

        <div className="modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            ref={confirmButtonRef}
            type="button" 
            className="btn btn-danger" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
