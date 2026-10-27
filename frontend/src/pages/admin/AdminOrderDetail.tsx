import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type OrderDetail } from '../../api/endpoints';
import { usePolling } from '../../hooks/usePolling';
import { formatDate, formatPrice } from '../../api/money';
import { mediaUrl } from '../../api/media';
import BackLink from '../../components/BackLink';
import StatusChip from '../../components/StatusChip';
import Skeleton from '../../components/Skeleton';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(silent = false) {
    if (!silent) setLoading(true);
    return api.adminOrder(orderId)
      .then(setOrder)
      .catch((e) => {
        if (!silent) setError(e?.response?.data?.detail || 'Заказ не найден');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, [orderId]);
  usePolling(() => load(true), 15_000);

  function complete() {
    api.adminCompleteOrder(orderId).then(setOrder).catch(() => setError('Не удалось выполнить заказ'));
  }

  function markRead() {
    api.adminReadOrder(orderId).then(setOrder).catch(() => setError('Не удалось отметить прочитанным'));
  }

  function cancelSeen() {
    api.adminCancelSeen(orderId).then(setOrder).catch(() => setError('Не удалось подтвердить отмену'));
  }

  function move(direction: 'up' | 'down') {
    api.adminMoveOrder(orderId, direction).then(load).catch(() => setError('Не удалось изменить очередь'));
  }

  if (loading) return <Skeleton lines={5} />;

  if (!order) {
    return (
      <section>
        <BackLink to="/admin/orders">К заказам</BackLink>
        <div className="empty">{error || 'Заказ не найден'}</div>
      </section>
    );
  }

  return (
    <section>
      <BackLink to="/admin/orders">К заказам</BackLink>
      <div className="oc-head">
        <h2>Заказ №{order.id}</h2>
        <StatusChip status={order.status} />
      </div>
      <div className="order-status">
        {formatDate(order.created_at)} · {order.buyer_name} ·{' '}
        <a href={`https://vk.com/id${order.user_id}`} target="_blank" rel="noreferrer">
          vk.com/id{order.user_id}
        </a>
      </div>
      {order.queue_position && <div className="queue-line">В очереди — {order.queue_position}-й</div>}
      <div className="legend-title">{order.section_title} · {order.product_title}</div>

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

      {error && <div className="error-text">{error}</div>}

      <div className="admin-actions" style={{ marginTop: 20 }}>
        {!order.read_at && <button className="btn secondary" type="button" onClick={markRead}>Отметить прочитанным</button>}
        {order.status === 'new' && (
          <>
            <button className="btn" type="button" onClick={complete}>Выполнить</button>
            <button className="icon-action" type="button" onClick={() => move('up')}>↑</button>
            <button className="icon-action" type="button" onClick={() => move('down')}>↓</button>
          </>
        )}
        {order.status === 'cancelled' && !order.cancel_seen_at && (
          <button className="btn secondary" type="button" onClick={cancelSeen}>Понятно</button>
        )}
        {order.product_id && (
          <Link className="btn secondary" to={`/product/${order.product_id}`}>Открыть товар</Link>
        )}
      </div>
    </section>
  );
}
