import { useEffect, useState } from 'react';
import { api, type AdminLog } from '../../api/endpoints';
import { formatDate } from '../../api/money';
import Skeleton from '../../components/Skeleton';

function parseDetails(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function prettyDetails(raw: string | null): string {
  if (!raw) return '';
  const parsed = parseDetails(raw);
  return parsed ? JSON.stringify(parsed, null, 2) : raw;
}

function tracebackOf(raw: string | null): string | null {
  const parsed = parseDetails(raw);
  return parsed && typeof parsed.traceback === 'string' ? parsed.traceback : null;
}

export default function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    api.adminLogs()
      .then(setLogs)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  if (error) {
    return <div className="empty">Не удалось загрузить логи.</div>;
  }

  if (!logs) return <Skeleton lines={4} />;

  return (
    <section>
      <div className="admin-log-head">
        <div>
          <h2 className="section-title">Ошибки</h2>
          <p className="admin-muted">
            Только level=error. Нажмите на строку, чтобы раскрыть полные детали.
          </p>
        </div>
        <button className="btn secondary" type="button" onClick={load} disabled={loading}>
          {loading ? 'Обновляю…' : 'Обновить'}
        </button>
      </div>

      {logs.length === 0 && <div className="empty">Ошибок нет.</div>}

      <div>
        {logs.map((log) => {
          const open = openId === log.id;
          const details = prettyDetails(log.details);
          const traceback = tracebackOf(log.details);
          return (
            <div className={`admin-log-item${open ? ' is-open' : ''}`} key={log.id}>
              <button
                className="admin-log-row"
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : log.id)}
              >
                <span className="admin-log-level error-text">error</span>
                <span className="admin-log-main">
                  <span className="admin-log-path">
                    {log.method} {log.path} {log.status_code ? `· ${log.status_code}` : ''}
                  </span>
                  <span className="admin-muted admin-log-message">
                    {log.message || 'Без сообщения'}
                  </span>
                </span>
                <span className="admin-muted admin-log-time">
                  {formatDate(log.created_at)}
                </span>
              </button>

              {open && (
                <div className="admin-log-details">
                  <dl className="admin-log-meta">
                    <div><dt>Источник</dt><dd>{log.source}</dd></div>
                    <div><dt>Событие</dt><dd>{log.event || '—'}</dd></div>
                    <div><dt>Метод</dt><dd>{log.method || '—'}</dd></div>
                    <div><dt>Путь</dt><dd>{log.path || '—'}</dd></div>
                    <div><dt>Статус</dt><dd>{log.status_code ?? '—'}</dd></div>
                    <div><dt>VK ID</dt><dd>{log.vk_id ?? '—'}</dd></div>
                    <div><dt>IP</dt><dd>{log.client_ip || '—'}</dd></div>
                    <div><dt>Время (UTC)</dt><dd>{log.created_at || '—'}</dd></div>
                  </dl>

                  <div>
                    <h3>Сообщение</h3>
                    <pre>{log.message || 'Без сообщения'}</pre>
                  </div>

                  <div>
                    <h3>Детали</h3>
                    <pre>{details || 'Деталей нет'}</pre>
                  </div>

                  {traceback && (
                    <div>
                      <h3>Stack trace</h3>
                      <pre className="admin-log-traceback">{traceback}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
