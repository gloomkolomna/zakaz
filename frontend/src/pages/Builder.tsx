import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, type ProductDetail } from '../api/endpoints';
import { readDraft, writeDraft } from '../api/draft';
import { formatPrice } from '../api/money';
import { mediaUrl } from '../api/media';
import {
  selectedInStep,
  selectionTotal,
  setQty,
  stepHasSelection,
  toggleCard,
  type Selected,
} from '../api/selection';
import BackLink from '../components/BackLink';
import Skeleton from '../components/Skeleton';
import Stepper from '../components/Stepper';

export default function Builder() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selected, setSelected] = useState<Selected>(() => readDraft(productId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(readDraft(productId));
    let cancelled = false;
    setLoading(true);
    api.product(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.status === 404 ? 'Товар недоступен' : 'Не удалось загрузить товар');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const steps = product?.steps || [];
  const rawStep = Number(searchParams.get('step') || 0);
  const stepIndex = steps.length === 0 ? 0 : Math.min(Math.max(Number.isFinite(rawStep) ? rawStep : 0, 0), steps.length - 1);
  const step = steps[stepIndex];
  const total = useMemo(() => selectionTotal(selected, steps), [selected, steps]);

  function apply(next: Selected) {
    setSelected(next);
    writeDraft(productId, next);
  }

  function goNext() {
    if (!step) return;
    if (stepIndex >= steps.length - 1) {
      navigate(`/product/${productId}/review`);
      return;
    }
    setSearchParams({ step: String(stepIndex + 1) });
  }

  function skip() {
    if (!step) return;
    const next = { ...selected };
    for (const card of step.cards) delete next[card.id];
    apply(next);
    goNext();
  }

  if (loading) return <Skeleton lines={4} />;

  if (error || !product) {
    return (
      <main className="page">
        <BackLink to="/">Каталог</BackLink>
        <h1>{error || 'Товар недоступен'}</h1>
      </main>
    );
  }

  if (!product.can_order) {
    return (
      <main className="page">
        <BackLink to={`/product/${productId}`}>К товару</BackLink>
        <h1>Сборка ещё закрыта</h1>
        <p className="lede">
          {product.early_reason === 'early_access'
            ? 'Товар доступен донам сообщества до анонса.'
            : 'Товар пока недоступен.'}
        </p>
      </main>
    );
  }

  if (!step) {
    return (
      <main className="page">
        <BackLink to={`/product/${productId}`}>К товару</BackLink>
        <h1>{product.title}</h1>
        <div className="empty">Товар ещё наполняется</div>
      </main>
    );
  }

  const selectedHere = selectedInStep(selected, step);
  const missing = step.is_required && selectedHere.length === 0;

  return (
    <main className="page page-builder">
      <BackLink to={`/product/${productId}`}>К товару</BackLink>
      <div className="step-head">
        <h1>{step.title}</h1>
        <div className="step-meta">
          <span>
            Шаг {stepIndex + 1} из {steps.length}
          </span>
          <span className="crosses" aria-hidden="true">
            {steps.map((item, index) => (
              <span
                key={item.id}
                className={index < stepIndex ? 'done' : index === stepIndex ? 'current' : ''}
              >
                ✕
              </span>
            ))}
          </span>
        </div>
        <div className="hint">
          {step.mode === 'single' ? 'Выберите один вариант' : 'Можно выбрать несколько'}
          {step.is_required ? ' · обязательно' : ''}
        </div>
      </div>

      <div className="picks">
        {step.cards.map((card) => {
          const active = Boolean(selected[card.id]);
          return (
            <div
              key={card.id}
              className="pick"
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => apply(toggleCard(selected, step, card))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  apply(toggleCard(selected, step, card));
                }
              }}
            >
              <div className="pick-media">
                {card.image_url ? (
                  <img src={mediaUrl(card.image_url)} alt={card.title} loading="lazy" />
                ) : (
                  <span className="image-placeholder">Фото</span>
                )}
              </div>
              <div className="pick-body">
                <div className="pick-name">{card.title}</div>
                <div className="pick-price">{formatPrice(card.price)}</div>
              </div>
              <span className="pick-check" aria-hidden="true">
                ✓
              </span>
              {active && (
                <Stepper
                  mini
                  value={selected[card.id]}
                  max={card.max_qty}
                  onChange={(value) => apply(setQty(selected, card.id, value, card.max_qty))}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bar">
        {!step.is_required && (
          <button className="skip" type="button" onClick={skip}>
            Пропустить
          </button>
        )}
        <button className="btn" type="button" onClick={goNext} disabled={missing}>
          {stepIndex >= steps.length - 1 ? `К заказу · ${formatPrice(total)}` : `Далее · ${formatPrice(total)}`}
        </button>
      </div>
      {missing && <div className="error-text">Выберите хотя бы один вариант в этом шаге.</div>}
    </main>
  );
}
