import Logo from '../components/Logo';

export default function OutsideVk() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>Магазин игр</span>
        </div>
      </header>
      <main className="page">
        <div className="notice">
          <h1>Откройте внутри ВКонтакте</h1>
          <p>
            Магазин игр работает как мини-приложение. Зайдите в него из сообщества
            ВКонтакте — вход произойдёт автоматически.
          </p>
        </div>
      </main>
    </div>
  );
}
