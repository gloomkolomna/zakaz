import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type AdminPlayerDetail } from '../../api/endpoints';
import { formatDate, formatPrice } from '../../api/money';
import BackLink from '../../components/BackLink';
import StatusChip from '../../components/StatusChip';
import Skeleton from '../../components/Skeleton';

export default function PlayerDetail() {
  const { vkId } = useParams();
  const playerId = Number(vkId);
  const [data, setData] = useState<AdminPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminPlayer(playerId)
      .then(setData)
      .catch((e) => setError(e?.response?.data?.detail || 'Заказчик не найден'))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) return <Skeleton lines={5} />;

  if (!data) {
    return (
      <section>
        <BackLink to="/admin/players">К заказчикам</BackLink>
        <div className="empty">{error || 'Заказчик не найден'}</div>
      </section>
    );
  }

  const { player, orders, summary } = data;

  return (
    <section>
      <BackLink to="/admin/players">К заказчикам</BackLink>
      <div className="player-head">
        <div>
          <h2 className="section-title">{player.display_name}</h2>
          <div className="admin-muted">
            VK ID {player.vk_id} · {player.role} · {player.status}
            {player.is_donor ? ' · дон' : ''}
          </div>
        </div>
        <Link className="btn secondary" to={`/admin/orders?buyer_id=${player.vk_id}`}>
          Найти в заказах
        </Link>
      </div>

      <div className="summary admin-summary">
        <div className="summary-cell">
          <div className="summary-k">Заказов</div>
          <div className="summary-v">{summary.count}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-k">В очереди</div>
          <div className="summary-v">{summary.queue}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-k">Сумма</div>
          <div className="summary-v">{formatPrice(summary.sum)}</div>
        </div>
      </div>

      <h3 className="section-title">Заказы заказчика</h3>
      {orders.length === 0 && <div className="empty">У заказчика пока нет заказов.</div>}

      <div className="player-orders">
        {orders.map((order) => (
          <Link className="admin-row player-order" to={`/admin/orders/${order.id}`} key={order.id}>
            <div className="admin-row-head">
              <div className="admin-row-title">
                № {order.id} · {order.product_title}
              </div>
              <StatusChip status={order.status} />
            </div>
            <div className="admin-muted">
              {formatDate(order.created_at)} · {order.items_count} поз. · {formatPrice(order.total)}
              {order.queue_position ? ` · № ${order.queue_position} в очереди` : ''}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
