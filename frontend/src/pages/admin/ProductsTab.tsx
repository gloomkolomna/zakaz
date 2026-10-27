import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type AdminProduct, type AdminSection } from '../../api/endpoints';
import { formatPrice } from '../../api/money';
import EarlyBadge from '../../components/EarlyBadge';
import { useConfirm } from '../../components/ConfirmProvider';
import Skeleton from '../../components/Skeleton';

interface AppliedFilters {
  section: number | '';
  q: string;
}

export default function ProductsTab() {
  const confirm = useConfirm();
  const [sections, setSections] = useState<AdminSection[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [filterSection, setFilterSection] = useState<number | ''>('');
  const [filterQ, setFilterQ] = useState('');
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const [createSection, setCreateSection] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  function loadProducts(section: number | '', q: string) {
    return api.adminProducts(section || undefined, q || undefined)
      .then(setProducts)
      .catch(() => setError('Не удалось загрузить товары'));
  }

  useEffect(() => {
    api.adminSections().then((rows) => {
      setSections(rows);
      const first = rows.find((row) => row.is_active) || rows[0];
      if (first) {
        setFilterSection(first.id);
        setCreateSection(first.id);
        setApplied({ section: first.id, q: '' });
      } else {
        setApplied({ section: '', q: '' });
      }
    }).catch(() => setError('Не удалось загрузить разделы'));
  }, []);

  useEffect(() => {
    if (applied) void loadProducts(applied.section, applied.q);
  }, [applied]);

  function applyFilters() {
    setApplied({ section: filterSection, q: filterQ.trim() });
  }

  function resetFilters() {
    setFilterSection('');
    setFilterQ('');
    setApplied({ section: '', q: '' });
  }

  function create() {
    if (!title.trim() || createSection === '') return;
    api.adminCreateProduct(createSection, title.trim())
      .then(() => {
        setTitle('');
        loadProducts(applied?.section ?? '', applied?.q ?? '');
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось создать товар'));
  }

  function togglePublish(product: AdminProduct) {
    api.adminUpdateProduct(product.id, { is_active: !product.is_active })
      .then(() => loadProducts(applied?.section ?? '', applied?.q ?? ''))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось изменить публикацию'));
  }

  async function remove(product: AdminProduct) {
    const ok = await confirm({
      title: `Удалить товар «${product.title}»?`,
      text: 'Действие необратимо. История заказов сохранится.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteProduct(product.id)
      .then(() => loadProducts(applied?.section ?? '', applied?.q ?? ''))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось удалить товар'));
  }

  if (!sections || products === null) return <Skeleton lines={4} />;

  if (sections.length === 0) {
    return (
      <section>
        <div className="empty">
          Сначала создайте раздел. <Link className="text-link" to="/admin/sections">Перейти к разделам</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
        <div className="field">
          <label htmlFor="product-filter-section">Раздел</label>
          <select
            id="product-filter-section"
            value={filterSection}
            onChange={(event) => setFilterSection(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Все разделы</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}{section.is_active ? '' : ' (скрыт)'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="product-filter-q">Товар</label>
          <input
            id="product-filter-q"
            value={filterQ}
            onChange={(event) => setFilterQ(event.target.value)}
            placeholder="Название или ID"
          />
        </div>
        <button className="btn secondary" type="submit">Найти</button>
        <button className="btn secondary" type="button" onClick={resetFilters}>Сбросить</button>
      </form>

      <div className="admin-form">
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="product-create-section">Новый товар в разделе</label>
            <select
              id="product-create-section"
              value={createSection}
              onChange={(event) => setCreateSection(Number(event.target.value))}
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
          <button className="btn" type="button" onClick={create} disabled={!title.trim() || createSection === ''}>
            Добавить товар
          </button>
        </div>
        <p className="admin-muted">Новый товар создаётся скрытым — опубликуйте его после заполнения.</p>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-muted">Найдено товаров: {products.length}</div>
      <div className="admin-list">
        {products.map((product) => (
          <div className="admin-row" key={product.id}>
            <div className="admin-row-head">
              <div className="admin-row-title">
                {product.title}{' '}
                {!product.is_active && <span className="pill-draft">Скрыт</span>}
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
              <button className="btn secondary" type="button" onClick={() => togglePublish(product)}>
                {product.is_active ? 'Скрыть' : 'Опубликовать'}
              </button>
              <Link className="btn secondary" to={`/product/${product.id}`}>
                Открыть как покупатель
              </Link>
              <button className="icon-action red" type="button" onClick={() => remove(product)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="empty">Товаров по фильтру нет.</div>}
      </div>
    </section>
  );
}
