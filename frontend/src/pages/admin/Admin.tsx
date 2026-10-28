import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { usePolling } from '../../hooks/usePolling';

const TABS = [
  { to: 'sections', label: 'Разделы' },
  { to: 'products', label: 'Товары' },
  { to: 'orders', label: 'Заказы' },
  { to: 'reserve', label: 'Резерв' },
  { to: 'players', label: 'Заказчики' },
  { to: 'texts', label: 'Тексты' },
  { to: 'logs', label: 'Логи' },
];

export default function Admin() {
  const [unread, setUnread] = useState(0);
  const [reserveWaiting, setReserveWaiting] = useState(0);
  const [reserveReady, setReserveReady] = useState(0);

  async function refreshBadges() {
    await Promise.all([
      api.adminOrders({ limit: 1 })
        .then((data) => setUnread(data.summary.unread))
        .catch(() => {}),
      api.adminReserve()
        .then((data) => {
          setReserveWaiting(data.summary.waiting);
          setReserveReady(data.summary.ready);
        })
        .catch(() => {}),
    ]);
  }

  useEffect(() => {
    void refreshBadges();
  }, []);
  usePolling(refreshBadges, 15_000);

  return (
    <main className="page page-admin">
      <h1>Управление</h1>
      <nav className="admin-tabs" aria-label="Разделы управления">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `admin-tab${isActive ? ' is-active' : ''}`}
          >
            {tab.label}
            {tab.to === 'orders' && unread > 0 && <span className="admin-tab-badge">{unread}</span>}
            {tab.to === 'reserve' && reserveReady > 0 && <span className="admin-tab-badge">{reserveReady}</span>}
            {tab.to === 'reserve' && reserveReady === 0 && reserveWaiting > 0 && (
              <span className="admin-tab-wait">{reserveWaiting}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}
