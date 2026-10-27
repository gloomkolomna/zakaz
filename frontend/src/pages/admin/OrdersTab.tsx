import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  api,
  downloadOrdersCsv,
  downloadOrdersPdf,
  type AdminOrdersResponse,
  type AdminProduct,
  type AdminSection,
  type OrderFilters,
  type OrderStatus,
} from '../../api/endpoints';
import { formatDate, formatPrice } from '../../api/money';
import StatusChip from '../../components/StatusChip';
import Skeleton from '../../components/Skeleton';
import { usePolling } from '../../hooks/usePolling';

const LIMIT = 20;

export default function OrdersTab() {
  const [data, setData] = useState<AdminOrdersResponse | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [searchParams] = useSearchParams();
  const initialBuyer = searchParams.get('buyer_id') || '';
  const initialBuyerNumber = Number(initialBuyer);
  const [filters, setFilters] = useState<OrderFilters>({
    limit: LIMIT,
    offset: 0,
    buyer_id: initialBuyer && Number.isFinite(initialBuyerNumber) ? initialBuyerNumber : undefined,
  });
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [queueOnly, setQueueOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [productId, setProductId] = useState<number | ''>('');
  const [buyerId, setBuyerId] = useState(initialBuyer);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    Promise.all([api.adminSections(), api.adminProducts()])
      .then(([sectionRows, productRows]) => {
        setSections(sectionRows);
        setProducts(productRows);
      })
      .catch(() => setError('Не удалось загрузить фильтры'));
  }, []);

  function fetchOrders(silent = false) {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    setError(null);
    return api.adminOrders(filters)
      .then((rows) => {
        if (id !== requestId.current) return;
        setData(rows);
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (!silent && id === requestId.current) setError('Не удалось загрузить заказы');
      })
      .finally(() => {
        if (!silent && id === requestId.current) setLoading(false);
      });
  }

  useEffect(() => {
    void fetchOrders();
    return () => {
      requestId.current += 1;
    };
  }, [filters]);
  usePolling(() => fetchOrders(true), 10_000);

  const visibleProducts = useMemo(
    () => (sectionId === '' ? products : products.filter((product) => product.section_id === sectionId)),
    [products, sectionId],
  );

  function applyFilters(nextStatus: OrderStatus | '' = statusFilter, queue = queueOnly, unread = unreadOnly) {
    const parsedBuyer = Number(buyerId.trim());
    setFilters({
      status: nextStatus || undefined,
      queue: queue ? 1 : undefined,
      unread: unread ? 1 : undefined,
      q: q.trim() || undefined,
      buyer_id: buyerId.trim() && Number.isFinite(parsedBuyer) ? parsedBuyer : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      section_id: sectionId === '' ? undefined : sectionId,
      product_id: productId === '' ? undefined : productId,
      limit: LIMIT,
      offset: 0,
    });
  }

  function chooseStatus(value: OrderStatus | '') {
    setStatusFilter(value);
    setQueueOnly(false);
    applyFilters(value, false, unreadOnly);
  }

  function chooseQueue() {
    const next = !queueOnly;
    setQueueOnly(next);
    setStatusFilter('');
    applyFilters('', next, unreadOnly);
  }

  function chooseUnread() {
    const next = !unreadOnly;
    setUnreadOnly(next);
    applyFilters(statusFilter, queueOnly, next);
  }

  function reload() {
    setFilters((current) => ({ ...current }));
  }

  function complete(id: number) {
    api.adminCompleteOrder(id).then(reload).catch(() => setError('Не удалось выполнить заказ'));
  }

  function move(id: number, direction: 'up' | 'down') {
    api.adminMoveOrder(id, direction).then(reload).catch(() => setError('Не удалось изменить очередь'));
  }

  function cancelSeen(id: number) {
    api.adminCancelSeen(id).then(reload).catch(() => setError('Не удалось подтвердить отмену'));
  }

  const activeCancellations = (data?.items || []).filter(
    (item) => item.status === 'cancelled' && !item.cancel_seen_at,
  );

  if (loading && !data) return <Skeleton lines={5} />;

  return (
    <section>
      {activeCancellations.map((item) => (
        <div className="alert queue-banner" key={item.id}>
          <div className="alert-body">
            <div className="alert-title">Отмена заказа №{item.id}</div>
            <div className="alert-sub">
              {item.buyer_name} · {item.product_title}
            </div>
          </div>
          <button className="alert-btn" type="button" onClick={() => cancelSeen(item.id)}>
            Понятно
          </button>
        </div>
      ))}

      {data && (
        <div className="summary admin-summary">
          <div className="summary-cell">
            <div className="summary-k">В очереди</div>
            <div className="summary-v">{data.summary.queue}</div>
          </div>
          <div className="summary-cell">
            <div className="summary-k">Всего</div>
            <div className="summary-v">{data.summary.count}</div>
          </div>
          <div className="summary-cell">
            <div className="summary-k">Сумма</div>
            <div className="summary-v">{formatPrice(data.summary.sum)}</div>
          </div>
        </div>
      )}

      <div className="chips" aria-label="Фильтры заказов">
        <button className={`chip${!statusFilter && !queueOnly ? ' is-active' : ''}`} type="button" aria-pressed={!statusFilter && !queueOnly} onClick={() => chooseStatus('')}>
          Все
        </button>
        <button className={`chip${queueOnly ? ' is-active' : ''}`} type="button" aria-pressed={queueOnly} onClick={chooseQueue}>
          В очереди
        </button>
        <button className={`chip${statusFilter === 'done' ? ' is-active' : ''}`} type="button" aria-pressed={statusFilter === 'done'} onClick={() => chooseStatus('done')}>
          Готовые
        </button>
        <button className={`chip${statusFilter === 'cancelled' ? ' is-active' : ''}`} type="button" aria-pressed={statusFilter === 'cancelled'} onClick={() => chooseStatus('cancelled')}>
          Отменённые
        </button>
        <button className={`chip${unreadOnly ? ' is-active' : ''}`} type="button" aria-pressed={unreadOnly} onClick={chooseUnread}>
          Непрочитанные
        </button>
      </div>

      <div className="admin-filters">
        <div className="field">
          <label htmlFor="order-q">Поиск</label>
          <input id="order-q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Имя, товар или №" onKeyDown={(event) => event.key === 'Enter' && applyFilters()} />
        </div>
        <div className="field">
          <label htmlFor="order-buyer">Заказчик (VK ID)</label>
          <input id="order-buyer" inputMode="numeric" value={buyerId} onChange={(event) => setBuyerId(event.target.value)} placeholder="Например, 400977" onKeyDown={(event) => event.key === 'Enter' && applyFilters()} />
        </div>
        <div className="field">
          <label htmlFor="order-from">С даты</label>
          <input id="order-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="order-to">По дату</label>
          <input id="order-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="order-section">Раздел</label>
          <select id="order-section" value={sectionId} onChange={(event) => { setSectionId(event.target.value ? Number(event.target.value) : ''); setProductId(''); }}>
            <option value="">Все</option>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="order-product">Товар</label>
          <select id="order-product" value={productId} onChange={(event) => setProductId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">Все</option>
            {visibleProducts.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select>
        </div>
        <button className="btn secondary" type="button" onClick={() => applyFilters()}>Применить</button>
        <button className="btn secondary" type="button" onClick={() => downloadOrdersCsv(filters)}>CSV</button>
        <button className="btn secondary" type="button" onClick={() => downloadOrdersPdf(filters)}>PDF</button>
      </div>

      <div className="admin-muted" aria-live="polite">
        Автообновление: 10 с
        {lastUpdated ? ` · обновлено в ${lastUpdated.toLocaleTimeString('ru-RU')}` : ''}
      </div>

      {error && <div className="error-text">{error}</div>}
      {loading && <div className="admin-muted">Обновляю…</div>}

      <div>
        {(data?.items || []).map((item) => (
          <div className={`order${item.status === 'cancelled' ? ' is-cancelled' : ''}${item.status === 'done' ? ' is-done' : ''}`} key={item.id}>
            <div className="order-id">
              {item.status === 'new' && item.queue_position && <span className="qnum">{item.queue_position}</span>}
              № {item.id}
            </div>
            <div className="order-sum">{formatPrice(item.total)}</div>
            <div className="order-what">
              {item.product_title} · {item.buyer_name}
            </div>
            <div className="order-when">
              {formatDate(item.created_at)} <StatusChip status={item.status} />
            </div>
            <div className="order-action">
              <div className="move-group">
                {item.status === 'new' && (
                  <>
                    <button className="move-btn" type="button" aria-label="Выше" disabled={!item.queue_position || item.queue_position <= 1} onClick={() => move(item.id, 'up')}>↑</button>
                    <button className="move-btn" type="button" aria-label="Ниже" disabled={!item.queue_position || item.queue_position >= (data?.summary.queue || 0)} onClick={() => move(item.id, 'down')}>↓</button>
                  </>
                )}
              </div>
              <div className="admin-actions">
                <Link className="done-btn" to={`/admin/orders/${item.id}`}>Открыть</Link>
                {item.status === 'new' && (
                  <button className="done-btn" type="button" onClick={() => complete(item.id)}>Выполнить</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {data && data.items.length === 0 && <div className="empty">Заказов по этому фильтру нет.</div>}
      </div>

      {data && data.total > 0 && (
        <div className="admin-actions" style={{ marginTop: 16 }}>
          <button className="btn secondary" type="button" disabled={(filters.offset || 0) <= 0} onClick={() => setFilters({ ...filters, offset: Math.max(0, (filters.offset || 0) - LIMIT) })}>
            Назад
          </button>
          <span className="admin-muted">
            {(filters.offset || 0) + 1}–{Math.min((filters.offset || 0) + LIMIT, data.total)} из {data.total}
          </span>
          <button className="btn secondary" type="button" disabled={(filters.offset || 0) + LIMIT >= data.total} onClick={() => setFilters({ ...filters, offset: (filters.offset || 0) + LIMIT })}>
            Вперёд
          </button>
        </div>
      )}
    </section>
  );
}
