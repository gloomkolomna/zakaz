import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MAX_REASON = 500;

interface CancelOrderDialogProps {
  open: boolean;
  orderId: number;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function CancelOrderDialog({ open, orderId, busy, error, onConfirm, onCancel }: CancelOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setLocalError(null);
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  function confirm() {
    const value = reason.trim();
    if (!value) {
      setLocalError('Укажите причину отмены');
      return;
    }
    if (value.length > MAX_REASON) {
      setLocalError(`Причина слишком длинная (макс. ${MAX_REASON} символов)`);
      return;
    }
    onConfirm(value);
  }

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Отменить заказ №${orderId}`} onClick={onCancel}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2>Отменить заказ №{orderId}?</h2>
        <p>Покупатель увидит отмену и причину. Скидка по заказу вернётся.</p>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="cancel-reason">Причина отмены</label>
          <textarea
            id="cancel-reason"
            value={reason}
            maxLength={MAX_REASON}
            rows={3}
            placeholder="Например: нет материалов, дубль заказа"
            onChange={(event) => { setReason(event.target.value); setLocalError(null); }}
          />
        </div>
        {(localError || error) && <div className="error-text">{localError || error}</div>}
        <div className="modal-actions">
          <button className="btn secondary" type="button" ref={cancelRef} onClick={onCancel}>
            Оставить
          </button>
          <button className="btn danger" type="button" disabled={busy} onClick={confirm}>
            {busy ? 'Отменяю…' : 'Отменить заказ'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
