import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Оставить',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        <div className="modal-actions">
          <button className="btn secondary" type="button" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`btn${danger ? ' danger' : ''}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
