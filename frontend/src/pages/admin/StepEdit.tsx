import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type AdminCard,
  type AdminProduct,
  type AdminStep,
} from '../../api/endpoints';
import type { SelectionMode } from '../../api/selection';
import { mediaUrl } from '../../api/media';
import { plural } from '../../api/plural';
import BackLink from '../../components/BackLink';
import { useConfirm } from '../../components/ConfirmProvider';
import SaveStatus, {
  saveDone,
  saveError,
  saveIdle,
  saveSaving,
  type SaveInfo,
} from '../../components/SaveStatus';
import Skeleton from '../../components/Skeleton';

const MAX_CARD_IMAGES = 10;

const MODE_LABEL: Record<SelectionMode, string> = {
  single: 'один вариант',
  multi: 'несколько вариантов',
};

interface StepDraft {
  title: string;
  hint: string;
  selection_mode: SelectionMode;
  is_required: boolean;
  is_active: boolean;
}

interface CardDraft {
  title: string;
  description: string;
  price: string;
  max_qty: string;
  is_active: boolean;
}

function stepDraftOf(step: AdminStep): StepDraft {
  return {
    title: step.title,
    hint: step.hint || '',
    selection_mode: step.selection_mode,
    is_required: step.is_required,
    is_active: step.is_active,
  };
}

