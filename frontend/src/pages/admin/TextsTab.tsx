import { useEffect, useState } from 'react';
import { api, type InfoTexts } from '../../api/endpoints';
import Skeleton from '../../components/Skeleton';

const BLOCKS: { key: keyof InfoTexts; title: string }[] = [
  { key: 'delivery', title: 'Доставка' },
  { key: 'payment', title: 'Оплата' },
  { key: 'contacts', title: 'Контакты' },
  { key: 'privacy', title: 'Политика ПД' },
];

export default function TextsTab() {
  const [texts, setTexts] = useState<InfoTexts | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminTexts().then(setTexts).catch(() => setMessage('Не удалось загрузить тексты'));
  }, []);

  if (!texts) return <Skeleton lines={4} />;

  function save() {
    if (!texts) return;
    setSaving(true);
    api.adminSaveTexts(texts)
      .then((data) => {
        setTexts(data);
        setMessage('Сохранено');
      })
      .catch(() => setMessage('Не удалось сохранить тексты'))
      .finally(() => setSaving(false));
  }

  return (
    <section>
      <div className="admin-form">
        {BLOCKS.map((block) => (
          <div className="field" key={block.key}>
            <label htmlFor={`text-${block.key}`}>{block.title}</label>
            <textarea
              id={`text-${block.key}`}
              value={texts[block.key]}
              onChange={(event) => setTexts({ ...texts, [block.key]: event.target.value })}
              placeholder="Текст с переносами строк"
            />
          </div>
        ))}
        <div>
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? 'Сохраняю…' : 'Сохранить тексты'}
          </button>
        </div>
        {message && <div className={message === 'Сохранено' ? 'admin-muted' : 'error-text'}>{message}</div>}
      </div>
    </section>
  );
}
