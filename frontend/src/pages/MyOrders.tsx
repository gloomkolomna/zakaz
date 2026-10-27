import { Link } from 'react-router-dom';

export default function MyOrders() {
  return (
    <main className="page">
      <h1>Мои заказы</h1>
      <section className="section" aria-label="Список заказов">
        <div className="empty">
          <p className="empty-text">Заказов пока нет.</p>
          <Link className="text-link" to="/">
            Собрать первый
          </Link>
        </div>
      </section>
    </main>
  );
}
