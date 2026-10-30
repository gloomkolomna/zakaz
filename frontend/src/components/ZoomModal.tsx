import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';

interface ZoomImage {
  url: string;
  alt: string;
}

interface ZoomModalProps {
  src: string;
  alt: string;
  onClose: () => void;
  images?: ZoomImage[];
  index?: number;
  onIndexChange?: (index: number) => void;
}

export default function ZoomModal({
  src,
  alt,
  onClose,
  images,
  index = 0,
  onIndexChange,
}: ZoomModalProps) {
  const list = images && images.length > 0 ? images : [{ url: src, alt }];
  const [current, setCurrent] = useState(index);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    setCurrent(index);
  }, [index]);

  useEffect(() => {
    if (current >= list.length) setCurrent(0);
  }, [current, list.length]);

  function change(delta: number) {
    if (list.length < 2) return;
    const next = (Math.min(current, list.length - 1) + delta + list.length) % list.length;
    setCurrent(next);
    onIndexChange?.(next);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        change(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        change(1);
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, current, list.length, onIndexChange]);

  function startTouch(event: TouchEvent<HTMLDivElement>) {
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
    swiped.current = false;
  }

  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      change(dx > 0 ? -1 : 1);
      window.setTimeout(() => {
        swiped.current = false;
      }, 400);
    }
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (event.target === event.currentTarget) onClose();
  }

  const active = list[Math.min(current, list.length - 1)] || list[0];

  return createPortal(
    <div className="modal zoom-modal" role="dialog" aria-modal="true" aria-label={active.alt}>
      <button className="zoom-close" type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      <div
        className="zoom-stage"
        onClick={closeOnBackdrop}
        onTouchStart={startTouch}
        onTouchEnd={endTouch}
      >
        {list.length > 1 && (
          <button
            className="zoom-nav prev"
            type="button"
            aria-label="Предыдущее фото"
            onClick={(event) => {
              event.stopPropagation();
              change(-1);
            }}
          >
            ‹
          </button>
        )}
        <img src={active.url} alt={active.alt} onClick={(event) => event.stopPropagation()} />
        {list.length > 1 && (
          <button
            className="zoom-nav next"
            type="button"
            aria-label="Следующее фото"
            onClick={(event) => {
              event.stopPropagation();
              change(1);
            }}
          >
            ›
          </button>
        )}
        {list.length > 1 && (
          <div className="zoom-counter">
            {current + 1} / {list.length}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
