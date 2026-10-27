import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type AdminProduct, type AdminSection } from '../../api/endpoints';
import { formatPrice } from '../../api/money';
import EarlyBadge from '../../components/EarlyBadge';
import Skeleton from '../../components/Skeleton';

export default function ProductsTab() {
  const [sections, setSections] = useState<AdminSection[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  function loadProducts(filter: number | '') {
    api.adminProducts(filter || undefined)
      .then(setProducts)
      .catch(() => setError('Не удалось загрузить товары'));
  }

  useEffect(() => {
    api.adminSections().then((rows) => {
      setSections(rows);
      const first = rows.find((row) => row.is_active) || rows[0];
      if (first && sectionId === '') setSectionId(first.id);
    }).catch(() => setError('Не удалось загрузить разделы'));
  }, []);

  useEffect(() => {
    loadProducts(sectionId);
  }, [sectionId]);

  function create() {
    if (!title.trim() || sectionId === '') return;
    api.adminCreateProduct(sectionId, title.trim())
      .then(() => {
        setTitle('');
        loadProducts(sectionId);
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось создать товар'));
  }

  if (!sections || products === null) return <Skeleton lines={4} />;

  return (
    <section>
      {sections.length === 0 ? (
        <div className="empty">
          Сначала создайте раздел. <Link className="text-link" to="/admin/sections">Перейти к разделам</Link>
        </div>
      ) : (
        <>
          <div className="admin-form">
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="product-section">Раздел</label>
                <select
                  id="product-section"
                  value={sectionId}
                  onChange={(event) => setSectionId(Number(event.target.value))}
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}{section.is_active ? '' : ' (скрыт)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="product-title">Название товара</label>
                <input
                  id="product-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Трекер на год · Цветение"
                />
              </div>
            </div>
            <div>
              <button className="btn" type="button" onClick={create} disabled={!title.trim() || sectionId === ''}>
                Добавить товар
              </button>
            </div>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="admin-list">
            {products.map((product) => (
              <div className="admin-row" key={product.id}>
                <div className="admin-row-head">
                  <div className="admin-row-title">
                    {product.title}{' '}
                    {!product.is_active && <span className="pill-cancel">Скрыт</span>}
                    {product.is_early && <EarlyBadge until={product.early_until} />}
                  </div>
                  <span className="admin-muted">{formatPrice(product.from_price)}</span>
                </div>
                <div className="admin-muted">
                  {product.section_title} · {product.steps_count ?? product.steps?.length ?? 0} шаг. ·{' '}
                  {product.image_url ? 'обложка есть' : 'без обложки'}
                </div>
                <div className="admin-actions">
                  <Link className="btn secondary" to={`/admin/products/${product.id}`}>
                    Редактировать
                  </Link>
                  <Link className="btn secondary" to={`/product/${product.id}`}>
                    Открыть как покупатель
                  </Link>
                </div>
              </div>
            ))}
            {products.length === 0 && <div className="empty">В разделе пока нет товаров.</div>}
          </div>
        </>
      )}
    </section>
  );
}
