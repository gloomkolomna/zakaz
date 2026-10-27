import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Catalog } from '../api/endpoints';
import { formatPrice } from '../api/money';
import { mediaUrl } from '../api/media';
import EarlyBadge from '../components/EarlyBadge';
import Skeleton from '../components/Skeleton';

export default function Catalog() {
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api.catalog()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Skeleton lines={4} />;

  if (error) {
    return (
      <main className="page">
        <h1>Наборы для вышивки</h1>
        <p className="lede">Не удалось загрузить каталог. Проверьте связь.</p>
        <div className="page-actions">
          <button className="btn" type="button" onClick={load}>
            Повторить
          </button>
        </div>
      </main>
    );
  }

  const sections = (data?.sections || []).filter((section) => section.products.length > 0);
  const title = data?.title || 'Наборы для вышивки';
  const description = data?.description || 'Трекеры на год и для хобби. Собираете набор по шагам — цена складывается сама.';

  return (
    <main className="page">
      <h1>{title}</h1>
      <p className="lede">{description}</p>

      {sections.length === 0 ? (
        <section className="section" aria-label="Каталог">
          <div className="empty">Скоро здесь появятся наборы</div>
        </section>
      ) : (
        sections.map((section) => (
          <section className="section" key={section.id} aria-label={section.title}>
            <h2 className="section-title">{section.title}</h2>
            <div className="products">
              {section.products.map((product) => (
                <Link className="product" key={product.id} to={`/product/${product.id}`}>
                  <div className="product-media">
                    {product.image_url ? (
                      <img src={mediaUrl(product.image_url)} alt={product.title} loading="lazy" />
                    ) : (
                      <span className="image-placeholder">Фото готовится</span>
                    )}
                  </div>
                  <div className="product-name">
                    {product.title}
                    {product.is_early && <EarlyBadge until={product.early_until} />}
                  </div>
                  <div className="product-meta">
                    {product.steps_count === 0 || product.from_price == null
                      ? 'Скоро'
                      : `от ${formatPrice(product.from_price)}`}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
