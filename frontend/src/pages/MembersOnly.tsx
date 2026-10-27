import { useState } from 'react';
import Logo from '../components/Logo';
import { useSession } from '../context/SessionContext';

const GROUP_URL = import.meta.env.VITE_VK_GROUP_URL || '';

export default function MembersOnly() {
  const { refresh, loading } = useSession();
  const [checking, setChecking] = useState(false);

  async function onCheck() {
    setChecking(true);
    await refresh();
    setChecking(false);
  }

  const busy = checking || loading;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>СобериЗаказ</span>
        </div>
      </header>
      <main className="page">
        <div className="notice">
          <h1>Только для подписчиков</h1>
          <p>
            Приложение открыто для подписчиков сообщества. Подпишитесь, а затем
            нажмите «Я подписался».
          </p>
          <div className="notice-actions">
            {GROUP_URL && (
              <a className="btn" href={GROUP_URL} target="_blank" rel="noreferrer">
                Перейти в сообщество
              </a>
            )}
            <button className="btn secondary" type="button" onClick={onCheck} disabled={busy}>
              {busy ? 'Проверяю…' : 'Я подписался'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
