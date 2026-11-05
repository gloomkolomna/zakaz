import type { Card } from '../api/endpoints';
import { mediaUrl } from '../api/media';
import { formatPrice } from '../api/money';
import Stepper from './Stepper';

interface PickCardProps {
  card: Card;
  active: boolean;
  quantity?: number;
  onToggle: () => void;
  onView: () => void;
  onQuantityChange?: (value: number) => void;
}

export default function PickCard({
  card,
  active,
  quantity = 1,
  onToggle,
  onView,
  onQuantityChange,
}: PickCardProps) {
  return (
    <div
      className="pick"
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <button
        className="pick-thumb"
        type="button"
        aria-label={`Фото: ${card.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onView();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {card.image_url ? (
          <img src={mediaUrl(card.image_url)} alt="" loading="lazy" />
        ) : (
          <span className="image-placeholder">Фото</span>
        )}
        <span className="pick-thumb-badge" aria-hidden="true">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M7 1h4v4M5 11H1V7M11 1 7 5M1 11l4-4" />
          </svg>
        </span>
      </button>
      <div className="pick-main">
        <div className="pick-name">{card.title}</div>
        {card.description && <div className="pick-description">{card.description}</div>}
        <div className="pick-price">{formatPrice(card.price)}</div>
        <span className="pick-check" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6.2 4.8 9 10 3.4" />
          </svg>
        </span>
      </div>
      {active && onQuantityChange && (
        <div className="pick-qty" onKeyDown={(event) => event.stopPropagation()}>
          <Stepper
            mini
            value={quantity}
            max={card.max_qty}
            onChange={onQuantityChange}
          />
        </div>
      )}
    </div>
  );
}
