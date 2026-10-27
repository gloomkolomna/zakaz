import { useEffect, useState } from 'react';
import { api, type AdminSection } from '../../api/endpoints';
import { useConfirm } from '../../components/ConfirmProvider';
import Skeleton from '../../components/Skeleton';

export default function SectionsTab() {
  const confirm = useConfirm();
  const [sections, setSections] = useState<AdminSection[] | null>(null);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.adminSections()
      .then(setSections)
      .catch(() => setError('Не удалось загрузить разделы'));
  }

  useEffect(load, []);

  function create() {
    if (!title.trim()) return;
    api.adminCreateSection(title.trim())
      .then(() => {
        setTitle('');
        load();
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось создать раздел'));
  }

  function save(row: AdminSection) {
    api.adminUpdateSection(row.id, { title: editTitle.trim(), is_active: row.is_active })
      .then(() => {
        setEditing(null);
        load();
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Не удалось сохранить раздел'));
  }

  function toggle(row: AdminSection) {
    api.adminUpdateSection(row.id, { title: row.title, is_active: !row.is_active })
      .then(load)
      .catch(() => setError('Не удалось изменить раздел'));
  }

  async function remove(row: AdminSection) {
    const ok = await confirm({
      title: `Удалить раздел «${row.title}»?`,
      text: 'Все товары раздела тоже будут удалены. История заказов сохранится.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    api.adminDeleteSection(row.id).then(load).catch(() => setError('Не удалось удалить раздел'));
  }

  function move(index: number, direction: -1 | 1) {
    if (!sections) return;
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((row) => row.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    api.adminReorderSections(ids).then(load).catch(() => setError('Не удалось изменить порядок'));
  }

  if (!sections) return <Skeleton lines={4} />;

  return (
    <section>
      <div className="admin-form">
        <div className="field">
          <label htmlFor="new-section">Новый раздел</label>
          <input
            id="new-section"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, «Трекер на год»"
          />
        </div>
        <div>
          <button className="btn" type="button" onClick={create} disabled={!title.trim()}>
            Добавить раздел
          </button>
        </div>
        <p className="admin-muted">Новый раздел создаётся скрытым — опубликуйте его, когда будете готовы.</p>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="admin-list">
        {sections.map((row, index) => (
          <div className="admin-row" key={row.id}>
            <div className="admin-row-head">
              {editing === row.id ? (
                <input
                  className="field"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  aria-label="Название раздела"
                />
              ) : (
                <div className="admin-row-title">
                  {row.title}{' '}
                  {!row.is_active && <span className="pill-draft">Скрыт</span>}
                </div>
              )}
              <span className="admin-muted">{row.products_count} тов.</span>
            </div>
            <div className="admin-actions">
              <button className="icon-action" type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Выше">
                ↑
              </button>
              <button className="icon-action" type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label="Ниже">
                ↓
              </button>
              {editing === row.id ? (
                <>
                  <button className="btn" type="button" onClick={() => save(row)}>
                    Сохранить
                  </button>
                  <button className="btn secondary" type="button" onClick={() => setEditing(null)}>
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  <button className="btn secondary" type="button" onClick={() => { setEditing(row.id); setEditTitle(row.title); }}>
                    Переименовать
                  </button>
                  <button className="btn secondary" type="button" onClick={() => toggle(row)}>
                    {row.is_active ? 'Скрыть' : 'Опубликовать'}
                  </button>
                  <button className="icon-action red" type="button" onClick={() => remove(row)}>
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {sections.length === 0 && <div className="empty">Разделов пока нет.</div>}
      </div>
    </section>
  );
}
