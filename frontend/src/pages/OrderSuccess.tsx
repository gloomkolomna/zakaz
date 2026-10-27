import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type OrderDetail } from '../api/endpoints';
import { formatPrice } from '../api/money';
import Skeleton from '../components/Skeleton';

const GROUP_URL = import.meta.env.VITE_VK_GROUP_URL || '';

export default function OrderSuccess() {
  const { id } = useParams();
  const orderId = Number(id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.order(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <Skeleton lines={3} />;

  if (!order) {
    return (
      <main className="page">
        <h1>Заказ не найден</h1>
        <div className="page-actions">
          <Link className="btn" to="/orders">
            Мои заказы
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-success">
      <div className="done-wrap">
        <svg className="done-mark check-mark" width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
          <path d="M12 27.5 22 37.5 40 15.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1>Заказ №{order.id} отправлен</h1>
        <p>
          Сумма — {formatPrice(order.total)}.
          {order.queue_position ? ` Вы ${order.queue_position}-й в очереди.` : ''} Напишу вам в личные
          сообщения ВКонтакте, чтобы согласовать оплату и доставку.
        </p>
        <div className="done-actions">
          <Link className="btn" to="/orders">
            Мои заказы
          </Link>
          <Link className="btn secondary" to="/">
            Вернуться в каталог
          </Link>
          {GROUP_URL && (
            <a className="text-link" href={GROUP_URL} target="_blank" rel="noreferrer">
              Написать в сообщество
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
