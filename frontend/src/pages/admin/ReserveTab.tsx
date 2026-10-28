import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type AdminReserveItem, type AdminReserveResponse } from '../../api/endpoints';
import { formatDate } from '../../api/money';
import { useConfirm } from '../../components/ConfirmProvider';
import Skeleton from '../../components/Skeleton';
import { usePolling } from '../../hooks/usePolling';

interface ReserveGroup {
  product_id: number;
  product_title: string;
  product_is_active: boolean;
  stock: number;
  ordered_count: number;
  available: boolean;
  created_at: string | null;
  items: AdminReserveItem[];
}

function groupReserve(items: AdminReserveItem[]): ReserveGroup[] {
  const groups = new Map<number, ReserveGroup>();
  for (const item of items) {
    const current = groups.get(item.product_id);
    if (current) {
      current.items.push(item);
    } else {
      groups.set(item.product_id, {
        product_id: item.product_id,
        product_title: item.product_title,
        product_is_active: item.product_is_active,
        stock: item.stock,
        ordered_count: item.ordered_count,
        available: item.available,
        created_at: item.created_at,
        items: [item],
      });
    }
  }
  return [...groups.values()].sort(
    (left, right) =>
      Number(right.available) - Number(left.available) ||
      (left.created_at || '').localeCompare(right.created_at || ''),
  );
}

export default function ReserveTab() {
  const confirm = useConfirm();
  const [data, setData] = useState<AdminReserveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(silent = false) {
    return api.adminReserve()
      .then((rows) => {
        setData(rows);
        setError(null);
      })
      .catch(() => {
        if (!silent) setError('Не удалось загрузить резерв');
      });
  }

  useEffect(() => {
    void load();
  }, []);
  usePolling(() => load(true), 15_000);

  async function remove(item: AdminReserveItem) {
    const ok = await confirm({
      title: `Убрать заявку ${item.buyer_name}?`,
      text: `«${item.product_title}» — человек пропадёт из резерва.`,
      confirmLabel: 'Убрать',
      danger: true,
    });
    if (!ok) return;
    api.adminRemoveReserve(item.id)
      .then(() => load())
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось убрать заявку'));
  }

  const groups = useMemo(() => groupReserve(data?.items || []), [data]);
  const readyGroups = groups.filter((group) => group.available);

  if (!data) {
    if (error) {
      return (
        <section>
          <div className="empty">{error}</div>
        </section>
      );
    }
    return <Skeleton lines={4} />;
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <h2 className="section-title">Резерв</h2>
          <p className="admin-muted">
            Люди, которые ждут поступления товара. Свяжитесь с ними вручную.
          </p>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      {data.summary.waiting === 0 ? (
        <div className="empty">Пока никто не ждёт поступления.</div>
      ) : (
        <>
          <div className="summary admin-summary">
            <div className="summary-cell">
              <div className="summary-k">Ждут</div>
              <div className="summary-v">{data.summary.waiting}</div>
            </div>
            <div className="summary-cell">
              <div className="summary-k">Товаров</div>
              <div className="summary-v">{data.summary.products}</div>
            </div>
            <div className="summary-cell">
              <div className="summary-k">Можно связаться</div>
              <div className="summary-v">{data.summary.ready}</div>
            </div>
          </div>

          {readyGroups.map((group) => (
            <div className="alert queue-banner" key={`ready-${group.product_id}`}>
              <div className="alert-body">
                <div className="alert-title">Освободилось место</div>
                <div className="alert-sub">
                  {group.product_title} · ждут {group.items.length}. Свяжитесь с ожидающими.
                </div>
              </div>
            </div>
          ))}

          <div className="admin-list">
            {groups.map((group) => (
              <div className="admin-row" key={group.product_id}>
                <div className="admin-row-head">
                  <div className="admin-row-title">
                    {group.product_title}{' '}
                    {!group.product_is_active && <span className="pill-draft">Скрыт</span>}
                    {group.available ? (
                      <span className="pill-cancel">Есть место</span>
                    ) : (
                      <span className="pill-draft">Мест нет</span>
                    )}
                  </div>
                  <span className="admin-muted reserve-count">ждут {group.items.length}</span>
                </div>
                <div className="admin-muted">
                  {group.stock > 0
                    ? `копий: ${group.ordered_count} из ${group.stock}`
                    : 'копий без ограничения'}
                </div>
                <div className="reserve-people">
                  {group.items.map((item) => (
                    <div className="reserve-person" key={item.id}>
                      <div className="reserve-person-main">
                        <Link className="text-link" to={`/admin/players/${item.user_id}`}>
                          {item.buyer_name}
                        </Link>
                        <div className="admin-muted">
                          VK ID {item.user_id} · {formatDate(item.created_at)}
                        </div>
                      </div>
                      <div className="admin-actions">
                        <a
                          className="btn secondary"
                          href={`https://vk.com/id${item.user_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Написать
                        </a>
                        <button className="icon-action red" type="button" onClick={() => remove(item)}>
                          Убрать
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
