import { useEffect, useState } from 'react';
import { api, type InfoTexts } from '../api/endpoints';
import Skeleton from '../components/Skeleton';

const BLOCKS: { key: keyof InfoTexts; title: string }[] = [
  { key: 'delivery', title: 'Доставка' },
  { key: 'payment', title: 'Оплата' },
  { key: 'contacts', title: 'Контакты' },
  { key: 'privacy', title: 'Политика ПД' },
];

export default function Info() {
  const [texts, setTexts] = useState<InfoTexts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.info()
      .then(setTexts)
      .catch(() => setTexts(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton lines={4} />;

  const filled = texts ? BLOCKS.some((block) => texts[block.key].trim()) : false;

  return (
    <main className="page">
      <h1>Информация</h1>
      {!filled ? (
        <section className="section">
          <div className="empty">Раздел наполняется</div>
        </section>
      ) : (
        texts &&
        BLOCKS.map((block) =>
          texts[block.key].trim() ? (
            <section className="section" key={block.key}>
              <h2 className="section-title">{block.title}</h2>
              <p className="body-text info-text">{texts[block.key]}</p>
            </section>
          ) : null,
        )
      )}
    </main>
  );
}
