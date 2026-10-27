import { useEffect, useState } from 'react';
import { api, type AdminLog } from '../../api/endpoints';
import { formatDate } from '../../api/money';
import Skeleton from '../../components/Skeleton';

const LEVELS = ['', 'warn', 'error', 'info'];

export default function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[] | null>(null);
  const [level, setLevel] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setLogs(null);
    api.adminLogs(level || undefined)
      .then(setLogs)
      .catch(() => setError(true));
  }, [level]);

  if (error) {
    return <div className="empty">Не удалось загрузить логи.</div>;
  }

  if (!logs) return <Skeleton lines={4} />;

  return (
    <section>
      <div className="admin-filters">
        <div className="field">
          <label htmlFor="log-level">Уровень</label>
          <select id="log-level" value={level} onChange={(event) => setLevel(event.target.value)}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>{value || 'Все'}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        {logs.map((log) => (
          <div className="admin-log-row" key={log.id}>
            <span className={`admin-log-level ${log.level === 'error' ? 'error-text' : 'admin-muted'}`}>
              {log.level}
            </span>
            <div>
              <div className="admin-log-path">
                {log.method} {log.path} {log.status_code ? `· ${log.status_code}` : ''}
              </div>
              {log.message && <div className="admin-muted">{log.message}</div>}
            </div>
            <span className="admin-muted">{formatDate(log.created_at)}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="empty">Логов нет.</div>}
      </div>
    </section>
  );
}
