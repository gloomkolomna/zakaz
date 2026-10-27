import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  api,
  type AdminCard,
  type AdminProduct,
  type AdminSection,
  type AdminStep,
} from '../../api/endpoints';
import { formatEarlyUntil, formatPrice } from '../../api/money';
import { mediaUrl } from '../../api/media';
import BackLink from '../../components/BackLink';
import Skeleton from '../../components/Skeleton';

interface ProductForm {
  section_id: number;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export default function ProductEdit() {
  const { id } = useParams();
  const productId = Number(id);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [newStep, setNewStep] = useState({ title: '', mode: 'single' as 'single' | 'multi', required: false });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    Promise.all([api.adminProduct(productId), api.adminSections()])
      .then(([data, sectionRows]) => {
        setProduct(data);
        setSections(sectionRows);
        setForm({
          section_id: data.section_id,
          title: data.title,
          description: data.description || '',
          sort_order: data.sort_order,
          is_active: data.is_active,
        });
        setVideoUrl(data.video_url || '');
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось загрузить товар'));
  }

  useEffect(load, [productId]);

  if (!product || !form) {
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

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function save() {
    if (!form) return;
    setSaving(true);
    api.adminUpdateProduct(productId, form)
      .then(() => {
        setError(null);
        load();
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось сохранить товар'))
      .finally(() => setSaving(false));
  }

  function uploadImage(file: File | undefined) {
    if (!file) return;
    api.adminUploadProductImage(productId, file).then(load).catch(() => setError('Не удалось загрузить обложку'));
  }

  function uploadVideo(file: File | undefined) {
    if (!file) return;
    api.adminUploadProductVideo(productId, file).then(load).catch((e) => setError(e?.response?.data?.detail || 'Не удалось загрузить видео'));
  }

  function uploadPoster(file: File | undefined) {
    if (!file) return;
    api.adminUploadVideoPoster(productId, file).then(load).catch(() => setError('Не удалось загрузить постер'));
  }

  function saveVideoUrl() {
    api.adminSetVideoUrl(productId, videoUrl.trim() || null)
      .then(load)
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось сохранить ссылку'));
  }

  function deleteVideo() {
    if (!window.confirm('Удалить видео и ссылку?')) return;
    api.adminDeleteVideo(productId).then(load).catch(() => setError('Не удалось удалить видео'));
  }

  function toggleEarly() {
    const next = !product!.is_early;
    api.adminSetEarly(productId, next)
      .then(load)
      .catch(() => setError('Не удалось переключить «до анонса»'));
  }

  function addStep() {
    if (!newStep.title.trim()) return;
    api.adminCreateStep(productId, {
      title: newStep.title.trim(),
      selection_mode: newStep.mode,
      is_required: newStep.required,
    })
      .then(() => {
        setNewStep({ title: '', mode: 'single', required: false });
        load();
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось добавить шаг'));
  }

  function moveStep(index: number, direction: -1 | 1) {
    if (!product?.steps) return;
    const target = index + direction;
    if (target < 0 || target >= product.steps.length) return;
    const ids = product.steps.map((step) => step.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    api.adminReorderSteps(productId, ids).then(load).catch(() => setError('Не удалось изменить порядок'));
  }

  const steps = product.steps || [];

  return (
    <section>
      <BackLink to="/admin/products">К товарам</BackLink>
      <h2 className="section-title">{product.title}</h2>
      {error && <div className="error-text">{error}</div>}

      <div className="admin-form">
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="edit-section">Раздел</label>
            <select id="edit-section" value={form.section_id} onChange={(event) => update('section_id', Number(event.target.value))}>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>{section.title}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-title">Название</label>
            <input id="edit-title" value={form.title} onChange={(event) => update('title', event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="edit-description">Описание</label>
          <textarea id="edit-description" value={form.description} onChange={(event) => update('description', event.target.value)} />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="edit-sort">Порядок</label>
            <input id="edit-sort" type="number" value={form.sort_order} onChange={(event) => update('sort_order', Number(event.target.value))} />
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.is_active} onChange={(event) => update('is_active', event.target.checked)} />
            Опубликован — виден в каталоге
          </label>
        </div>
        <div>
          <button className="btn" type="button" onClick={save} disabled={saving || !form.title.trim()}>
            {saving ? 'Сохраняю…' : 'Сохранить товар'}
          </button>
        </div>
      </div>

      <div className="admin-form">
        <h3 className="section-title">Обложка</h3>
        <div className="admin-card-row">
          <div className="thumb">
            {product.image_url ? <img src={mediaUrl(product.image_url)} alt={product.title} /> : null}
          </div>
          <div className="admin-card-info">
            <div>{product.image_url ? 'Обложка загружена' : 'Обложки нет'}</div>
            <div className="admin-card-meta">JPG, PNG или HEIC, до 10 МБ</div>
          </div>
          <div className="admin-actions">
            <label className="btn secondary">
              Загрузить
              <input type="file" accept="image/*" hidden onChange={(event) => uploadImage(event.target.files?.[0])} />
            </label>
            {product.image_url && (
              <button className="icon-action red" type="button" onClick={() => api.adminDeleteProductImage(productId).then(load)}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="admin-form">
        <h3 className="section-title">Видеообзор</h3>
        <div className="field">
          <label htmlFor="video-url">Ссылка (YouTube, Rutube, VK)</label>
          <input id="video-url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
        </div>
        <div className="admin-actions">
          <button className="btn secondary" type="button" onClick={saveVideoUrl}>Сохранить ссылку</button>
          {product.video_url && (
            <button className="icon-action red" type="button" onClick={() => { setVideoUrl(''); api.adminSetVideoUrl(productId, null).then(load); }}>
              Очистить ссылку
            </button>
          )}
        </div>
        <div className="admin-card-meta">
          Файл приоритетнее ссылки: MP4, WebM или MOV, до 100 МБ.
        </div>
        <div className="admin-actions">
          <label className="btn secondary">
            Загрузить видео
            <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => uploadVideo(event.target.files?.[0])} />
          </label>
          <label className="btn secondary">
            Постер 16:9
            <input type="file" accept="image/*" hidden onChange={(event) => uploadPoster(event.target.files?.[0])} />
          </label>
          {(product.video_url || product.video_file_url) && (
            <button className="icon-action red" type="button" onClick={deleteVideo}>Удалить видео</button>
          )}
        </div>
        {product.video_file_url && <video className="admin-video-preview" src={mediaUrl(product.video_file_url)} controls preload="metadata" poster={mediaUrl(product.video_poster_url) || undefined} />}
        {product.video_poster_url && (
          <div className="admin-actions">
            <span className="admin-muted">Постер загружен</span>
            <button className="icon-action red" type="button" onClick={() => api.adminDeleteVideoPoster(productId).then(load)}>Сбросить постер</button>
          </div>
        )}
      </div>

      <div className="admin-form">
        <h3 className="section-title">До анонса</h3>
        <p className="admin-muted">
          {product.is_early
            ? `${formatEarlyUntil(product.early_until)}. Сейчас заказывают только доны.`
            : 'Окно выключено — товар доступен всем.'}
        </p>
        <div>
          <button className={`btn${product.is_early ? ' secondary' : ''}`} type="button" onClick={toggleEarly}>
            {product.is_early ? 'Снять досрочно' : 'Включить на 48 часов'}
          </button>
        </div>
      </div>

      <div className="steps-editor">
        <h3 className="section-title">Шаги и карточки</h3>
        {steps.map((step, index) => (
          <StepEditor
            key={step.id}
            step={step}
            index={index}
            total={steps.length}
            onMove={moveStep}
            onChanged={load}
            onError={setError}
          />
        ))}
        {steps.length === 0 && <div className="empty">Добавьте первый шаг — без него товар помечается «скоро».</div>}

        <div className="admin-form">
          <h4 className="section-title">Новый шаг</h4>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="new-step-title">Название шага</label>
              <input id="new-step-title" value={newStep.title} onChange={(event) => setNewStep({ ...newStep, title: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="new-step-mode">Выбор</label>
              <select id="new-step-mode" value={newStep.mode} onChange={(event) => setNewStep({ ...newStep, mode: event.target.value as 'single' | 'multi' })}>
                <option value="single">Один из вариантов</option>
                <option value="multi">Можно несколько</option>
              </select>
            </div>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={newStep.required} onChange={(event) => setNewStep({ ...newStep, required: event.target.checked })} />
            Обязательный шаг
          </label>
          <div>
            <button className="btn" type="button" onClick={addStep} disabled={!newStep.title.trim()}>Добавить шаг</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepEditor({
  step,
  index,
  total,
  onMove,
  onChanged,
  onError,
}: {
  step: AdminStep;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [cards, setCards] = useState<AdminCard[] | null>(null);
  const [form, setForm] = useState({
    title: step.title,
    hint: step.hint || '',
    selection_mode: step.selection_mode,
    is_required: step.is_required,
  });
  const [newCard, setNewCard] = useState({ title: '', price: 0, max_qty: 10 });

  function loadCards() {
    api.adminCards(step.id).then(setCards).catch(() => onError('Не удалось загрузить карточки'));
  }

  useEffect(loadCards, [step.id]);

  function saveStep() {
    api.adminUpdateStep(step.id, {
      title: form.title,
      hint: form.hint,
      selection_mode: form.selection_mode,
      is_required: form.is_required,
      is_active: step.is_active,
    })
      .then(() => {
        onChanged();
        onError('');
      })
      .catch((e) => onError(e?.response?.data?.detail || 'Не удалось сохранить шаг'));
  }

  function addCard() {
    if (!newCard.title.trim()) return;
    api.adminCreateCard(step.id, { title: newCard.title.trim(), price: newCard.price, max_qty: newCard.max_qty })
      .then(() => {
        setNewCard({ title: '', price: 0, max_qty: 10 });
        loadCards();
        onChanged();
      })
      .catch((e) => onError(e?.response?.data?.detail || 'Не удалось добавить карточку'));
  }

  function moveCard(cardIndex: number, direction: -1 | 1) {
    if (!cards) return;
    const target = cardIndex + direction;
    if (target < 0 || target >= cards.length) return;
    const ids = cards.map((card) => card.id);
    [ids[cardIndex], ids[target]] = [ids[target], ids[cardIndex]];
    api.adminReorderCards(step.id, ids).then(loadCards).catch(() => onError('Не удалось изменить порядок карточек'));
  }

  return (
    <div className="admin-step">
      <div className="admin-row-head">
        <div className="admin-row-title">
          {step.title} {!step.is_active && <span className="pill-cancel">Скрыт</span>}
        </div>
        <div className="admin-actions">
          <span className="admin-muted">{step.selection_mode === 'single' ? 'один' : 'несколько'}{step.is_required ? ' · обязательный' : ''}</span>
          <button className="icon-action" type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Шаг выше">↑</button>
          <button className="icon-action" type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} aria-label="Шаг ниже">↓</button>
          <button className="icon-action" type="button" onClick={() => api.adminUpdateStep(step.id, { is_active: !step.is_active }).then(onChanged)}>
            {step.is_active ? 'Скрыть' : 'Показать'}
          </button>
          <button className="icon-action red" type="button" onClick={() => window.confirm(`Удалить шаг «${step.title}»?`) && api.adminDeleteStep(step.id).then(onChanged)}>
            Удалить
          </button>
        </div>
      </div>

      <details>
        <summary className="admin-muted">Настройки шага</summary>
        <div className="admin-inline-form">
          <div className="field">
            <label>Название</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="field">
            <label>Подсказка</label>
            <input value={form.hint} onChange={(event) => setForm({ ...form, hint: event.target.value })} />
          </div>
          <div className="field">
            <label>Выбор</label>
            <select value={form.selection_mode} onChange={(event) => setForm({ ...form, selection_mode: event.target.value as 'single' | 'multi' })}>
              <option value="single">Один</option>
              <option value="multi">Несколько</option>
            </select>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.is_required} onChange={(event) => setForm({ ...form, is_required: event.target.checked })} />
            Обязательный
          </label>
          <button className="btn secondary" type="button" onClick={saveStep}>Сохранить шаг</button>
        </div>
      </details>

      <div className="admin-cards">
        {cards === null && <span className="admin-muted">Загрузка карточек…</span>}
        {cards?.map((card, cardIndex) => (
          <CardRow key={card.id} card={card} index={cardIndex} total={cards.length} onMove={moveCard} onChanged={() => { loadCards(); onChanged(); }} onError={onError} />
        ))}
        {cards?.length === 0 && <span className="admin-muted">Карточек нет.</span>}
      </div>

      <div className="admin-inline-form">
        <div className="field">
          <label>Новая карточка</label>
          <input value={newCard.title} onChange={(event) => setNewCard({ ...newCard, title: event.target.value })} placeholder="30 × 40 см" />
        </div>
        <div className="field">
          <label>Цена, ₽</label>
          <input type="number" min={0} value={newCard.price} onChange={(event) => setNewCard({ ...newCard, price: Number(event.target.value) })} />
        </div>
        <div className="field">
          <label>Макс. кол-во</label>
          <input type="number" min={1} max={99} value={newCard.max_qty} onChange={(event) => setNewCard({ ...newCard, max_qty: Number(event.target.value) })} />
        </div>
        <button className="btn secondary" type="button" onClick={addCard} disabled={!newCard.title.trim()}>Добавить карточку</button>
      </div>
    </div>
  );
}

function CardRow({
  card,
  index,
  total,
  onMove,
  onChanged,
  onError,
}: {
  card: AdminCard;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    title: card.title,
    description: card.description || '',
    price: card.price,
    max_qty: card.max_qty,
    is_active: card.is_active,
  });

  function save() {
    api.adminUpdateCard(card.id, form)
      .then(onChanged)
      .catch((e) => onError(e?.response?.data?.detail || 'Не удалось сохранить карточку'));
  }

  function upload(file: File | undefined) {
    if (!file) return;
    api.adminUploadCardImage(card.id, file).then(onChanged).catch(() => onError('Не удалось загрузить фото'));
  }

  return (
    <div>
      <div className="admin-card-row">
        <div className="thumb">{card.image_url ? <img src={mediaUrl(card.image_url)} alt={card.title} /> : null}</div>
        <div className="admin-card-info">
          <div>{card.title} {!card.is_active && <span className="pill-cancel">Скрыт</span>}</div>
          <div className="admin-card-meta">{formatPrice(card.price)} · макс. {card.max_qty}</div>
        </div>
        <div className="admin-actions">
          <button className="icon-action" type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Карточка выше">↑</button>
          <button className="icon-action" type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} aria-label="Карточка ниже">↓</button>
          <label className="icon-action">
            Фото
            <input type="file" accept="image/*" hidden onChange={(event) => upload(event.target.files?.[0])} />
          </label>
          <button className="icon-action red" type="button" onClick={() => window.confirm(`Удалить карточку «${card.title}»?`) && api.adminDeleteCard(card.id).then(onChanged)}>
            Удалить
          </button>
        </div>
      </div>
      <details>
        <summary className="admin-muted">Редактировать карточку</summary>
        <div className="admin-inline-form">
          <div className="field">
            <label>Название</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="field">
            <label>Описание</label>
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <div className="field">
            <label>Цена, ₽</label>
            <input type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} />
          </div>
          <div className="field">
            <label>Макс. кол-во</label>
            <input type="number" min={1} max={99} value={form.max_qty} onChange={(event) => setForm({ ...form, max_qty: Number(event.target.value) })} />
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            Активна
          </label>
          <button className="btn secondary" type="button" onClick={save}>Сохранить</button>
          {card.image_url && (
            <button className="icon-action red" type="button" onClick={() => api.adminDeleteCardImage(card.id).then(onChanged)}>Сбросить фото</button>
          )}
        </div>
      </details>
    </div>
  );
}
