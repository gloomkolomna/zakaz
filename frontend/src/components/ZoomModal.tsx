import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ZoomModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ZoomModal({ src, alt, onClose }: ZoomModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal zoom-modal" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button className="zoom-close" type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
    </div>,
    document.body,
  );
}
