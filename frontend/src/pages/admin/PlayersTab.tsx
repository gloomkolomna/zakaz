import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type AdminPlayer } from '../../api/endpoints';
import Skeleton from '../../components/Skeleton';

export default function PlayersTab() {
  const [players, setPlayers] = useState<AdminPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');

  function load(search = q) {
    setError(null);
    api.adminPlayers(search.trim() || undefined)
      .then(setPlayers)
      .catch(() => setError('Не удалось загрузить заказчиков'));
  }

  useEffect(() => {
    void load('');
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    load(q);
  }

  function resetSearch() {
    setQ('');
    load('');
  }

  function toggleExempt(player: AdminPlayer) {
    api.adminSetDonorExempt(player.vk_id, !player.donor_exempt)
      .then(() => setPlayers((rows) => rows?.map((row) => row.vk_id === player.vk_id ? { ...row, donor_exempt: !player.donor_exempt } : row) || null))
      .catch(() => setError('Не удалось изменить флаг дона'));
  }

  function sync() {
    setSyncing(true);
    api.adminSyncDonors()
      .then((data) => {
        setError(`Синхронизировано: ${data.synced}`);
        load();
      })
      .catch(() => setError('Донат-бот недоступен'))
      .finally(() => setSyncing(false));
  }

  if (!players) return <Skeleton lines={5} />;

  return (
    <section>
      <form className="admin-filters" onSubmit={search}>
        <div className="field">
          <label htmlFor="player-q">Поиск по ФИО или VK ID</label>
          <input
            id="player-q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Например, Иван или 400977"
          />
        </div>
        <button className="btn secondary" type="submit">Найти</button>
        {q && <button className="btn secondary" type="button" onClick={resetSearch}>Сбросить</button>}
      </form>

      <div className="admin-actions" style={{ marginBottom: 16 }}>
        <button className="btn secondary" type="button" onClick={sync} disabled={syncing}>
          {syncing ? 'Синхронизирую…' : 'Синхронизировать донов'}
        </button>
      </div>
      {error && <div className="error-text">{error}</div>}

      <div className="admin-list">
        {players.map((player) => (
          <div className="admin-row" key={player.vk_id}>
            <div className="admin-row-head">
              <Link className="admin-row-title" to={`/admin/players/${player.vk_id}`}>
                {player.display_name} <span className="admin-muted">· {player.vk_id}</span>
              </Link>
              <span className={`oc-status${player.is_donor ? ' red' : ''}`}>
                {player.is_donor ? 'Дон' : 'Не дон'}
              </span>
            </div>
            <div className="admin-muted">
              {player.role} · {player.status} · {player.orders_count} заказ(ов)
            </div>
            <div className="admin-actions">
              <Link className="btn secondary" to={`/admin/players/${player.vk_id}`}>
                Заказы заказчика
              </Link>
              <label className="checkbox">
                <input type="checkbox" checked={player.donor_exempt} onChange={() => toggleExempt(player)} />
                Доступ как у дона вручную
              </label>
            </div>
          </div>
        ))}
        {players.length === 0 && <div className="empty">Заказчиков пока нет.</div>}
      </div>
    </section>
  );
}
