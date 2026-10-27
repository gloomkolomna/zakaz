import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import Logo from './Logo';

interface Tab {
  to: string;
  label: string;
  end?: boolean;
}

const BASE_TABS: Tab[] = [
  { to: '/', label: 'Каталог', end: true },
  { to: '/orders', label: 'Мои заказы' },
  { to: '/info', label: 'Информация' },
];

export default function MiniAppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const tabs: Tab[] =
    user?.role === 'admin'
      ? [...BASE_TABS, { to: '/admin', label: 'Управление' }]
      : BASE_TABS;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="СобериЗаказ — в каталог">
          <Logo />
          <span>СобериЗаказ</span>
        </NavLink>
        <button
          className="icon-btn"
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Меню"
          aria-expanded={menuOpen}
        >
          <span className="menu-glyph" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      {children}

      {menuOpen &&
        createPortal(
          <div className="menu-sheet" role="dialog" aria-modal="true" aria-label="Меню">
            <div className="menu-sheet-head">
              <div className="brand">
                <Logo />
                <span>СобериЗаказ</span>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Закрыть меню"
              >
                ×
              </button>
            </div>
            <nav className="menu-nav">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => `menu-link${isActive ? ' is-active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
