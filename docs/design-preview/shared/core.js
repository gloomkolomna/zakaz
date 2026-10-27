(function () {
  const ART = window.ART || {};
  const PAL = window.PALETTES || {};
  const VARIANT = window.VARIANT || 'x';

  const money = (n) => n.toLocaleString('ru-RU') + ' ₽';

  const CROSS = (size = 12, color = 'currentColor', w = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 3.4 12.6 12.6M12.6 3.4 3.4 12.6" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/></svg>`;

  const CHEVRON = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const MENU_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  const CHECK = `<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" class="check-mark"><path d="M12 30l12 12 20-26" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function luminance(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function gridColor(bg) {
    return luminance(bg) > 0.5 ? ART.gridLight || '#e7e8e0' : ART.gridDark || '#2a302b';
  }

  function chartArt(o) {
    const cols = o.cols || 18;
    const rows = o.rows || 24;
    const cell = 10;
    const w = cols * cell;
    const h = rows * cell;
    const palette = PAL[o.palette] || ['#c97b84'];
    const bg = o.bg || ART.chartBg || '#ffffff';
    const done = o.done || 0.55;
    const r = rng(o.seed || 7);
    const stitch = (x, y, c) =>
      `<rect x="${x * cell + 2.5}" y="${y * cell + 2.5}" width="${cell - 5}" height="${cell - 5}" fill="${c}"/>`;

    let cells = '';
    for (let y = 0; y < rows; y++) {
      const t = y / rows;
      const cut = t < done ? cols : Math.max(0, Math.round(cols * (1 - (t - done) / (1 - done))));
      const hue = palette[Math.floor(y / 3) % palette.length];
      for (let x = 0; x < cut; x++) {
        if (r() > 0.04) cells += stitch(x, y, hue);
      }
    }

    if (!o.frame) {
      const edge = palette[2] || palette[0];
      for (let x = 1; x < cols - 1; x += 2) {
        cells += stitch(x, 1, edge) + stitch(x, rows - 2, edge);
      }
      for (let y = 1; y < rows - 1; y += 2) {
        cells += stitch(1, y, edge) + stitch(cols - 2, y, edge);
      }
    }

    let d = '';
    for (let x = 1; x < cols; x++) d += `M${x * cell} 0V${h}`;
    for (let y = 1; y < rows; y++) d += `M0 ${y * cell}H${w}`;
    const frameColor = o.frame ? (ART.frames && ART.frames[o.frame]) || o.frame : null;
    const frame = frameColor
      ? `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="${frameColor}" stroke-width="8"/>`
      : '';
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Вышитый трекер на канве">
      <rect width="${w}" height="${h}" fill="${bg}"/>
      <path d="${d}" stroke="${gridColor(bg)}" stroke-width="1" fill="none"/>
      ${cells}${frame}
    </svg>`;
  }

  function hoopArt() {
    return `<svg viewBox="0 0 120 120" role="img" aria-label="Пяльцы">
      <rect width="120" height="120" fill="${ART.sheet}"/>
      <circle cx="60" cy="64" r="40" fill="none" stroke="${ART.wood}" stroke-width="8"/>
      <rect x="52" y="12" width="16" height="12" rx="3" fill="${ART.metal}" stroke="${ART.ink}" stroke-width="1.4"/>
      <path d="M54 24h12" stroke="${ART.wood}" stroke-width="6" stroke-linecap="round"/>
      <path d="M42 58h36M42 70h24" stroke="${ART.thread}" stroke-width="5" stroke-linecap="round"/>
      <path d="M48 48h20" stroke="${ART.thread2}" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  }

  function needlesArt() {
    return `<svg viewBox="0 0 120 120" role="img" aria-label="Набор игл">
      <rect width="120" height="120" fill="${ART.sheet}"/>
      <g stroke="${ART.metal}" stroke-width="2.4" stroke-linecap="round">
        <path d="M34 86 82 38"/><path d="M46 94 94 46"/><path d="M22 78 70 30"/>
      </g>
      <g fill="none" stroke="${ART.metal}" stroke-width="1.6">
        <ellipse cx="78" cy="42" rx="2.2" ry="4.6" transform="rotate(-45 78 42)"/>
        <ellipse cx="90" cy="50" rx="2.2" ry="4.6" transform="rotate(-45 90 50)"/>
        <ellipse cx="66" cy="34" rx="2.2" ry="4.6" transform="rotate(-45 66 34)"/>
      </g>
    </svg>`;
  }

  function boxArt() {
    return `<svg viewBox="0 0 120 120" role="img" aria-label="Крафт-коробка">
      <rect width="120" height="120" fill="${ART.sheet}"/>
      <rect x="28" y="44" width="64" height="48" fill="${ART.kraft}" stroke="${ART.ink}" stroke-width="1.5"/>
      <rect x="24" y="34" width="72" height="12" fill="${ART.kraft2}" stroke="${ART.ink}" stroke-width="1.5"/>
      <path d="M60 44v48" stroke="${ART.thread}" stroke-width="2"/>
    </svg>`;
  }

  function ribbonArt() {
    return `<svg viewBox="0 0 120 120" role="img" aria-label="Лента">
      <rect width="120" height="120" fill="${ART.sheet}"/>
      <path d="M60 58c-12-12-26-10-26 2s14 14 26 2" fill="none" stroke="${ART.thread}" stroke-width="1.8"/>
      <path d="M60 58c12-12 26-10 26 2s-14 14-26 2" fill="none" stroke="${ART.thread}" stroke-width="1.8"/>
      <path d="M60 62c0 10-6 18-14 24M60 62c0 10 6 18 14 24" fill="none" stroke="${ART.thread}" stroke-width="1.8"/>
      <circle cx="60" cy="60" r="3.4" fill="${ART.thread}"/>
    </svg>`;
  }

  function art(a) {
    if (a.type === 'chart') return chartArt(a);
    if (a.type === 'hoop') return hoopArt();
    if (a.type === 'needles') return needlesArt();
    if (a.type === 'box') return boxArt();
    if (a.type === 'ribbon') return ribbonArt();
    return '';
  }

  function simpleSteps(id, price, size, palette) {
    return [
      {
        id: 'size', title: 'Размер', mode: 'single', required: true,
        cards: [
          { id: id + '01', title: size, price, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 1, palette } },
          { id: id + '02', title: 'Большой формат', price: price + 340, max: 5, art: { type: 'chart', cols: 20, rows: 25, seed: id * 7 + 2, palette } },
        ],
      },
      {
        id: 'frame', title: 'Оформление', mode: 'single', required: false,
        cards: [
          { id: id + '03', title: 'Без рамы', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 3, palette } },
          { id: id + '04', title: 'Рама', price: 1100, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 3, palette, frame: 'wood' } },
        ],
      },
    ];
  }

  const DATA = {
    sections: [
      { title: 'Трекер на год', products: [1, 2] },
      { title: 'Трекеры своих хобби', products: [3, 4] },
    ],
    products: {
      1: {
        id: 1,
        title: 'Трекер на год · Цветение',
        size: '30 × 40 см',
        desc: 'Годовая вышивка-трекер: 365 клеток, по одной на каждый день. В наборе схема, канва, нитки и игла — вышиваете по крестику в день или заполняете неделю за вечер.',
        specs: [
          ['Размер', '30 × 40 см'],
          ['Канва', 'Аида 16, белая'],
          ['Нитки', '8 цветов, мулине Gamma'],
          ['В наборе', 'схема, канва, нитки, игла'],
        ],
        cover: { type: 'chart', cols: 20, rows: 25, seed: 11, palette: 'rose', frame: 'wood', done: 0.92 },
        steps: [
          {
            id: 'size', title: 'Размер', mode: 'single', required: true,
            cards: [
              { id: 'c101', title: '30 × 40 см', price: 1250, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 3, palette: 'rose' } },
              { id: 'c102', title: '40 × 50 см', price: 1690, max: 5, art: { type: 'chart', cols: 20, rows: 25, seed: 4, palette: 'rose' } },
            ],
          },
          {
            id: 'fabric', title: 'Основа', mode: 'single', required: false,
            cards: [
              { id: 'c201', title: 'Белый лён', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 5, palette: 'rose', bg: ART.fabricWhite } },
              { id: 'c202', title: 'Экрю', price: 120, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 5, palette: 'rose', bg: ART.fabricEcru } },
            ],
          },
          {
            id: 'frame', title: 'Оформление', mode: 'single', required: false,
            cards: [
              { id: 'c301', title: 'Без рамы', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: 'rose' } },
              { id: 'c302', title: 'Дубовая рама', price: 1100, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: 'rose', frame: 'wood' } },
              { id: 'c303', title: 'Чёрная рама', price: 980, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: 'rose', frame: 'black' } },
            ],
          },
          {
            id: 'pack', title: 'Упаковка', mode: 'multi', required: false,
            cards: [
              { id: 'c401', title: 'Крафт-коробка', price: 180, max: 5, art: { type: 'box' } },
              { id: 'c402', title: 'Лента', price: 90, max: 5, art: { type: 'ribbon' } },
            ],
          },
          {
            id: 'extra', title: 'Дополнения', mode: 'multi', required: false,
            cards: [
              { id: 'c501', title: 'Пяльцы 20 см', price: 450, max: 5, art: { type: 'hoop' } },
              { id: 'c502', title: 'Набор игл', price: 150, max: 5, art: { type: 'needles' } },
            ],
          },
        ],
      },
      2: {
        id: 2,
        title: 'Трекер на год · Ночной сад',
        size: '30 × 40 см',
        desc: 'Тот же годовой трекер в тёмной палитре: глубокий зелёный, слива и охра. Клетки складываются в ночной сад к концу года.',
        specs: [
          ['Размер', '30 × 40 см'],
          ['Канва', 'Аида 16, экрю'],
          ['Нитки', '9 цветов, мулине Gamma'],
          ['В наборе', 'схема, канва, нитки, игла'],
        ],
        cover: { type: 'chart', cols: 20, rows: 25, seed: 21, palette: 'night', bg: ART.fabricEcru, frame: 'black', done: 0.92 },
        steps: simpleSteps(2, 1390, '30 × 40 см', 'night'),
      },
      3: {
        id: 3,
        title: 'Трекер чтения',
        size: '20 × 30 см',
        desc: 'Трекер для книг: клетка за книгу, цвет — за жанр. Компактный формат, который помещается на полку рядом с книгами.',
        specs: [
          ['Размер', '20 × 30 см'],
          ['Канва', 'Аида 16, белая'],
          ['Нитки', '6 цветов, мулине Gamma'],
          ['В наборе', 'схема, канва, нитки, игла'],
        ],
        cover: { type: 'chart', cols: 16, rows: 20, seed: 31, palette: 'warm', done: 0.9 },
        steps: simpleSteps(3, 890, '20 × 30 см', 'warm'),
      },
      4: {
        id: 4,
        title: 'Трекер вышивки',
        size: '20 × 30 см',
        desc: 'Считает вышитые проекты: крестик за крестик, клетка за готовую работу. Для тех, кто вышивает каждый вечер.',
        specs: [
          ['Размер', '20 × 30 см'],
          ['Канва', 'Аида 16, белая'],
          ['Нитки', '7 цветов, мулине Gamma'],
          ['В наборе', 'схема, канва, нитки, игла'],
        ],
        cover: { type: 'chart', cols: 16, rows: 20, seed: 41, palette: 'cool', done: 0.9 },
        steps: simpleSteps(4, 940, '20 × 30 см', 'cool'),
      },
    },
    orders: [
      { id: 14, name: 'Анна', what: 'Трекер на год · Цветение', sum: 3100, when: 'сегодня, 14:20', unread: true },
      { id: 13, name: 'Мария', what: 'Трекер на год · Ночной сад', sum: 2480, when: 'сегодня, 11:05', unread: true },
      { id: 12, name: 'Ольга', what: 'Трекер чтения', sum: 890, when: 'вчера, 19:40', unread: true },
      { id: 11, name: 'Ирина', what: 'Трекер вышивки', sum: 1090, when: 'вчера, 12:10', unread: false },
    ],
  };

  const state = { productId: 1, step: 0, sel: {}, total: 0, orderId: 14, menu: false };
  const app = document.getElementById('app');
  const product = () => DATA.products[state.productId];

  const CARD_MAP = {};
  Object.values(DATA.products).forEach((p) => {
    p.steps.forEach((s) => s.cards.forEach((c) => { CARD_MAP[c.id] = { card: c, step: s }; }));
  });

  const fromPrice = (p) =>
    p.steps.filter((s) => s.required).reduce((sum, s) => sum + Math.min(...s.cards.map((c) => c.price)), 0);

  const orderTotal = () =>
    Object.entries(state.sel).reduce((sum, [id, qty]) => {
      const hit = CARD_MAP[id];
      return hit ? sum + hit.card.price * qty : sum;
    }, 0);

  const selectedInStep = (step) => step.cards.filter((c) => state.sel[c.id]);

  function topbar(opts) {
    const o = opts || {};
    const left = o.back
      ? `<button class="back-btn" data-act="back" aria-label="Назад">${CHEVRON}</button>`
      : `<div class="brand">${CROSS(16, 'currentColor', 2.4)}<span>СобериЗаказ</span></div>`;
    return `<header class="topbar">
      ${left}
      ${o.back && o.title ? `<div class="top-title">${o.title}</div>` : ''}
      <button class="icon-btn" data-act="menu" aria-label="Меню">${MENU_ICON}</button>
    </header>`;
  }

  const bar = (inner) => `<div class="bar">${inner}</div>`;

  function productCard(p) {
    return `<a class="product" href="#product/${p.id}">
      <div class="product-media">${chartArt(p.cover)}</div>
      <div class="product-body">
        <div class="product-name">${p.title}</div>
        <div class="product-meta">${p.size}</div>
      </div>
      <div class="product-price">от ${money(fromPrice(p))}</div>
    </a>`;
  }

  function renderCatalog() {
    const sections = DATA.sections.map((s) => `<section class="section">
        <h2 class="section-title">${s.title}</h2>
        <div class="products">${s.products.map((id) => productCard(DATA.products[id])).join('')}</div>
      </section>`).join('');
    return topbar() + `<main class="page">
      <h1>Наборы для вышивки</h1>
      <p class="lede">Трекеры на год и для хобби. Собираете набор по шагам — цена складывается сама.</p>
      ${sections}
    </main>`;
  }

  function renderProduct() {
    const p = product();
    return topbar({ back: true, title: p.title }) + `<main class="page">
      <div class="hero">${chartArt(p.cover)}</div>
      <div class="product-head">
        <h1>${p.title}</h1>
        <div class="price-row">
          <span class="price">от ${money(fromPrice(p))}</span>
          <span class="price-note">${p.size}</span>
        </div>
        <p class="body-text">${p.desc}</p>
      </div>
      <dl class="specs">${p.specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    </main>` + bar(`<button class="btn" data-act="start">Собрать заказ</button>`);
  }

  function pickCard(c) {
    const qty = state.sel[c.id] || 0;
    const on = qty > 0;
    return `<div class="pick" role="button" tabindex="0" aria-pressed="${on}" data-pick="${c.id}">
      <div class="pick-media">${art(c.art)}</div>
      <div class="pick-body">
        <div class="pick-name">${c.title}</div>
        <div class="pick-price">${c.price ? money(c.price) : 'включено'}</div>
      </div>
      <span class="pick-check">${CROSS(11, 'currentColor', 2.4)}</span>
      ${on ? `<div class="stepper">
        <button data-qty="-1" aria-label="Меньше">−</button>
        <span class="qty">${qty}</span>
        <button data-qty="1" ${qty >= c.max ? 'disabled' : ''} aria-label="Больше">+</button>
      </div>` : ''}
    </div>`;
  }

  function renderStep() {
    const p = product();
    const i = state.step;
    const st = p.steps[i];
    const total = orderTotal();
    const crosses = p.steps.map((s, k) => {
      const has = selectedInStep(s).length > 0;
      const cls = has ? 'done' : k === i ? 'current' : '';
      return `<span class="${cls}">${CROSS(12, 'currentColor', 2.2)}</span>`;
    }).join('');
    const canNext = !st.required || selectedInStep(st).length > 0;
    const nextLabel = i === p.steps.length - 1 ? 'К заказу' : 'Далее';
    const hint = st.mode === 'single'
      ? (st.required ? 'Выберите один вариант' : 'Выберите один вариант или пропустите шаг')
      : 'Можно выбрать несколько';
    return topbar({ back: true, title: p.title }) + `<main class="page">
      <div class="step-head">
        <h1>${st.title}</h1>
        <div class="step-meta">
          <span>Шаг ${i + 1} из ${p.steps.length}</span>
          <span class="crosses" aria-hidden="true">${crosses}</span>
        </div>
        <div class="hint">${hint}</div>
      </div>
      <div class="picks">${st.cards.map((c) => pickCard(c)).join('')}</div>
    </main>` + bar(`
      ${st.required ? '' : '<button class="skip" data-act="skip">Пропустить</button>'}
      <button class="btn" data-act="next" ${canNext ? '' : 'disabled'}>${nextLabel}${total ? ' · ' + money(total) : ''}</button>
    `);
  }

  function legendRow(c) {
    const qty = state.sel[c.id];
    return `<div class="legend-row">
      <div class="legend-thumb">${art(c.art)}</div>
      <div>
        <div class="legend-name">${c.title}</div>
        <div class="legend-qty">${qty} шт.</div>
      </div>
      <div class="legend-sum">${money(c.price * qty)}</div>
    </div>`;
  }

  function renderReview() {
    const p = product();
    const groups = p.steps.map((st) => {
      const rows = selectedInStep(st);
      if (!rows.length) return '';
      return `<div class="legend-group">
        <div class="legend-step">${st.title}</div>
        ${rows.map(legendRow).join('')}
      </div>`;
    }).join('');
    return topbar({ back: true, title: 'Заказ' }) + `<main class="page">
      <h1>Ваш заказ</h1>
      <div class="legend-title">${p.title}</div>
      ${groups}
      <div class="total">
        <span class="total-label">Итого</span>
        <span class="total-value">${money(orderTotal())}</span>
      </div>
      <p class="note">Оплата и доставка — в переписке ВКонтакте. Напишу вам в личные сообщения после отправки.</p>
    </main>` + bar(`<button class="btn" data-act="submit">Отправить заказ</button>`);
  }

  function renderSuccess() {
    return topbar({ back: true, title: 'Заказ' }) + `<main class="page">
      <div class="done-wrap">
        <div class="done-mark">${CHECK}</div>
        <h1>Заказ №${state.orderId} отправлен</h1>
        <p>Сумма — ${money(state.total)}. Напишу вам в личные сообщения ВКонтакте, чтобы согласовать оплату и доставку.</p>
        <div class="done-actions">
          <a class="btn block" href="#catalog">Вернуться в каталог</a>
          <button class="text-link">Написать в сообщество</button>
        </div>
      </div>
    </main>`;
  }

  function renderAdmin() {
    const rows = DATA.orders.map((o) => `<div class="order">
      <div class="order-id">${o.unread ? '<span class="dot"></span>' : ''}№ ${o.id} · ${o.name}</div>
      <div class="order-when">${o.when}</div>
      <div class="order-what">${o.what}</div>
      <div class="order-sum">${money(o.sum)}</div>
    </div>`).join('');
    return topbar({ back: true, title: 'Управление' }) + `<main class="page">
      <h1>Заказы</h1>
      <div class="summary">
        <div class="summary-cell"><div class="summary-k">заказов</div><div class="summary-v">14</div></div>
        <div class="summary-cell"><div class="summary-k">новых</div><div class="summary-v">3</div></div>
        <div class="summary-cell"><div class="summary-k">сумма</div><div class="summary-v">41 250 ₽</div></div>
      </div>
      <div class="chips">
        <button class="chip" aria-pressed="true">Все</button>
        <button class="chip" aria-pressed="false">Новые</button>
        <button class="chip" aria-pressed="false">Трекер на год</button>
        <button class="chip" aria-pressed="false">Хобби</button>
      </div>
      <div class="orders">${rows}</div>
      <button class="more">Показать все 14</button>
    </main>`;
  }

  function renderMenu() {
    return `<div class="sheet" data-open="${state.menu}">
      <div class="sheet-head">
        <div class="brand">${CROSS(16, 'currentColor', 2.4)}<span>СобериЗаказ</span></div>
        <button class="icon-btn" data-act="menu" aria-label="Закрыть меню">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <nav>
        <a href="#catalog">Каталог</a>
        <a href="#info">Доставка и оплата</a>
        <a href="#admin">Управление</a>
        <button>Написать в сообщество</button>
        <a href="../../variants/index.html">Все варианты дизайна</a>
      </nav>
      <div class="sheet-note">Мини-приложение сообщества «КоргиХобби»</div>
    </div>`;
  }

  function render() {
    const name = (location.hash.replace('#', '') || 'catalog').split('/')[0];
    if (name === 'product') return renderProduct();
    if (name === 'step') return renderStep();
    if (name === 'review') return renderReview();
    if (name === 'success') return renderSuccess();
    if (name === 'admin') return renderAdmin();
    return renderCatalog();
  }

  function paint(keepScroll) {
    const y = keepScroll ? window.scrollY : 0;
    app.innerHTML = render() + renderMenu();
    window.scrollTo(0, y);
  }

  function seedReview() {
    if (Object.keys(state.sel).length) return;
    state.sel = { c101: 1, c202: 1, c302: 1, c401: 1, c501: 1 };
  }

  function handlePick(id) {
    const hit = CARD_MAP[id];
    if (!hit) return;
    const { step } = hit;
    if (state.sel[id]) delete state.sel[id];
    else {
      if (step.mode === 'single') step.cards.forEach((c) => delete state.sel[c.id]);
      state.sel[id] = 1;
    }
    paint(true);
  }

  function handleQty(id, delta) {
    const current = state.sel[id] || 0;
    const next = current + delta;
    if (next <= 0) delete state.sel[id];
    else state.sel[id] = Math.min(next, CARD_MAP[id].card.max);
    paint(true);
  }

  function route() {
    const hash = location.hash.replace('#', '') || 'catalog';
    const [name, arg] = hash.split('/');
    if (name === 'product') state.productId = Number(arg) || 1;
    if (name === 'step') state.step = Math.max(0, Math.min(Number(arg) || 0, product().steps.length - 1));
    if (name === 'review') seedReview();
    if (name === 'success' && !state.total) state.total = 3100;
    if (name === 'catalog') state.menu = false;
    paint(false);
  }

  app.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      handleQty(qtyBtn.closest('[data-pick]').dataset.pick, Number(qtyBtn.dataset.qty));
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      handlePick(pick.dataset.pick);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'menu') { state.menu = !state.menu; paint(true); }
    if (a === 'back') history.back();
    if (a === 'start') location.hash = 'step/0';
    if (a === 'skip') {
      const st = product().steps[state.step];
      st.cards.forEach((c) => delete state.sel[c.id]);
      location.hash = state.step === product().steps.length - 1 ? 'review' : 'step/' + (state.step + 1);
    }
    if (a === 'next') {
      const last = state.step === product().steps.length - 1;
      location.hash = last ? 'review' : 'step/' + (state.step + 1);
    }
    if (a === 'submit') { state.total = orderTotal(); location.hash = 'success'; }
  });

  app.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const pick = e.target.closest('[data-pick]');
    if (!pick) return;
    e.preventDefault();
    handlePick(pick.dataset.pick);
  });

  window.addEventListener('hashchange', route);
  document.documentElement.dataset.variant = VARIANT;
  if (!location.hash) location.hash = 'catalog';
  route();
})();
