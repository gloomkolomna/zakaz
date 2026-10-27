import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type OrderBrief } from '../api/endpoints';
import { formatDate, formatPrice } from '../api/money';
import { QueueLine } from '../components/StatusChip';
import StatusChip from '../components/StatusChip';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function MyOrders() {
  const [orders, setOrders] = useState<OrderBrief[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    api.myOrders()
      .then((data) => setOrders(data.items))
      .catch(() => setError(true));
  }

  useEffect(load, []);

  if (error) {
    return (
      <main className="page">
        <h1>Мои заказы</h1>
        <div className="empty">
          Не удалось загрузить заказы.
          <button className="text-link" type="button" onClick={load}>
            Повторить
          </button>
        </div>
      </main>
    );
  }

  if (orders === null) return <Skeleton lines={4} />;

  return (
    <main className="page page-orders">
      <h1>Мои заказы</h1>
      {orders.length === 0 ? (
        <section className="section">
          <EmptyState
            action={
              <Link className="text-link" to="/">
                Собрать первый
              </Link>
            }
          >
            Заказов пока нет.
          </EmptyState>
        </section>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link
              className={`order-card${order.status === 'cancelled' ? ' is-cancelled' : ''}`}
              key={order.id}
              to={`/orders/${order.id}`}
            >
              <div className="oc-head">
                <span className="oc-num">№ {order.id}</span>
                <StatusChip status={order.status} />
              </div>
              <div className="oc-title">{order.product_title}</div>
              <div className="oc-meta">
                {formatDate(order.created_at)} · {order.items_count} поз.
              </div>
              <QueueLine position={order.queue_position} />
              <div className="oc-sum">{formatPrice(order.total)}</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
