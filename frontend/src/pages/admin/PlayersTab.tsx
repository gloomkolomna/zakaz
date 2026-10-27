import { useEffect, useState } from 'react';
import { api, type AdminPlayer } from '../../api/endpoints';
import Skeleton from '../../components/Skeleton';

export default function PlayersTab() {
  const [players, setPlayers] = useState<AdminPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  function load() {
    api.adminPlayers()
      .then(setPlayers)
      .catch(() => setError('Не удалось загрузить игроков'));
  }

  useEffect(load, []);

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
              <div className="admin-row-title">
                {player.display_name} <span className="admin-muted">· {player.vk_id}</span>
              </div>
              <span className={`oc-status${player.is_donor ? ' red' : ''}`}>
                {player.is_donor ? 'Дон' : 'Не дон'}
              </span>
            </div>
            <div className="admin-muted">{player.role} · {player.status}</div>
            <label className="checkbox">
              <input type="checkbox" checked={player.donor_exempt} onChange={() => toggleExempt(player)} />
              Доступ как у дона вручную
            </label>
          </div>
        ))}
        {players.length === 0 && <div className="empty">Покупателей пока нет.</div>}
      </div>
    </section>
  );
}
