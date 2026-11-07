import { useEffect, useState } from 'react';
import { api, type DiscountGrant } from '../api/endpoints';
import { formatPrice } from '../api/money';

export function discountAmount(subtotal: number, percent: number): number {
  return percent > 0 ? Math.floor((subtotal * percent + 50) / 100) : 0;
}

type Props = {
  subtotal: number;
  onChange: (grant: DiscountGrant | null) => void;
};

export default function DiscountSummary({ subtotal, onChange }: Props) {
  const [grants, setGrants] = useState<DiscountGrant[]>([]);
  const [selected, setSelected] = useState<DiscountGrant | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.myDiscounts().then((data) => {
      if (!cancelled) setGrants(data.items);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function toggle(grant: DiscountGrant) {
    const next = selected?.id === grant.id ? null : grant;
    setSelected(next);
    onChange(next);
  }

  const percent = selected?.percent || 0;
  const reduction = discountAmount(subtotal, percent);

  return (
    <div>
      {grants.length > 0 && (
        <div className="field">
          <div className="legend-title">Доступная скидка</div>
          {grants.map((grant) => (
            <label key={grant.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={selected?.id === grant.id}
                onChange={() => toggle(grant)}
              />
              <span>Применить скидку {grant.percent}% к этому заказу</span>
            </label>
          ))}
        </div>
      )}
      {selected && (
        <>
          <div className="total">
            <span className="total-label">Сумма без скидки</span>
            <span className="total-value">{formatPrice(subtotal)}</span>
          </div>
          <div className="total">
            <span className="total-label">Скидка {percent}%</span>
            <span className="total-value">−{formatPrice(reduction)}</span>
          </div>
        </>
      )}
      <div className="total">
        <span className="total-label">Итого</span>
        <span className="total-value">{formatPrice(subtotal - reduction)}</span>
      </div>
    </div>
  );
}
