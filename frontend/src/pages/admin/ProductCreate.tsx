import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type AdminSection } from '../../api/endpoints';
import BackLink from '../../components/BackLink';
import Skeleton from '../../components/Skeleton';

export default function ProductCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSection = Number(searchParams.get('section_id'));
  const [sections, setSections] = useState<AdminSection[] | null>(null);
  const [sectionId, setSectionId] = useState<number | ''>(
    Number.isFinite(initialSection) && initialSection > 0 ? initialSection : '',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminSections()
      .then((rows) => {
        setSections(rows);
        if (sectionId === '') {
          const first = rows.find((row) => row.is_active) || rows[0];
          if (first) setSectionId(first.id);
        }
      })
      .catch(() => setError('Не удалось загрузить разделы'));
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || sectionId === '') return;
    const parsedStock = stock.trim() ? Number(stock) : 0;
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setError('Кол-во копий не может быть отрицательным');
      return;
    }
    setSaving(true);
    setError(null);
    const order = sortOrder.trim() ? Number(sortOrder) : undefined;
    api.adminCreateProduct({
      section_id: sectionId,
      title: title.trim(),
      description: description.trim() || undefined,
      stock: parsedStock,
      sort_order: order !== undefined && Number.isFinite(order) ? order : undefined,
      is_active: active,
    })
      .then((product) => navigate(`/admin/products/${product.id}`))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось создать товар'))
      .finally(() => setSaving(false));
  }

  if (!sections) {
    if (error) {
      return (
        <section>
          <BackLink to="/admin/products">К товарам</BackLink>
          <div className="empty">{error}</div>
        </section>
      );
    }
    return <Skeleton lines={4} />;
  }

  if (sections.length === 0) {
    return (
      <section>
        <BackLink to="/admin/products">К товарам</BackLink>
        <div className="empty">Сначала создайте раздел.</div>
      </section>
    );
  }

  return (
    <section>
      <BackLink to="/admin/products">К товарам</BackLink>
      <h2 className="section-title">Новый товар</h2>
      <p className="admin-muted">
        Выберите раздел и заполните основное. Шаги, карточки, фото и видео
        добавите на следующем экране.
      </p>

      <form className="admin-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="create-section">Раздел</label>
          <select
            id="create-section"
            value={sectionId}
            onChange={(event) => setSectionId(Number(event.target.value))}
            required
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}{section.is_active ? '' : ' (скрыт)'}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="create-title">Название товара</label>
          <input
            id="create-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, «Трекер на год · Цветение»"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="create-description">Описание</label>
          <textarea
            id="create-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Коротко о товаре"
          />
        </div>

        <div className="field">
          <label htmlFor="create-stock">Кол-во копий</label>
          <input
            id="create-stock"
            type="number"
            min={0}
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="Без ограничения"
          />
          <div className="admin-muted">Пусто или 0 — без ограничения. Одна копия = один заказ.</div>
        </div>

        <div className="field">
          <label htmlFor="create-sort">Порядок</label>
          <input
            id="create-sort"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="Автоматически"
          />
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Опубликовать сразу — товар будет виден в каталоге
        </label>

        {error && <div className="error-text">{error}</div>}

        <div className="admin-actions">
          <button className="btn" type="submit" disabled={saving || !title.trim() || sectionId === ''}>
            {saving ? 'Создаю…' : 'Создать товар'}
          </button>
          <button className="btn secondary" type="button" onClick={() => navigate('/admin/products')}>
            Отмена
          </button>
        </div>
      </form>
    </section>
  );
}
