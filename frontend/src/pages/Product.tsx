import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ProductDetail } from '../api/endpoints';
import { formatPrice } from '../api/money';
import BackLink from '../components/BackLink';
import CardGallery from '../components/CardGallery';
import EarlyBadge, { EarlyNote } from '../components/EarlyBadge';
import ProductImage from '../components/ProductImage';
import Sheet from '../components/Sheet';
import Skeleton from '../components/Skeleton';
import Stepper from '../components/Stepper';
import VideoBlock from '../components/VideoBlock';
import { clearDraft } from '../api/draft';
import { useSession } from '../context/SessionContext';

export default function Product() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const { user } = useSession();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
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

  if (loading) return <Skeleton lines={4} />;

  if (error || !product) {
    return (
      <main className="page">
        <BackLink to="/">Каталог</BackLink>
        <h1>{error || 'Товар недоступен'}</h1>
        <p className="lede">Вернитесь в каталог и выберите другой набор.</p>
      </main>
    );
  }

  function start() {
    clearDraft(productId);
    navigate(`/product/${productId}/build`);
  }

  function setReserved(reserved: boolean) {
    setProduct((current) => (current ? { ...current, reserved } : current));
  }

  function reserve() {
    if (!product || reserving) return;
    setReserving(true);
    setReserveError(null);
    api.reserve(product.id)
      .then(() => setReserved(true))
      .catch((e) => setReserveError(e?.response?.data?.detail || 'Не удалось записаться. Попробуйте ещё раз.'))
      .finally(() => setReserving(false));
  }

  function cancelReserve() {
    if (!product) return;
    setReserveError(null);
    api.cancelReserve(product.id)
      .then(() => setReserved(false))
      .catch((e) => setReserveError(e?.response?.data?.detail || 'Не удалось отменить заявку.'));
  }

  function placeOrder() {
    if (!product || submitting || product.is_hidden) return;
    setSubmitting(true);
    setOrderError(null);
    api.createSingleOrder(product.id, qty, comment.trim() || undefined)
      .then((order) => {
        setCheckoutOpen(false);
        navigate(`/order/${order.id}/success`);
      })
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        setOrderError(
          typeof detail === 'string'
            ? detail
            : detail?.message || 'Не удалось отправить заказ. Проверьте связь и попробуйте ещё раз.',
        );
      })
      .finally(() => setSubmitting(false));
  }

  const isSingle = product.mode === 'single';
  const hasSteps = product.steps.length > 0;
  const price = isSingle ? product.price : product.from_price;
  const ready = isSingle ? price != null : hasSteps;
  const total = price == null ? null : price * qty;

  return (
    <main className="page">
      <BackLink to="/">Каталог</BackLink>
      <div className="page-product">
        {product.is_hidden && (
          <div className="preview-note">
            Предпросмотр. Товар скрыт из каталога — покупатели его не видят.
          </div>
        )}
        <div className="product-head">
          <h1>
            {product.title}
            {product.sold_out && <span className="sold-out-note"> (товар закончился)</span>}
            {product.is_early && <EarlyBadge until={product.early_until} />}
          </h1>
          <div className="price-row">
            <span className="price">
              {price == null ? 'Скоро' : isSingle ? formatPrice(price) : `от ${formatPrice(price)}`}
            </span>
            {isSingle && price != null && <span className="price-note">· за 1 шт.</span>}
            {!isSingle && hasSteps && <span className="price-note">· собирается по шагам</span>}
          </div>
          <div className="product-intro">
            <div className="product-about">
              <div className="legend-title">{product.section_title}</div>
              {product.description && <p className="body-text">{product.description}</p>}
            </div>
            <ProductImage src={product.image_url} alt={product.title} className="product-cover" />
          </div>
          <VideoBlock video={product.video} cover={product.image_url} />
          {isSingle && product.images.length > 0 && (
            <CardGallery title="Фотографии товара" images={product.images} />
          )}

          {product.is_early && <EarlyNote until={product.early_until} />}

          {!ready ? (
            <div className="blocked-cta">
              <button className="btn block" type="button" disabled>
                Скоро в продаже
              </button>
              <div className="blocked-note">
                {isSingle ? 'Цена ещё не указана.' : 'Товар ещё наполняется.'}
              </div>
            </div>
          ) : product.sold_out ? (
            <div className="blocked-cta">
              {product.reserved ? (
                <>
                  <button className="btn block" type="button" disabled>
                    Вы в резерве
                  </button>
                  <div className="blocked-note">Сообщим, когда товар появится.</div>
                  <button className="text-link reserve-cancel" type="button" onClick={cancelReserve}>
                    Отменить заявку
                  </button>
                </>
              ) : (
                <>
                  <button className="btn block" type="button" onClick={reserve} disabled={reserving}>
                    {reserving ? 'Записываю…' : 'Сообщить, когда появится'}
                  </button>
                  <div className="blocked-note">Товар закончился. Сообщим, когда появится.</div>
                </>
              )}
              {reserveError && <div className="error-text">{reserveError}</div>}
            </div>
          ) : product.can_order ? (
            <div className="blocked-cta">
              {isSingle ? (
                <>
                  <div className="buy-line">
                    <Stepper value={qty} max={99} onChange={setQty} />
                    <button
                      className="btn block"
                      type="button"
                      onClick={() => {
                        setOrderError(null);
                        setCheckoutOpen(true);
                      }}
                      disabled={submitting}
                    >
                      {submitting ? 'Отправляю…' : `Заказать · ${formatPrice(total || 0)}`}
                    </button>
                  </div>
                  {product.is_early && <div className="blocked-note">До анонса — вам доступно.</div>}
                  {orderError && <div className="error-text">{orderError}</div>}
                </>
              ) : (
                <>
                  <button className="btn block" type="button" onClick={start}>
                    Собрать заказ
                  </button>
                  {product.is_early && <div className="blocked-note">До анонса — вам доступно.</div>}
                </>
              )}
            </div>
          ) : (
            <div className="blocked-cta">
              <button className="btn block" type="button" disabled>
                {isSingle ? 'Заказать' : 'Собрать заказ'}
              </button>
              <div className="blocked-note">
                {product.early_reason === 'early_access'
                  ? 'Сейчас доступно донам сообщества.'
                  : 'Товар пока недоступен.'}
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="page-actions">
              <Link className="btn secondary" to={`/admin/products/${product.id}`}>
                Редактировать товар
              </Link>
            </div>
          )}
        </div>
      </div>

      {isSingle && (
        <Sheet
          open={checkoutOpen}
          title="Оформление заказа"
          onClose={() => {
            if (!submitting) setCheckoutOpen(false);
          }}
          footer={
            <button
              className="btn block"
              type="button"
              onClick={placeOrder}
              disabled={submitting || product.is_hidden}
            >
              {product.is_hidden
                ? 'Режим просмотра'
                : submitting
                  ? 'Отправляю…'
                  : `Отправить заказ · ${formatPrice(total || 0)}`}
            </button>
          }
        >
          <div className="checkout-summary">
            {product.title} · {qty} шт. · {formatPrice(total || 0)}
          </div>
          {product.is_hidden && (
            <p className="note">Режим просмотра — заказ не отправится.</p>
          )}
          <div className="field">
            <label htmlFor="single-order-comment">Дополнительная информация к заказу</label>
            <textarea
              id="single-order-comment"
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Пожелания по оформлению, упаковке, срокам…"
            />
            <div className="admin-muted">Необязательно. Владелец увидит текст в заказе.</div>
          </div>
          {orderError && <div className="error-text">{orderError}</div>}
        </Sheet>
      )}
    </main>
  );
}
