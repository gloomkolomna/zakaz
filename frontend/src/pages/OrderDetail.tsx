import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type OrderDetail as OrderDetailType } from '../api/endpoints';
import { formatDate, formatPrice } from '../api/money';
import { mediaUrl } from '../api/media';
import BackLink from '../components/BackLink';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusChip from '../components/StatusChip';
import Skeleton from '../components/Skeleton';
import { usePolling } from '../hooks/usePolling';

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function load(silent = false) {
    if (!silent) setLoading(true);
    return api.order(orderId)
      .then(setOrder)
      .catch((e) => {
        if (silent) return;
        const detail = e?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Заказ не найден');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, [orderId]);
  usePolling(() => load(true), 15_000);

  function cancel() {
    setCancelling(true);
    api.cancelOrder(orderId)
      .then((data) => {
        setOrder(data);
        setConfirm(false);
      })
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Не удалось отменить заказ');
        setConfirm(false);
      })
      .finally(() => setCancelling(false));
  }

  if (loading) return <Skeleton lines={5} />;

  if (error && !order) {
    return (
      <main className="page">
        <BackLink to="/orders">Мои заказы</BackLink>
        <h1>{error}</h1>
      </main>
    );
  }

  if (!order) return null;

  const statusLabel = order.status === 'new' ? 'В работе' : order.status === 'done' ? 'Выполнен' : 'Отменён';

  return (
    <main className="page page-review">
      <BackLink to="/orders">Мои заказы</BackLink>
      <div className="oc-head">
        <h1>Заказ №{order.id}</h1>
        <StatusChip status={order.status} />
      </div>
      <div className={`order-status${order.status === 'cancelled' ? ' red' : ''}`}>
        {statusLabel} · {formatDate(order.created_at)}
      </div>
      {order.queue_position && <div className="queue-line">Ваш заказ — {order.queue_position}-й в очереди</div>}
      <div className="legend-title">{order.product_title}</div>

      <section className="legend-group">
        {order.items.map((item) => (
          <div className="legend-row" key={item.id}>
            <div className="legend-thumb">
              {item.image_url ? <img src={mediaUrl(item.image_url)} alt={item.card_title} /> : null}
            </div>
            <div className="legend-main">
              <div className="legend-name">{item.card_title}</div>
              <div className="legend-qty">{item.step_title} · {item.qty} шт.</div>
            </div>
            <div className="legend-sum">{formatPrice(item.sum)}</div>
          </div>
        ))}
      </section>

      <div className="total">
        <span className="total-label">Итого</span>
        <span className="total-value">{formatPrice(order.total)}</span>
      </div>

      {order.status === 'new' && (
        <>
          <button className="btn danger block" type="button" onClick={() => setConfirm(true)}>
            Отменить заказ
          </button>
          <p className="note">Отмена сразу придёт владельцу. Состав сохранится в истории заказов.</p>
        </>
      )}

      {order.status === 'cancelled' && (
        <div className="cancelled-note">
          Заказ отменён {formatDate(order.cancelled_at)}. Состав сохранён в истории. Если это ошибка — напишите
          в сообщество, соберём заново.
        </div>
      )}

      {order.status === 'done' && (
        <div className="cancelled-note">Заказ выполнен {formatDate(order.done_at)}. Спасибо!</div>
      )}

      {error && <div className="error-text">{error}</div>}

      <div className="page-actions">
        <Link className="btn secondary" to="/">
          В каталог
        </Link>
      </div>

      <ConfirmDialog
        open={confirm}
        title={`Отменить заказ №${order.id}?`}
        text="Заказ уйдёт из работы. Я сразу увижу отмену и напишу вам, чтобы уточнить детали."
        confirmLabel={cancelling ? 'Отменяю…' : 'Отменить заказ'}
        cancelLabel="Оставить"
        danger
        onConfirm={cancel}
        onCancel={() => setConfirm(false)}
      />
    </main>
  );
}
