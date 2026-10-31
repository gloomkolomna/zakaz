import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type AdminProduct,
  type AdminSection,
  type CardImage,
  type ProductMode,
} from '../../api/endpoints';
import { formatEarlyUntil } from '../../api/money';
import { mediaUrl } from '../../api/media';
import { plural } from '../../api/plural';
import BackLink from '../../components/BackLink';
import { useConfirm } from '../../components/ConfirmProvider';
import SaveStatus, { saveDone, saveError, saveIdle, saveSaving, type SaveInfo } from '../../components/SaveStatus';
import Skeleton from '../../components/Skeleton';

interface ProductDraft {
  section_id: number;
  title: string;
  description: string;
  mode: ProductMode;
  price: string;
  stock: string;
  sort_order: string;
  is_active: boolean;
}

const MAX_PRODUCT_IMAGES = 10;

function draftOf(product: AdminProduct): ProductDraft {
  return {
    section_id: product.section_id,
    title: product.title,
    description: product.description || '',
    mode: product.mode,
    price: String(product.price ?? 0),
    stock: product.stock > 0 ? String(product.stock) : '',
    sort_order: String(product.sort_order),
    is_active: product.is_active,
  };
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') event.currentTarget.blur();
}

function parseCount(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export default function ProductEdit() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [save, setSave] = useState<SaveInfo>({ state: 'idle', message: null });
  const [videoUrl, setVideoUrl] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const savedDraft = useRef<ProductDraft | null>(null);

  function load() {
    return Promise.all([api.adminProduct(productId), api.adminSections()])
      .then(([data, sectionRows]) => {
        setProduct(data);
        setSections(sectionRows);
        const next = draftOf(data);
        savedDraft.current = next;
        setDraft(next);
        setVideoUrl(data.video_url || '');
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось загрузить товар'));
  }

  useEffect(() => {
    void load();
  }, [productId]);

  if (!product || !draft) {
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

  function update(patch: Partial<ProductDraft>) {
    setSave(saveIdle);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function commit(patch: Partial<AdminProduct>, next: ProductDraft) {
    setSave(saveSaving);
    api.adminUpdateProduct(productId, patch)
      .then(() => {
        savedDraft.current = { ...next };
        setSave(saveDone);
      })
      .catch((e) => setSave(saveError(e?.response?.data?.detail || 'Не удалось сохранить товар')));
  }

  function saveTitle() {
    const current = draft;
    const saved = savedDraft.current;
    if (!current || !saved) return;
    const title = current.title.trim();
    if (!title) {
      setSave(saveError('Название не может быть пустым'));
      return;
    }
    if (title === saved.title) {
      if (current.title !== title) update({ title });
      return;
    }
    update({ title });
    commit({ title }, { ...current, title });
  }

  function saveDescription() {
    const current = draft;
    const saved = savedDraft.current;
    if (!current || !saved || current.description === saved.description) return;
    commit({ description: current.description }, current);
  }

  function saveSection(section_id: number) {
    if (!draft || section_id === draft.section_id) return;
    update({ section_id });
    commit({ section_id }, { ...draft, section_id });
  }

  async function saveMode(mode: ProductMode) {
    if (!draft || mode === draft.mode) return;
    const hasSteps = (product?.steps?.length || 0) > 0;
    if (mode === 'single' && hasSteps) {
      const ok = await confirm({
        title: 'Переключить в одиночный режим?',
        text: 'Шаги и карточки сохранятся, но покупатель будет заказывать товар целиком по одной цене. Вернуться в сборный режим можно в любой момент.',
        confirmLabel: 'Переключить',
      });
      if (!ok) return;
    }
    update({ mode });
    commit({ mode }, { ...draft, mode });
  }

  function savePrice() {
    if (!draft) return;
    const saved = savedDraft.current;
    if (!saved) return;
    const price = parseCount(draft.price);
    if (price === null || price < 0) {
      update({ price: saved.price });
      setSave(saveError('Цена — целое число от 0 ₽'));
      return;
    }
    update({ price: String(price) });
    if (price === Number(saved.price)) return;
    commit({ price }, { ...draft, price: String(price) });
  }

  function saveStock() {
    if (!draft) return;
    const saved = savedDraft.current;
    if (!saved) return;
    const stock = draft.stock.trim() ? parseCount(draft.stock) : 0;
    if (stock === null || stock < 0) {
      update({ stock: saved.stock });
      setSave(saveError('Кол-во копий не может быть отрицательным'));
      return;
    }
    update({ stock: stock > 0 ? String(stock) : '' });
    if (stock === Number(saved.stock || '0')) return;
    commit({ stock }, { ...draft, stock: stock > 0 ? String(stock) : '' });
  }

  function saveSortOrder() {
    if (!draft) return;
    const saved = savedDraft.current;
    if (!saved) return;
    const sortOrder = parseCount(draft.sort_order);
    if (sortOrder === null) {
      update({ sort_order: saved.sort_order });
      setSave(saveError('Порядок — целое число'));
      return;
    }
    update({ sort_order: String(sortOrder) });
    if (sortOrder === Number(saved.sort_order)) return;
    commit({ sort_order: sortOrder }, { ...draft, sort_order: String(sortOrder) });
  }

  function savePublish(is_active: boolean) {
    if (!draft) return;
    update({ is_active });
    commit({ is_active }, { ...draft, is_active });
  }

  function uploadImage(file: File | undefined) {
    if (!file) return;
    api.adminUploadProductImage(productId, file).then(load).catch(() => setError('Не удалось загрузить обложку'));
  }

  function uploadVideo(file: File | undefined) {
    if (!file) return;
    api.adminUploadProductVideo(productId, file)
      .then(load)
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось загрузить видео'));
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

  async function deleteVideo() {
    const ok = await confirm({
      title: 'Удалить видео?',
      text: 'Ссылка и загруженный файл будут удалены.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteVideo(productId).then(load).catch(() => setError('Не удалось удалить видео'));
  }

  function toggleEarly() {
    api.adminSetEarly(productId, !product!.is_early)
      .then(load)
      .catch(() => setError('Не удалось переключить «до анонса»'));
  }

  async function removeProduct() {
    const ok = await confirm({
      title: `Удалить товар «${product!.title}»?`,
      text: 'Действие необратимо. История заказов сохранится в снапшотах.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteProduct(productId)
      .then(() => navigate('/admin/products'))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось удалить товар'));
  }

  function addStep(event: FormEvent) {
    event.preventDefault();
    const title = newStepTitle.trim();
    if (!title) return;
    api.adminCreateStep(productId, { title, selection_mode: 'single', is_required: false })
      .then((created) => navigate(`/admin/products/${productId}/steps/${created.id}`))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось добавить шаг'));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const steps = product?.steps || [];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setProduct((current) => (current ? { ...current, steps: next } : current));
    api.adminReorderSteps(productId, next.map((step) => step.id))
      .catch(() => {
        setError('Не удалось изменить порядок');
        void load();
      });
  }

  const steps = product.steps || [];
  const sectionTitle = sections.find((row) => row.id === draft.section_id)?.title || 'Раздел';
  const stepsLabel = `${steps.length} ${plural(steps.length, 'шаг', 'шага', 'шагов')}`;

  return (
    <section>
      <BackLink to="/admin/products">К товарам</BackLink>

      <div className="admin-page-head">
        <div>
          <h2 className="admin-entity-title">{draft.title || 'Товар'}</h2>
          <div className="admin-muted">
            {sectionTitle} · {draft.mode === 'single' ? 'одиночный товар' : 'сборный товар'}
            {!draft.is_active ? ' · скрыт' : ''}
            {product.sold_out ? ' · закончился' : ''}
            {product.is_early ? ' · до анонса' : ''}
          </div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-form">
        <div className="admin-section-head">
          <h3 className="section-title">Основное</h3>
          <SaveStatus save={save} idleLabel="Сохраняется автоматически" />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="edit-section">Раздел</label>
            <select
              id="edit-section"
              value={draft.section_id}
              onChange={(event) => saveSection(Number(event.target.value))}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-title">Название</label>
            <input
              id="edit-title"
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
              onBlur={saveTitle}
              onKeyDown={blurOnEnter}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="edit-description">Описание</label>
          <textarea
            id="edit-description"
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
            onBlur={saveDescription}
          />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="edit-mode">Тип товара</label>
            <select
              id="edit-mode"
              value={draft.mode}
              onChange={(event) => void saveMode(event.target.value as ProductMode)}
            >
              <option value="build">Сборный — шаги и карточки</option>
              <option value="single">Одиночный — готовая цена</option>
            </select>
            <div className="admin-muted">
              {draft.mode === 'single'
                ? 'Без шагов: главное фото, карусель, цена и количество.'
                : 'Покупатель собирает заказ по шагам из карточек.'}
            </div>
          </div>
          {draft.mode === 'single' && (
            <div className="field">
              <label htmlFor="edit-price">Цена, ₽</label>
              <input
                id="edit-price"
                type="number"
                min={0}
                value={draft.price}
                onChange={(event) => update({ price: event.target.value })}
                onBlur={savePrice}
                onKeyDown={blurOnEnter}
              />
            </div>
          )}
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="edit-stock">Кол-во копий</label>
            <input
              id="edit-stock"
              type="number"
              min={0}
              value={draft.stock}
              placeholder="Без ограничения"
              onChange={(event) => update({ stock: event.target.value })}
              onBlur={saveStock}
              onKeyDown={blurOnEnter}
            />
            <div className="admin-muted">
              {Number(draft.stock || 0) > 0
                ? `Заказано ${product.ordered_count} из ${draft.stock}${product.sold_out ? ' · товар закончился' : ''}`
                : `Заказано ${product.ordered_count}, без ограничения`}
            </div>
          </div>
          <div className="field">
            <label htmlFor="edit-sort">Порядок</label>
            <input
              id="edit-sort"
              type="number"
              value={draft.sort_order}
              onChange={(event) => update({ sort_order: event.target.value })}
              onBlur={saveSortOrder}
              onKeyDown={blurOnEnter}
            />
            <div className="admin-muted">Меньше — выше в разделе.</div>
          </div>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) => savePublish(event.target.checked)}
          />
          Опубликован — виден в каталоге
        </label>
        <div className="admin-muted">
          Пусто или 0 — без ограничения. Одна копия = один заказ; отменённые заказы копию не занимают.
        </div>
      </div>

      {draft.mode === 'build' ? (
        <>
          <div className="admin-section-head">
            <div>
              <h3 className="section-title">Шаги</h3>
              <p className="admin-muted">
                {stepsLabel}. Порядок — стрелками. Карточки и свойства шага — на его экране.
              </p>
            </div>
          </div>

          <div className="step-list">
            {steps.map((step, index) => (
              <div className="step-row" key={step.id}>
                <Link className="step-row-link" to={`/admin/products/${productId}/steps/${step.id}`}>
                  <span className="step-row-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="step-row-body">
                    <span className="step-row-title">
                      {step.title}
                      {!step.is_active && <span className="pill-draft">Скрыт</span>}
                      {step.cards_count === 0 && <span className="pill-draft">Пустой</span>}
                    </span>
                    {step.hint?.trim() && (
                      <span className="step-row-hint">{step.hint.trim()}</span>
                    )}
                    <span className="step-row-meta">
                      {step.selection_mode === 'single' ? 'Один вариант' : 'Несколько вариантов'} ·{' '}
                      {step.cards_count} {plural(step.cards_count, 'карточка', 'карточки', 'карточек')}
                      {step.is_required ? ' · обязательный' : ''}
                    </span>
                  </span>
                  <span className="step-row-go" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <div className="admin-actions">
                  <button
                    className="icon-action"
                    type="button"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    aria-label="Шаг выше"
                  >
                    ↑
                  </button>
                  <button
                    className="icon-action"
                    type="button"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === steps.length - 1}
                    aria-label="Шаг ниже"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          {steps.length === 0 && (
            <div className="empty">
              Пока нет шагов — без них товар помечается «скоро». Добавьте первый.
            </div>
          )}

          <form className="admin-form" onSubmit={addStep}>
            <h3 className="section-title">Новый шаг</h3>
            <div className="field">
              <label htmlFor="new-step-title">Название шага</label>
              <input
                id="new-step-title"
                value={newStepTitle}
                onChange={(event) => setNewStepTitle(event.target.value)}
                placeholder="Например, «Размер»"
              />
            </div>
            <div className="admin-muted">
              Шаг создастся пустым и сразу откроется: режим выбора, подсказку и карточки
              добавите там.
            </div>
            <div>
              <button className="btn" type="submit" disabled={!newStepTitle.trim()}>
                Создать шаг
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="admin-form">
          <h3 className="section-title">Шаги</h3>
          <p className="admin-muted">
            Одиночный товар продаётся целиком: шаги и карточки не используются. При
            возврате в сборный режим они снова станут доступны.
          </p>
        </div>
      )}

      <div className="admin-form">
        <h3 className="section-title">{draft.mode === 'single' ? 'Главное фото' : 'Обложка'}</h3>
        <div className="admin-card-row">
          <div className="thumb">
            {product.image_url ? <img src={mediaUrl(product.image_url)} alt={draft.title} /> : null}
          </div>
          <div className="admin-card-info">
            <div>{product.image_url ? 'Главное фото загружено' : 'Главного фото нет'}</div>
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

      {draft.mode === 'single' && (
        <ProductGalleryEditor
          productId={productId}
          images={product.images}
          onChanged={load}
          onError={setError}
        />
      )}

      <div className="admin-form">
        <h3 className="section-title">Видеообзор</h3>
        <div className="field">
          <label htmlFor="video-url">Ссылка (YouTube, Rutube, VK)</label>
          <input id="video-url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
        </div>
        <div className="admin-actions">
          <button className="btn secondary" type="button" onClick={saveVideoUrl}>Сохранить ссылку</button>
          {product.video_url && (
            <button
              className="icon-action red"
              type="button"
              onClick={() => {
                setVideoUrl('');
                api.adminSetVideoUrl(productId, null).then(load);
              }}
            >
              Очистить ссылку
            </button>
          )}
        </div>
        <div className="admin-card-meta">Файл приоритетнее ссылки: MP4, WebM или MOV, до 100 МБ.</div>
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
        {product.video_file_url && (
          <video
            className="admin-video-preview"
            src={mediaUrl(product.video_file_url)}
            controls
            preload="metadata"
            poster={mediaUrl(product.video_poster_url) || undefined}
          />
        )}
        {product.video_poster_url && (
          <div className="admin-actions">
            <span className="admin-muted">Постер загружен</span>
            <button className="icon-action red" type="button" onClick={() => api.adminDeleteVideoPoster(productId).then(load)}>
              Сбросить постер
            </button>
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

      <div className="admin-form">
        <h3 className="section-title">Удаление товара</h3>
        <p className="admin-muted">
          Товар удаляется из каталога и админки. История заказов сохранится в снапшотах,
          поэтому старые заказы не пропадут.
        </p>
        <div>
          <button className="btn danger" type="button" onClick={removeProduct}>
            Удалить товар
          </button>
        </div>
      </div>
    </section>
  );
}

function ProductGalleryEditor({
  productId,
  images,
  onChanged,
  onError,
}: {
  productId: number;
  images: CardImage[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);

  async function uploadImages(files: File[]) {
    if (files.length === 0 || uploading) return;
    const remaining = MAX_PRODUCT_IMAGES - images.length;
    if (files.length > remaining) {
      onError(`Можно добавить ещё ${remaining} фото`);
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        await api.adminAddProductImage(productId, file);
      } catch (error) {
        const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        onError(detail || 'Не удалось загрузить фото');
        break;
      }
    }
    setUploading(false);
    onChanged();
  }

  async function removeImage(image: CardImage) {
    const ok = await confirm({
      title: 'Удалить фото?',
      text: 'Фото будет удалено из карусели товара.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteProductGalleryImage(productId, image.id)
      .then(onChanged)
      .catch((e) => onError(e?.response?.data?.detail || 'Не удалось удалить фото'));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((image) => image.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    api.adminReorderProductImages(productId, ids)
      .then(onChanged)
      .catch((e) => onError(e?.response?.data?.detail || 'Не удалось изменить порядок фото'));
  }

  return (
    <div className="admin-form">
      <h3 className="section-title">Карусель</h3>
      <p className="admin-muted">
        Дополнительные фото на странице товара. Первое фото — обложка карусели.
      </p>
      <div className="admin-card-gallery">
        {images.map((image, index) => (
          <div className="admin-card-image" key={image.id}>
            <div className="admin-card-image-media">
              <img src={mediaUrl(image.url)} alt="" />
              {index === 0 && <span className="admin-card-cover">Обложка</span>}
            </div>
            <div className="admin-actions">
              <button className="icon-action" type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Фото выше">
                ↑
              </button>
              <button
                className="icon-action"
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                aria-label="Фото ниже"
              >
                ↓
              </button>
              <button className="icon-action red" type="button" onClick={() => void removeImage(image)} aria-label="Удалить фото">
                ×
              </button>
            </div>
          </div>
        ))}
        {images.length < MAX_PRODUCT_IMAGES && (
          <label className="admin-card-add">
            <span>{uploading ? 'Загружаю…' : '+ Фото'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = '';
                void uploadImages(files);
              }}
            />
          </label>
        )}
      </div>
      <div className="admin-muted">{images.length} из {MAX_PRODUCT_IMAGES} · первое фото — обложка карусели</div>
    </div>
  );
}