function cardDraftOf(card: AdminCard): CardDraft {
  return {
    title: card.title,
    description: card.description || '',
    price: String(card.price),
    max_qty: String(card.max_qty),
    is_active: card.is_active,
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

export default function StepEdit() {
  const { id, stepId } = useParams();
  const productId = Number(id);
  const stepIdNumber = Number(stepId);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [step, setStep] = useState<AdminStep | null>(null);
  const [cards, setCards] = useState<AdminCard[] | null>(null);
  const [draft, setDraft] = useState<StepDraft | null>(null);
  const [stepSave, setStepSave] = useState<SaveInfo>({ state: 'idle', message: null });
  const [error, setError] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ title: '', price: '', max_qty: '10' });
  const savedDraft = useRef<StepDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([api.adminProduct(productId), api.adminCards(stepIdNumber)])
      .then(([productRow, cardRows]) => {
        if (cancelled) return;
        const found = (productRow.steps || []).find((row) => row.id === stepIdNumber);
        if (!found) {
          setProduct(null);
          setStep(null);
          setCards(null);
          setDraft(null);
          setError('Шаг не найден');
          return;
        }
        setProduct(productRow);
        setStep(found);
        setCards(cardRows);
        const next = stepDraftOf(found);
        savedDraft.current = next;
        setDraft(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.detail || 'Не удалось загрузить шаг');
      });
    return () => {
      cancelled = true;
    };
  }, [productId, stepIdNumber]);

  if (error && (!product || !step)) {
    return (
      <section>
        <BackLink to={`/admin/products/${productId}`}>К товару</BackLink>
        <div className="empty">{error}</div>
      </section>
    );
  }

  if (!product || !step || !draft || !cards) return <Skeleton lines={5} />;

  function loadCards() {
    api.adminCards(stepIdNumber)
      .then(setCards)
      .catch(() => setError('Не удалось обновить карточки'));
  }

  function updateDraft(patch: Partial<StepDraft>) {
    setStepSave(saveIdle);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function commit(patch: Partial<AdminStep>, next: StepDraft) {
    setStepSave(saveSaving);
    api.adminUpdateStep(stepIdNumber, patch)
      .then(() => {
        savedDraft.current = { ...next };
        setStepSave(saveDone);
        setStep((current) => (current ? { ...current, ...patch } : current));
      })
      .catch((e) => setStepSave(saveError(e?.response?.data?.detail || 'Не удалось сохранить шаг')));
  }

  function saveTitle() {
    const current = draft;
    const saved = savedDraft.current;
    if (!current || !saved) return;
    const title = current.title.trim();
    if (!title) {
      setStepSave(saveError('Название не может быть пустым'));
      return;
    }
    if (title === saved.title) {
      if (current.title !== title) updateDraft({ title });
      return;
    }
    updateDraft({ title });
    commit({ title }, { ...current, title });
  }

  function saveHint() {
    const current = draft;
    const saved = savedDraft.current;
    if (!current || !saved) return;
    const hint = current.hint.trim();
    if (hint === saved.hint) return;
    updateDraft({ hint });
    commit({ hint }, { ...current, hint });
  }

  function saveMode(selection_mode: SelectionMode) {
    const current = draft;
    if (!current || selection_mode === current.selection_mode) return;
    updateDraft({ selection_mode });
    commit({ selection_mode }, { ...current, selection_mode });
  }

  function saveRequired(is_required: boolean) {
    const current = draft;
    if (!current) return;
    updateDraft({ is_required });
    commit({ is_required }, { ...current, is_required });
  }

  function saveVisible(is_active: boolean) {
    const current = draft;
    if (!current) return;
    updateDraft({ is_active });
    commit({ is_active }, { ...current, is_active });
  }

  function toggleVisible() {
    if (!draft) return;
    saveVisible(!draft.is_active);
  }

  async function removeStep() {
    const current = draft;
    if (!current) return;
    const title = current.title.trim() || 'Шаг';
    const ok = await confirm({
      title: `Удалить шаг «${title}»?`,
      text: 'Шаг, его карточки и фото удалятся навсегда. История заказов сохранится.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteStep(stepIdNumber)
      .then(() => navigate(`/admin/products/${productId}`))
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось удалить шаг'));
  }

  function moveCard(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!cards || target < 0 || target >= cards.length) return;
    const ids = cards.map((card) => card.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    api.adminReorderCards(stepIdNumber, ids)
      .then(loadCards)
      .catch(() => setError('Не удалось изменить порядок карточек'));
  }

  function addCard(event: FormEvent) {
    event.preventDefault();
    const title = newCard.title.trim();
    if (!title) return;
    const price = parseCount(newCard.price || '0');
    const maxQty = parseCount(newCard.max_qty || '10');
    if (price === null || price < 0) {
      setError('Цена — целое число от 0 ₽');
      return;
    }
    if (maxQty === null || maxQty < 1 || maxQty > 99) {
      setError('Макс. кол-во — от 1 до 99');
      return;
    }
    setError(null);
    api.adminCreateCard(stepIdNumber, { title, price, max_qty: maxQty })
      .then((created) => {
        setCards((current) => [
          ...(current || []),
          {
            id: created.id,
            step_id: stepIdNumber,
            title,
            description: null,
            image_url: null,
            images: [],
            price,
            max_qty: maxQty,
            sort_order: current?.length ?? 0,
            is_active: true,
          },
        ]);
        setNewCard({ title: '', price: '', max_qty: '10' });
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось добавить карточку'));
  }

  const steps = product.steps || [];
  const stepIndex = steps.findIndex((row) => row.id === step.id);
  const cardsLabel = `${cards.length} ${plural(cards.length, 'карточка', 'карточки', 'карточек')}`;

  return (
    <section>
      <BackLink to={`/admin/products/${productId}`}>К товару «{product.title}»</BackLink>

      <div className="admin-page-head">
        <div>
          <h2 className="admin-entity-title">{draft.title || 'Шаг'}</h2>
          <div className="admin-muted">
            {stepIndex >= 0 ? `Шаг ${stepIndex + 1} из ${steps.length} · ` : ''}
            {MODE_LABEL[draft.selection_mode]} · {cardsLabel}
            {draft.is_required ? ' · обязательный' : ''}
            {!draft.is_active ? ' · скрыт' : ''}
          </div>
        </div>
        <div className="admin-actions">
          <button className="btn secondary" type="button" onClick={toggleVisible}>
            {draft.is_active ? 'Скрыть' : 'Показать'}
          </button>
          <button className="icon-action red" type="button" onClick={() => void removeStep()}>
            Удалить
          </button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-form">
        <div className="admin-section-head">
          <h3 className="section-title">Шаг</h3>
          <SaveStatus save={stepSave} idleLabel="Сохраняется автоматически" />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="step-title">Название</label>
            <input
              id="step-title"
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              onBlur={saveTitle}
              onKeyDown={blurOnEnter}
            />
          </div>
          <div className="field">
            <label htmlFor="step-mode">Выбор</label>
            <select
              id="step-mode"
              value={draft.selection_mode}
              onChange={(event) => saveMode(event.target.value as SelectionMode)}
            >
              <option value="single">Один вариант</option>
              <option value="multi">Несколько вариантов</option>
            </select>
          </div>
        </div>
        <div className="field compact">
          <label htmlFor="step-hint">Подсказка</label>
          <textarea
            id="step-hint"
            rows={2}
            value={draft.hint}
            onChange={(event) => updateDraft({ hint: event.target.value })}
            onBlur={saveHint}
            placeholder="Например, «Выберите размер канвы»"
          />
          <div className="admin-muted">Необязательно.</div>
        </div>
        <label className="checkbox">
          <input
            id="step-required"
            type="checkbox"
            checked={draft.is_required}
            onChange={(event) => saveRequired(event.target.checked)}
          />
          Обязательный шаг — без выбора покупатель не пройдёт дальше
        </label>
      </div>

      <div className="admin-section-head">
        <div>
          <h3 className="section-title">Карточки</h3>
          <p className="admin-muted">
            {cardsLabel}. «Скрыть» убирает карточку из шага, но оставляет её здесь —
            потом можно вернуть. «Удалить» стирает карточку и её фото навсегда.
          </p>
        </div>
        <a className="btn secondary" href="#new-card">
          Добавить карточку
        </a>
      </div>

      <div className="card-editors">
        {cards.map((card, index) => (
          <CardEditor
            key={card.id}
            card={card}
            index={index}
            total={cards.length}
            onMove={moveCard}
            onChanged={loadCards}
          />
        ))}
      </div>
      {cards.length === 0 && (
        <div className="empty">
          В шаге пока нет карточек — покупатель его не увидит. Добавьте первую.
        </div>
      )}

      <form className="admin-form new-card" id="new-card" onSubmit={addCard}>
        <h3 className="section-title">Новая карточка</h3>
        <div className="form-grid two">
          <div className="field field-wide">
            <label htmlFor="new-card-title">Название</label>
            <input
              id="new-card-title"
              value={newCard.title}
              onChange={(event) => setNewCard({ ...newCard, title: event.target.value })}
              placeholder="Например, «30 × 40 см»"
            />
          </div>
          <div className="field">
            <label htmlFor="new-card-price">Цена, ₽</label>
            <input
              id="new-card-price"
              type="number"
              min={0}
              value={newCard.price}
              onChange={(event) => setNewCard({ ...newCard, price: event.target.value })}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="new-card-qty">Макс. кол-во</label>
            <input
              id="new-card-qty"
              type="number"
              min={1}
              max={99}
              value={newCard.max_qty}
              onChange={(event) => setNewCard({ ...newCard, max_qty: event.target.value })}
            />
          </div>
        </div>
        <div>
          <button className="btn" type="submit" disabled={!newCard.title.trim()}>
            Добавить карточку
          </button>
        </div>
      </form>
    </section>
  );
}

function CardEditor({
  card,
  index,
  total,
  onMove,
  onChanged,
}: {
  card: AdminCard;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<CardDraft>(() => cardDraftOf(card));
  const [save, setSave] = useState<SaveInfo>({ state: 'idle', message: null });
  const [uploading, setUploading] = useState(false);
  const savedDraft = useRef<CardDraft>(draft);

  function update(patch: Partial<CardDraft>) {
    setSave(saveIdle);
    setDraft((current) => ({ ...current, ...patch }));
  }

  function commit(patch: Partial<AdminCard>, next: CardDraft) {
    setSave(saveSaving);
    api.adminUpdateCard(card.id, patch)
      .then(() => {
        savedDraft.current = { ...next };
        setSave(saveDone);
      })
      .catch((e) => setSave(saveError(e?.response?.data?.detail || 'Не удалось сохранить карточку')));
  }

  function saveTitle() {
    const current = draft;
    const saved = savedDraft.current;
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
    if (current.description === saved.description) return;
    commit({ description: current.description }, current);
  }

  function savePrice() {
    const current = draft;
    const saved = savedDraft.current;
    const price = parseCount(current.price);
    if (price === null || price < 0) {
      update({ price: saved.price });
      setSave(saveError('Цена — целое число от 0 ₽'));
      return;
    }
    const next = { ...current, price: String(price) };
    update({ price: next.price });
    if (price === Number(saved.price)) return;
    commit({ price }, next);
  }

  function saveMaxQty() {
    const current = draft;
    const saved = savedDraft.current;
    const maxQty = parseCount(current.max_qty);
    if (maxQty === null || maxQty < 1 || maxQty > 99) {
      update({ max_qty: saved.max_qty });
      setSave(saveError('Макс. кол-во — от 1 до 99'));
      return;
    }
    const next = { ...current, max_qty: String(maxQty) };
    update({ max_qty: next.max_qty });
    if (maxQty === Number(saved.max_qty)) return;
    commit({ max_qty: maxQty }, next);
  }

  function saveVisible(is_active: boolean) {
    const current = draft;
    update({ is_active });
    commit({ is_active }, { ...current, is_active });
  }

  async function removeCard() {
    const ok = await confirm({
      title: `Удалить карточку «${draft.title.trim() || card.title}»?`,
      text: 'Карточка и её фото удалятся навсегда. История заказов сохранится.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteCard(card.id)
      .then(onChanged)
      .catch((e) => setSave(saveError(e?.response?.data?.detail || 'Не удалось удалить карточку')));
  }

  async function uploadImages(files: File[]) {
    if (files.length === 0 || uploading) return;
    const remaining = MAX_CARD_IMAGES - card.images.length;
    if (files.length > remaining) {
      setSave(saveError(`Можно добавить ещё ${remaining} фото`));
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        await api.adminAddCardImage(card.id, file);
      } catch (e) {
        const detail = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        setSave(saveError(detail || 'Не удалось загрузить фото'));
        break;
      }
    }
    setUploading(false);
    onChanged();
  }

  async function removeImage(imageId: number) {
    const ok = await confirm({
      title: 'Удалить фото?',
      text: `Фото будет удалено из карточки «${card.title}».`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteCardImage(card.id, imageId)
      .then(onChanged)
      .catch((e) => setSave(saveError(e?.response?.data?.detail || 'Не удалось удалить фото')));
  }

  function moveImage(imageIndex: number, direction: -1 | 1) {
    const target = imageIndex + direction;
    if (target < 0 || target >= card.images.length) return;
    const ids = card.images.map((image) => image.id);
    [ids[imageIndex], ids[target]] = [ids[target], ids[imageIndex]];
    api.adminReorderCardImages(card.id, ids)
      .then(onChanged)
      .catch((e) => setSave(saveError(e?.response?.data?.detail || 'Не удалось изменить порядок фото')));
  }

  return (
    <article className="card-editor">
      <div className="card-editor-head">
        <div className="card-editor-ident">
          <span className="thumb">
            {card.image_url ? <img src={mediaUrl(card.image_url)} alt="" /> : null}
          </span>
          <div className="card-editor-name">
            <div className="card-editor-title">
              Карточка {index + 1} {!draft.is_active && <span className="pill-draft">Скрыта</span>}
            </div>
            <div className="admin-muted">{card.images.length} фото</div>
          </div>
        </div>
        <div className="admin-actions">
          <SaveStatus save={save} />
          <button
            className="icon-action"
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Карточка выше"
          >
            ↑
          </button>
          <button
            className="icon-action"
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Карточка ниже"
          >
            ↓
          </button>
        </div>
      </div>

      <div className="card-editor-body">
        <div className="form-grid two">
          <div className="field field-wide">
            <label htmlFor={`card-${card.id}-title`}>Название</label>
            <input
              id={`card-${card.id}-title`}
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
              onBlur={saveTitle}
              onKeyDown={blurOnEnter}
            />
          </div>
          <div className="field field-wide compact">
            <label htmlFor={`card-${card.id}-description`}>Описание</label>
            <textarea
              id={`card-${card.id}-description`}
              rows={2}
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
              onBlur={saveDescription}
            />
          </div>
          <div className="field">
            <label htmlFor={`card-${card.id}-price`}>Цена, ₽</label>
            <input
              id={`card-${card.id}-price`}
              type="number"
              min={0}
              value={draft.price}
              onChange={(event) => update({ price: event.target.value })}
              onBlur={savePrice}
              onKeyDown={blurOnEnter}
            />
          </div>
          <div className="field">
            <label htmlFor={`card-${card.id}-qty`}>Макс. кол-во</label>
            <input
              id={`card-${card.id}-qty`}
              type="number"
              min={1}
              max={99}
              value={draft.max_qty}
              onChange={(event) => update({ max_qty: event.target.value })}
              onBlur={saveMaxQty}
              onKeyDown={blurOnEnter}
            />
          </div>
        </div>
      </div>

      <div className="card-editor-photos">
        <div className="card-editor-subhead">
          <span>Фото</span>
          <span className="admin-muted">
            {card.images.length} из {MAX_CARD_IMAGES} · первое — обложка
          </span>
        </div>
        <div className="admin-card-gallery">
          {card.images.map((image, imageIndex) => (
            <div className="admin-card-image" key={image.id}>
              <div className="admin-card-image-media">
                <img src={mediaUrl(image.url)} alt="" />
                {imageIndex === 0 && <span className="admin-card-cover">Обложка</span>}
              </div>
              <div className="admin-actions">
                <button
                  className="icon-action"
                  type="button"
                  onClick={() => moveImage(imageIndex, -1)}
                  disabled={imageIndex === 0}
                  aria-label="Фото выше"
                >
                  ↑
                </button>
                <button
                  className="icon-action"
                  type="button"
                  onClick={() => moveImage(imageIndex, 1)}
                  disabled={imageIndex === card.images.length - 1}
                  aria-label="Фото ниже"
                >
                  ↓
                </button>
                <button
                  className="icon-action red"
                  type="button"
                  onClick={() => void removeImage(image.id)}
                  aria-label="Удалить фото"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {card.images.length < MAX_CARD_IMAGES && (
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
      </div>

      <div className="admin-actions card-editor-actions">
        <button
          className="btn secondary"
          type="button"
          onClick={() => saveVisible(!draft.is_active)}
        >
          {draft.is_active ? 'Скрыть' : 'Показать'}
        </button>
        <button className="icon-action red" type="button" onClick={() => void removeCard()}>
          Удалить
        </button>
      </div>
    </article>
  );
}
