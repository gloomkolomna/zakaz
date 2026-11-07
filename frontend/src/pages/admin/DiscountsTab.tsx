import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type AdminDiscountGrant } from '../../api/endpoints';
import { formatDate } from '../../api/money';
import { useConfirm } from '../../components/ConfirmProvider';
import Skeleton from '../../components/Skeleton';

const STATUS_LABELS = {
  available: 'Доступна',
  used: 'Использована',
  revoked: 'Отозвана',
};

export default function DiscountsTab() {
  const confirm = useConfirm();
  const [items, setItems] = useState<AdminDiscountGrant[] | null>(null);
  const [vkId, setVkId] = useState('');
  const [percent, setPercent] = useState('5');
  const [filterVkId, setFilterVkId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load(vk = filterVkId, status = filterStatus) {
    return api.adminDiscounts({
      ...(vk.trim() ? { vk_id: Number(vk) } : {}),
      ...(status ? { status } : {}),
    }).then((rows) => {
      setItems(rows);
      setError(null);
    }).catch(() => setError('Не удалось загрузить скидки'));
  }

  useEffect(() => {
    void load('', '');
  }, []);

  function create(event: FormEvent) {
    event.preventDefault();
    const id = Number(vkId);
    const value = Number(percent);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(value) || value < 1 || value > 99) {
      setError('Укажите положительный VK ID и процент от 1 до 99');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    api.adminCreateDiscount(id, value)
      .then(() => {
        setNotice(`Скидка ${value}% выдана заказчику ${id}`);
        setVkId('');
        return load();
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось выдать скидку'))
      .finally(() => setBusy(false));
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  async function revoke(item: AdminDiscountGrant) {
    const ok = await confirm({
      title: `Отозвать скидку ${item.percent}%?`,
      text: `Заказчик ${item.display_name || item.vk_id} больше не сможет применить её к заказу.`,
      confirmLabel: 'Отозвать',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    api.adminRevokeDiscount(item.id)
      .then(() => load())
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось отозвать скидку'))
      .finally(() => setBusy(false));
  }

  return (
    <section>
      <form className="admin-filters" onSubmit={create}>
        <div className="field">
          <label htmlFor="discount-vk">VK ID заказчика</label>
          <input
            id="discount-vk"
            type="number"
            min={1}
            value={vkId}
            onChange={(event) => setVkId(event.target.value)}
            placeholder="Например, 400977"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="discount-percent">Скидка, %</label>
          <input
            id="discount-percent"
            type="number"
            min={1}
            max={99}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={busy}>Выдать единоразовую скидку</button>
      </form>
      <p className="admin-muted">Заказчик увидит её при оформлении любого заказа. Регистрация в приложении не нужна.</p>

      <form className="admin-filters" onSubmit={applyFilters}>
        <div className="field">
          <label htmlFor="discount-filter-vk">Фильтр по VK ID</label>
          <input id="discount-filter-vk" type="number" value={filterVkId} onChange={(event) => setFilterVkId(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="discount-filter-status">Статус</label>
          <select id="discount-filter-status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">Все</option>
            <option value="available">Доступна</option>
            <option value="used">Использована</option>
            <option value="revoked">Отозвана</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Показать</button>
        {(filterVkId || filterStatus) && (
          <button className="btn secondary" type="button" onClick={() => { setFilterVkId(''); setFilterStatus(''); void load('', ''); }}>
            Сбросить
          </button>
        )}
      </form>

      {error && <div className="error-text">{error}</div>}
      {notice && <div className="alert"><div className="alert-body">{notice}</div></div>}
      {!items ? <Skeleton lines={5} /> : (
        <div className="admin-list">
          {items.map((item) => (
            <div className="admin-row" key={item.id}>
              <div className="admin-row-head">
                {item.user_registered ? (
                  <Link className="admin-row-title" to={`/admin/players/${item.vk_id}`}>
                    {item.display_name || `Заказчик ${item.vk_id}`} <span className="admin-muted">· {item.vk_id}</span>
                  </Link>
                ) : (
                  <span className="admin-row-title">VK ID {item.vk_id}</span>
                )}
                <strong>{item.percent}%</strong>
              </div>
              <div className="admin-muted">
                {STATUS_LABELS[item.status]} · {item.source === 'manual' ? 'выдана вручную' : 'из «Улицы праздников»'}
                {' · '}выдана {formatDate(item.created_at)}
                {item.used_at ? ` · применена ${formatDate(item.used_at)}` : ''}
              </div>
              <div className="admin-actions">
                {item.order_id && (
                  <Link className="btn secondary" to={`/admin/orders/${item.order_id}`}>
                    Заказ{item.order_title ? ` · ${item.order_title}` : ` №${item.order_id}`}
                  </Link>
                )}
                {item.status === 'available' && (
                  <button className="btn danger" type="button" disabled={busy} onClick={() => revoke(item)}>Отозвать</button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="empty">Скидок по этому фильтру нет.</div>}
        </div>
      )}
    </section>
  );
}
