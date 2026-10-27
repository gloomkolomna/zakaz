import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: 'sections', label: 'Разделы' },
  { to: 'products', label: 'Товары' },
  { to: 'orders', label: 'Заказы' },
  { to: 'players', label: 'Игроки' },
  { to: 'texts', label: 'Тексты' },
  { to: 'logs', label: 'Логи' },
];

export default function Admin() {
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
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}
