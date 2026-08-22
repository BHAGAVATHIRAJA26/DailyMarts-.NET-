import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size} anim-scale-spring`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            {showClose && (
              <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmClass = 'btn-primary', dangerous = false, children }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {message && <p className="text-secondary text-sm" style={{ lineHeight: 1.6, marginBottom: '16px' }}>{message}</p>}
      {children}
      <div className="flex gap-3 justify-end mt-6">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${dangerous ? 'btn-danger' : confirmClass}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
