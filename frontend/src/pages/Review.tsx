import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Card, type ProductDetail } from '../api/endpoints';
import { buildItems, removeCard, selectionCount, selectionTotal, setQty, stepHasSelection, toggleCard, type Selected } from '../api/selection';
import { clearDraft, readDraft, writeDraft } from '../api/draft';
import { formatPrice } from '../api/money';
import { mediaUrl } from '../api/media';
import BackLink from '../components/BackLink';
import Sheet from '../components/Sheet';
import Skeleton from '../components/Skeleton';
import Stepper from '../components/Stepper';

export default function Review() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selected, setSelected] = useState<Selected>(() => readDraft(productId));
  const [sheetStep, setSheetStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSelected(readDraft(productId));
    api.product(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить товар');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const steps = product?.steps || [];
  const total = useMemo(() => selectionTotal(selected, steps), [selected, steps]);
  const groups = steps.filter((step) => stepHasSelection(selected, step));
  const missing = steps.filter((step) => step.is_required && !stepHasSelection(selected, step));
  const count = selectionCount(selected);
  const editableStep = steps.find((step) => step.id === sheetStep) || null;

  function apply(next: Selected) {
    setSelected(next);
    writeDraft(productId, next);
  }

  function submit() {
    if (!product || product.sold_out || submitting || count === 0 || missing.length > 0) return;
    setSubmitting(true);
    setError(null);
    api.createOrder(product.id, buildItems(selected, steps))
      .then((order) => {
        clearDraft(productId);
        navigate(`/order/${order.id}/success`);
      })
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        setError(
          typeof detail === 'string'
            ? detail
            : detail?.message || 'Не удалось отправить заказ. Проверьте связь и попробуйте ещё раз.',
        );
      })
      .finally(() => setSubmitting(false));
  }

  if (loading) return <Skeleton lines={5} />;

  if (error && !product) {
    return (
      <main className="page">
        <BackLink to="/">Каталог</BackLink>
        <h1>Не удалось открыть заказ</h1>
        <p className="lede">{error}</p>
      </main>
    );
  }

  if (!product) return null;

  if (count === 0) {
    return (
      <main className="page">
        <BackLink to={`/product/${productId}/build`}>К шагам</BackLink>
        <h1>Ваш заказ</h1>
        <div className="empty">Ничего не выбрано.</div>
        <div className="page-actions">
          <Link className="btn" to={`/product/${productId}/build`}>
            Выбрать позиции
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-review">
      <BackLink to={`/product/${productId}/build`}>К шагам</BackLink>
      <h1>Ваш заказ</h1>
      <div className="legend-title">{product.title}</div>

      {product.sold_out && (
        <div className="alert">
          <div className="alert-body">
            <div className="alert-title">Товар закончился</div>
            <div className="alert-sub">Все копии уже заказаны — отправить заказ нельзя.</div>
          </div>
        </div>
      )}

      {missing.map((step) => (
        <div className="alert" key={step.id}>
          <div className="alert-body">
            <div className="alert-title">В шаге «{step.title}» ничего не выбрано</div>
            <div className="alert-sub">Отправка станет доступна после выбора.</div>
          </div>
          <button className="alert-btn" type="button" onClick={() => setSheetStep(step.id)}>
            Выбрать
          </button>
        </div>
      ))}

      {groups.map((step) => (
        <section className="legend-group" key={step.id}>
          <div className="legend-step">
            <span>{step.title}</span>
            <button className="reselect" type="button" onClick={() => setSheetStep(step.id)}>
              Изменить
            </button>
          </div>
          {step.cards.filter((card) => selected[card.id]).map((card) => (
            <div className="legend-row is-editable" key={card.id}>
              <div className="legend-thumb">
                {card.image_url ? <img src={mediaUrl(card.image_url)} alt={card.title} /> : null}
              </div>
              <div className="legend-main">
                <div className="legend-name">{card.title}</div>
                <div className="legend-controls">
                  <Stepper
                    mini
                    value={selected[card.id]}
                    max={card.max_qty}
                    onChange={(value) => apply(setQty(selected, card.id, value, card.max_qty))}
                  />
                  <button className="remove" type="button" onClick={() => apply(removeCard(selected, card.id))}>
                    Убрать
                  </button>
                </div>
              </div>
              <div className="legend-sum">{formatPrice(card.price * selected[card.id])}</div>
            </div>
          ))}
        </section>
      ))}

      <div className="total">
        <span className="total-label">Итого</span>
        <span className="total-value">{formatPrice(total)}</span>
      </div>
      <p className="note">Оплата и доставка — в переписке ВКонтакте. После отправки состав не меняется.</p>
      {error && <div className="error-text">{error}</div>}

      <div className="bar">
        <button
          className="btn"
          type="button"
          disabled={submitting || product.sold_out || count === 0 || missing.length > 0}
          onClick={submit}
        >
          {product.sold_out ? 'Товар закончился' : submitting ? 'Отправляю…' : 'Отправить заказ'}
        </button>
      </div>

      <Sheet
        open={Boolean(editableStep)}
        title={editableStep?.title || ''}
        onClose={() => setSheetStep(null)}
        footer={
          <button className="btn block" type="button" onClick={() => setSheetStep(null)}>
            Готово
          </button>
        }
      >
        {editableStep && (
          <div className="picks">
            {editableStep.cards.map((card) => (
              <ReviewPick
                key={card.id}
                card={card}
                active={Boolean(selected[card.id])}
                onClick={() => apply(toggleCard(selected, editableStep, card))}
              />
            ))}
          </div>
        )}
      </Sheet>
    </main>
  );
}

function ReviewPick({
  card,
  active,
  onClick,
}: {
  card: Card;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="pick"
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="pick-media">
        {card.image_url ? <img src={mediaUrl(card.image_url)} alt={card.title} /> : <span className="image-placeholder">Фото</span>}
      </div>
      <div className="pick-body">
        <div className="pick-name">{card.title}</div>
        <div className="pick-price">{formatPrice(card.price)}</div>
      </div>
      <span className="pick-check" aria-hidden="true">✓</span>
    </div>
  );
}
