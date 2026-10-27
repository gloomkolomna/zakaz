const money = (n) => n.toLocaleString('ru-RU') + ' ₽';

const CROSS = (size = 12, color = 'currentColor', w = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 3.4 12.6 12.6M12.6 3.4 3.4 12.6" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/></svg>`;

const CHEVRON = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const LOGO = (size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M18.6 4.7 10.8 12.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
  <ellipse cx="18.1" cy="4.2" rx="0.85" ry="1.35" transform="rotate(-45 18.1 4.2)" fill="none" stroke="currentColor" stroke-width="1.05"/>
  <path d="M17.6 4.9C16.2 2.4 13.2 2 11.7 3.6c-1.1 1.2-.8 3 .5 3.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M4.6 15.2 9.4 20M9.4 15.2 4.6 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
const CHECK = `<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" class="check-mark"><path d="M12 30l12 12 20-26" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

const CHEV_UP = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CHEV_DOWN = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const MENU_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function chartArt(o) {
  const cols = o.cols || 18;
  const rows = o.rows || 24;
  const cell = 10;
  const w = cols * cell;
  const h = rows * cell;
  const palette = o.palette || ['#c97b84'];
  const bg = o.bg || '#ffffff';
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
    for (let x = 1; x < cols - 1; x += 2) {
      cells += stitch(x, 1, palette[2] || palette[0]) + stitch(x, rows - 2, palette[2] || palette[0]);
    }
    for (let y = 1; y < rows - 1; y += 2) {
      cells += stitch(1, y, palette[2] || palette[0]) + stitch(cols - 2, y, palette[2] || palette[0]);
    }
  }

  let d = '';
  for (let x = 1; x < cols; x++) d += `M${x * cell} 0V${h}`;
  for (let y = 1; y < rows; y++) d += `M0 ${y * cell}H${w}`;
  const frame = o.frame
    ? `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="${o.frame}" stroke-width="8"/>`
    : '';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Вышитый трекер на канве">
    <rect width="${w}" height="${h}" fill="${bg}"/>
    <path d="${d}" stroke="#e7e8e0" stroke-width="1" fill="none"/>
    ${cells}${frame}
  </svg>`;
}
function hoopArt() {
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Пяльцы">
    <rect width="120" height="120" fill="#ffffff"/>
    <circle cx="60" cy="64" r="40" fill="#fdfdf9" stroke="#8b6e4e" stroke-width="8"/>
    <rect x="52" y="12" width="16" height="12" rx="3" fill="#9aa0a6" stroke="#1a201b" stroke-width="1.4"/>
    <path d="M54 24h12" stroke="#8b6e4e" stroke-width="6" stroke-linecap="round"/>
    <path d="M42 58h36M42 70h24" stroke="#c97b84" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 48h20" stroke="#7c9a6d" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

function needlesArt() {
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Набор игл">
    <rect width="120" height="120" fill="#ffffff"/>
    <g stroke="#9aa0a6" stroke-width="2.4" stroke-linecap="round">
      <path d="M34 86 82 38"/><path d="M46 94 94 46"/><path d="M22 78 70 30"/>
    </g>
    <g fill="none" stroke="#9aa0a6" stroke-width="1.6">
      <ellipse cx="78" cy="42" rx="2.2" ry="4.6" transform="rotate(-45 78 42)"/>
      <ellipse cx="90" cy="50" rx="2.2" ry="4.6" transform="rotate(-45 90 50)"/>
      <ellipse cx="66" cy="34" rx="2.2" ry="4.6" transform="rotate(-45 66 34)"/>
    </g>
  </svg>`;
}

function boxArt() {
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Крафт-коробка">
    <rect width="120" height="120" fill="#ffffff"/>
    <rect x="28" y="44" width="64" height="48" fill="#efe3cf" stroke="#1a201b" stroke-width="1.5"/>
    <rect x="24" y="34" width="72" height="12" fill="#e3d3b8" stroke="#1a201b" stroke-width="1.5"/>
    <path d="M60 44v48" stroke="#b02a21" stroke-width="2"/>
  </svg>`;
}

function ribbonArt() {
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Лента">
    <rect width="120" height="120" fill="#ffffff"/>
    <path d="M60 58c-12-12-26-10-26 2s14 14 26 2" fill="#f7e8e5" stroke="#b02a21" stroke-width="1.8"/>
    <path d="M60 58c12-12 26-10 26 2s-14 14-26 2" fill="#f7e8e5" stroke="#b02a21" stroke-width="1.8"/>
    <path d="M60 62c0 10-6 18-14 24M60 62c0 10 6 18 14 24" fill="none" stroke="#b02a21" stroke-width="1.8"/>
    <circle cx="60" cy="60" r="3.4" fill="#b02a21"/>
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

const ROSE = ['#c97b84', '#d99aa0', '#7c9a6d', '#d3a23f'];
const NIGHT = ['#4f7c86', '#8d6a86', '#d3a23f', '#3c5a63'];
const WARM = ['#d3a23f', '#c97b84', '#7c9a6d', '#b07a4a'];
const COOL = ['#8d6a86', '#4f7c86', '#c97b84', '#7c9a6d'];

function simpleSteps(id, price, size, palette, bg) {
  return [
    {
      id: 'size', title: 'Размер', mode: 'single', required: true,
      cards: [
        { id: id + '01', title: size, price, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 1, palette, bg } },
        { id: id + '02', title: 'Большой формат', price: price + 340, max: 5, art: { type: 'chart', cols: 20, rows: 25, seed: id * 7 + 2, palette, bg } },
      ],
    },
    {
      id: 'frame', title: 'Оформление', mode: 'single', required: false,
      cards: [
        { id: id + '03', title: 'Без рамы', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 3, palette, bg } },
        { id: id + '04', title: 'Дубовая рама', price: 1100, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: id * 7 + 3, palette, bg, frame: '#8b6e4e' } },
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
      cover: { type: 'chart', cols: 20, rows: 25, seed: 11, palette: ROSE, frame: '#8b6e4e', done: 0.92 },
      steps: [
        {
          id: 'size', title: 'Размер', mode: 'single', required: true,
          cards: [
            { id: 'c101', title: '30 × 40 см', price: 1250, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 3, palette: ROSE } },
            { id: 'c102', title: '40 × 50 см', price: 1690, max: 5, art: { type: 'chart', cols: 20, rows: 25, seed: 4, palette: ROSE } },
          ],
        },
        {
          id: 'fabric', title: 'Основа', mode: 'single', required: false,
          cards: [
            { id: 'c201', title: 'Белый лён', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 5, palette: ROSE, bg: '#ffffff' } },
            { id: 'c202', title: 'Экрю', price: 120, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 5, palette: ROSE, bg: '#f1e8d8' } },
          ],
        },
        {
          id: 'frame', title: 'Оформление', mode: 'single', required: false,
          cards: [
            { id: 'c301', title: 'Без рамы', price: 0, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: ROSE } },
            { id: 'c302', title: 'Дубовая рама', price: 1100, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: ROSE, frame: '#8b6e4e', done: 0.92 } },
            { id: 'c303', title: 'Чёрная рама', price: 980, max: 5, art: { type: 'chart', cols: 18, rows: 24, seed: 6, palette: ROSE, frame: '#232a24' } },
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
      cover: { type: 'chart', cols: 20, rows: 25, seed: 21, palette: NIGHT, bg: '#f1e8d8', frame: '#232a24', done: 0.92 },
      steps: simpleSteps(2, 1390, '30 × 40 см', NIGHT, '#f1e8d8'),
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
      cover: { type: 'chart', cols: 16, rows: 20, seed: 31, palette: WARM, done: 0.9 },
      steps: simpleSteps(3, 890, '20 × 30 см', WARM, '#ffffff'),
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
      cover: { type: 'chart', cols: 16, rows: 20, seed: 41, palette: COOL, done: 0.9 },
      steps: simpleSteps(4, 940, '20 × 30 см', COOL, '#ffffff'),
    },
  },
  orders: [
    {
      id: 14, buyer: 'Анна', productId: 1, at: 202610260920, when: '26 октября, 09:20', status: 'new', unread: true, mine: true,
      items: [
        { card: 'c101', qty: 1 }, { card: 'c202', qty: 1 }, { card: 'c302', qty: 1 },
        { card: 'c401', qty: 1 }, { card: 'c501', qty: 1 },
      ],
    },
    {
      id: 13, buyer: 'Анна', productId: 2, at: 202610261105, when: '26 октября, 11:05', status: 'cancelled', unread: false, mine: true,
      cancelSeen: false, cancelledWhen: '26 октября, 11:40',
      items: [{ card: '202', qty: 1 }, { card: '204', qty: 1 }],
    },
    {
      id: 12, buyer: 'Анна', productId: 3, at: 202610261200, when: '26 октября, 12:00', status: 'new', unread: true, mine: true,
      items: [{ card: '301', qty: 1 }, { card: '303', qty: 1 }],
    },
    {
      id: 11, buyer: 'Ирина', productId: 4, at: 202610261410, when: '26 октября, 14:10', status: 'new', unread: false, mine: false,
      items: [{ card: '401', qty: 1 }, { card: '403', qty: 1 }],
    },
    {
      id: 10, buyer: 'Мария', productId: 1, at: 202610261600, when: '26 октября, 16:00', status: 'new', unread: false, mine: false,
      items: [{ card: 'c102', qty: 1 }, { card: 'c303', qty: 1 }],
    },
  ],
};

DATA.orders.forEach((o, i) => { o.q = i + 1; });

const state = {
  productId: 1,
  step: 0,
  sel: {},
  total: 0,
  orderId: 14,
  viewOrderId: 14,
  nextOrderId: 15,
  confirmId: null,
  pickStep: null,
  queuePos: 1,
  menu: false,
};

const app = document.getElementById('app');

function product() {
  return DATA.products[state.productId];
}

function cards() {
  const map = {};
  Object.values(DATA.products).forEach((p) => {
    p.steps.forEach((s) => s.cards.forEach((c) => { map[c.id] = { card: c, step: s }; }));
  });
  return map;
}

const CARD_MAP = cards();

function fromPrice(p) {
  return p.steps
    .filter((s) => s.required)
    .reduce((sum, s) => sum + Math.min(...s.cards.map((c) => c.price)), 0);
}

function orderTotal() {
  return Object.entries(state.sel).reduce((sum, [id, qty]) => {
    const hit = CARD_MAP[id];
    return hit ? sum + hit.card.price * qty : sum;
  }, 0);
}

function selectedInStep(step) {
  return step.cards.filter((c) => state.sel[c.id]);
}

function orderTotalOf(o) {
  return o.items.reduce((sum, it) => {
    const hit = CARD_MAP[it.card];
    return hit ? sum + hit.card.price * it.qty : sum;
  }, 0);
}

function orderQtyOf(o) {
  return o.items.reduce((sum, it) => sum + it.qty, 0);
}

function orderGroups(o) {
  const p = DATA.products[o.productId];
  return p.steps
    .map((step) => ({
      step,
      rows: o.items
        .map((it) => ({ card: CARD_MAP[it.card] && CARD_MAP[it.card].card, qty: it.qty }))
        .filter((r) => r.card && CARD_MAP[r.card.id].step === step),
    }))
    .filter((g) => g.rows.length);
}

const STATUS_LABEL = { new: 'В работе', done: 'Выполнен', cancelled: 'Отменён' };

function moveOrder(id, dir) {
  const list = queueList();
  const i = list.findIndex((o) => o.id === id);
  if (i < 0) return;
  const j = dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  const a = list[i];
  const b = list[j];
  const q = a.q;
  a.q = b.q;
  b.q = q;
}

function statusLabel(o) {
  return STATUS_LABEL[o.status] || 'В работе';
}

function queueList() {
  return DATA.orders
    .filter((o) => o.status === 'new')
    .sort((a, b) => a.q - b.q || a.at - b.at || a.id - b.id);
}

function queuePosition(o) {
  if (o.status !== 'new') return null;
  const i = queueList().findIndex((x) => x.id === o.id);
  return i < 0 ? null : i + 1;
}

function ordinal(n) {
  return n + '-й';
}

function topbar(opts) {
  const o = opts || {};
  const left = o.back
    ? `<button class="back-btn" data-act="back" aria-label="Назад">${CHEVRON}</button>`
    : `<div class="brand">${LOGO(22)}<span>СобериЗаказ</span></div>`;
  return `<header class="topbar">
    ${left}
    ${o.back && o.title ? `<div class="top-title">${o.title}</div>` : ''}
    <button class="icon-btn" data-act="menu" aria-label="Меню">${MENU_ICON}</button>
  </header>`;
}

function bar(inner) {
  return `<div class="bar">${inner}</div>`;
}

function productCard(p) {
  return `<a class="product" href="#product/${p.id}">
    <div class="product-media">${chartArt(p.cover)}</div>
    <div class="product-name">${p.title}</div>
    <div class="product-meta">от ${money(fromPrice(p))}</div>
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

function pickCard(c, step) {
  const qty = state.sel[c.id] || 0;
  const on = qty > 0;
  return `<div class="pick" role="button" tabindex="0" aria-pressed="${on}" data-pick="${c.id}" data-card="${c.id}">
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
    <div class="picks">${st.cards.map((c) => pickCard(c, st)).join('')}</div>
  </main>` + bar(`
    ${st.required ? '' : '<button class="skip" data-act="skip">Пропустить</button>'}
    <button class="btn" data-act="next" ${canNext ? '' : 'disabled'}>${nextLabel}${total ? ' · ' + money(total) : ''}</button>
  `);
}

function legendRow(item, editable) {
  const { card, qty } = item;
  if (!editable) {
    return `<div class="legend-row">
      <div class="legend-thumb">${art(card.art)}</div>
      <div class="legend-main">
        <div class="legend-name">${card.title}</div>
        <div class="legend-qty">${qty} шт.</div>
      </div>
      <div class="legend-sum">${money(card.price * qty)}</div>
    </div>`;
  }
  return `<div class="legend-row is-editable">
    <div class="legend-thumb">${art(card.art)}</div>
    <div class="legend-main">
      <div class="legend-name">${card.title}</div>
      <div class="legend-controls">
        <div class="stepper mini" data-card="${card.id}">
          <button data-qty="-1" aria-label="Меньше">−</button>
          <span class="qty">${qty}</span>
          <button data-qty="1" ${qty >= card.max ? 'disabled' : ''} aria-label="Больше">+</button>
        </div>
        <button class="remove" data-remove="${card.id}">Убрать</button>
      </div>
    </div>
    <div class="legend-sum">${money(card.price * qty)}</div>
  </div>`;
}

function renderReview() {
  const p = product();
  const groups = p.steps.map((st, idx) => {
    const rows = selectedInStep(st);
    if (!rows.length) return '';
    return `<div class="legend-group">
      <div class="legend-step">
        <span>${st.title}</span>
        <button class="reselect" data-reselect="${idx}">Изменить</button>
      </div>
      ${rows.map((c) => legendRow({ card: c, qty: state.sel[c.id] }, true)).join('')}
    </div>`;
  }).join('');
  const missing = p.steps.filter((st) => st.required && !selectedInStep(st).length);
  const total = orderTotal();
  const canSubmit = Boolean(groups) && missing.length === 0;
  return topbar({ back: true, title: 'Заказ' }) + `<main class="page">
    <h1>Ваш заказ</h1>
    <div class="legend-title">${p.title}</div>
    ${groups || `<div class="empty">Здесь пока пусто. <a href="#step/0">Вернуться к шагам</a></div>`}
    ${missing.length
      ? `<div class="empty">В шаге «${missing[0].title}» ничего не выбрано.
          <button class="link-btn" data-reselect="${p.steps.indexOf(missing[0])}">Выбрать</button></div>`
      : ''}
    ${canSubmit ? `<div class="total">
      <span class="total-label">Итого</span>
      <span class="total-value">${money(total)}</span>
    </div>` : ''}
    <p class="note">Оплата и доставка — в переписке ВКонтакте. Напишу вам в личные сообщения после отправки.</p>
  </main>` + bar(groups
    ? `<button class="btn" data-act="submit" ${canSubmit ? '' : 'disabled'}>Отправить заказ</button>`
    : `<a class="btn secondary" href="#step/0">Вернуться к шагам</a>`);
}

function renderSheet() {
  if (state.pickStep === null) return '';
  const p = product();
  const st = p.steps[state.pickStep];
  if (!st) return '';
  const hint = st.mode === 'single' ? 'Выберите один вариант' : 'Можно выбрать несколько';
  return `<div class="modal sheet-modal" data-sheet>
    <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="reselect-title">
      <div class="sheet-card-head">
        <h2 id="reselect-title">${st.title}</h2>
        <button class="icon-btn" data-close-sheet aria-label="Закрыть">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="hint">${hint}</div>
      <div class="picks sheet-picks">${st.cards.map((c) => pickCard(c, st)).join('')}</div>
      <button class="btn" data-close-sheet>Готово</button>
    </div>
  </div>`;
}

function renderOrders() {
  const list = DATA.orders.filter((o) => o.mine);
  const rows = list.map((o) => {
    const p = DATA.products[o.productId];
    const cancelled = o.status === 'cancelled';
    return `<a class="order-card${cancelled ? ' is-cancelled' : ''}" href="#order/${o.id}">
      <div class="oc-head">
        <span class="oc-num">№ ${o.id}</span>
        <span class="oc-status${cancelled ? ' red' : ''}">${statusLabel(o)}</span>
      </div>
      <div class="oc-title">${p.title}</div>
      <div class="oc-meta">${o.when} · ${orderQtyOf(o)} поз.</div>
      ${o.status === 'new' ? `<div class="oc-queue">№ ${queuePosition(o)} в очереди</div>` : ''}
      <div class="oc-sum">${money(orderTotalOf(o))}</div>
    </a>`;
  }).join('');
  return topbar({ back: true, title: 'Мои заказы' }) + `<main class="page">
    <h1>Мои заказы</h1>
    <div class="orders-list">${rows || `<div class="empty">Заказов пока нет. <a href="#catalog">Собрать первый</a></div>`}</div>
  </main>`;
}

function renderOrder(id) {
  const o = DATA.orders.find((x) => x.id === id);
  if (!o) {
    return topbar({ back: true, title: 'Заказ' }) + `<main class="page">
      <h1>Заказ не найден</h1>
      <p class="note"><a href="#orders">К моим заказам</a></p>
    </main>`;
  }
  const p = DATA.products[o.productId];
  const cancelled = o.status === 'cancelled';
  const done = o.status === 'done';
  const groups = orderGroups(o).map((g) => `<div class="legend-group">
    <div class="legend-step"><span>${g.step.title}</span></div>
    ${g.rows.map((r) => legendRow(r, false)).join('')}
  </div>`).join('');
  return topbar({ back: true, title: `Заказ №${o.id}` }) + `<main class="page">
    <h1>Заказ №${o.id}</h1>
    <div class="order-status${cancelled ? ' red' : ''}">${statusLabel(o)} · ${o.when}</div>
    ${o.status === 'new' ? `<div class="queue-line">Ваш заказ — ${ordinal(queuePosition(o))} в очереди</div>` : ''}
    <div class="legend-title">${p.title}</div>
    ${groups}
    <div class="total">
      <span class="total-label">Итого</span>
      <span class="total-value">${money(orderTotalOf(o))}</span>
    </div>
    ${cancelled
      ? `<div class="cancelled-note">Заказ отменён ${o.cancelledWhen || ''}. Если это ошибка — напишите в сообщество, соберём заново.</div>`
      : done
        ? `<div class="cancelled-note">Заказ выполнен ${o.doneWhen || ''}. Если что-то не так — напишите в сообщество.</div>`
        : `<button class="btn danger block" data-cancel="${o.id}">Отменить заказ</button>
           <p class="note">Отмена сразу придёт владельцу. Состав сохранится в истории заказов.</p>`}
  </main>`;
}

function renderSuccess() {
  return topbar({ back: true, title: 'Заказ' }) + `<main class="page">
    <div class="done-wrap">
      <div class="done-mark">${CHECK}</div>
      <h1>Заказ №${state.orderId} отправлен</h1>
      <p>Сумма — ${money(state.total)}. Вы ${ordinal(state.queuePos)} в очереди. Напишу вам в личные сообщения ВКонтакте, чтобы согласовать оплату и доставку.</p>
      <div class="done-actions">
        <a class="btn block" href="#orders">Мои заказы</a>
        <a class="btn block secondary" href="#catalog">Вернуться в каталог</a>
        <button class="text-link">Написать в сообщество</button>
      </div>
    </div>
  </main>`;
}

function renderAdmin() {
  const unseen = DATA.orders.filter((o) => o.status === 'cancelled' && !o.cancelSeen);
  const queue = queueList();
  const sum = DATA.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + orderTotalOf(o), 0);
  const alert = unseen.length
    ? `<div class="alert">
        <div class="alert-body">
          <div class="alert-title">${unseen.length === 1 ? `Отмена заказа №${unseen[0].id}` : `${unseen.length} отмены`}</div>
          <div class="alert-sub">${unseen.map((o) => `${o.buyer} · ${DATA.products[o.productId].title}`).join('<br>')}</div>
        </div>
        <button class="alert-btn" data-seen>Понятно</button>
      </div>`
    : '';
  const ordered = [...DATA.orders].sort((a, b) => {
    const aActive = a.status === 'new' ? 0 : 1;
    const bActive = b.status === 'new' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    if (aActive === 0) return a.q - b.q || a.at - b.at;
    return b.at - a.at;
  });
  const rows = ordered.map((o) => {
    const cancelled = o.status === 'cancelled';
    const done = o.status === 'done';
    const q = queuePosition(o);
    const badge = q !== null
      ? `<span class="qnum">${q}</span>`
      : cancelled
        ? '<span class="pill-cancel">Отменён</span>'
        : '<span class="pill-done">Выполнен</span>';
    return `<div class="order${cancelled ? ' is-cancelled' : ''}${done ? ' is-done' : ''}">
      <div class="order-id">${badge}${o.unread && !cancelled && !done ? '<span class="dot"></span>' : ''}№ ${o.id} · ${o.buyer}</div>
      <div class="order-when">${o.when}</div>
      <div class="order-what">${DATA.products[o.productId].title}</div>
      <div class="order-sum">${money(orderTotalOf(o))}</div>
      ${q !== null ? `<div class="order-action">
        <div class="move-group">
          <button class="move-btn" data-move="up" data-id="${o.id}" ${q === 1 ? 'disabled' : ''} aria-label="Выше">${CHEV_UP}</button>
          <button class="move-btn" data-move="down" data-id="${o.id}" ${q === queue.length ? 'disabled' : ''} aria-label="Ниже">${CHEV_DOWN}</button>
        </div>
        <button class="done-btn" data-done="${o.id}">Выполнить</button>
      </div>` : ''}
    </div>`;
  }).join('');
  return topbar({ back: true, title: 'Управление' }) + `<main class="page">
    <h1>Заказы</h1>
    ${alert}
    <div class="summary">
      <div class="summary-cell"><div class="summary-k">в очереди</div><div class="summary-v">${queue.length}</div></div>
      <div class="summary-cell"><div class="summary-k">всего</div><div class="summary-v">${DATA.orders.length}</div></div>
      <div class="summary-cell"><div class="summary-k">сумма</div><div class="summary-v">${money(sum)}</div></div>
    </div>
    <div class="chips">
      <button class="chip" aria-pressed="true">Все</button>
      <button class="chip" aria-pressed="false">В очереди</button>
      <button class="chip" aria-pressed="false">Готовые</button>
    </div>
    <div class="order-hint">Порядок в очереди — стрелками</div>
    <div class="orders">${rows}</div>
    <button class="more">Показать все ${DATA.orders.length}</button>
  </main>`;
}

function renderConfirm() {
  if (!state.confirmId) return '';
  const o = DATA.orders.find((x) => x.id === state.confirmId);
  if (!o) return '';
  return `<div class="modal" data-modal>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <h2 id="cancel-title">Отменить заказ №${o.id}?</h2>
      <p>Заказ уйдёт из работы. Я сразу увижу отмену и напишу вам, чтобы уточнить детали.</p>
      <div class="modal-actions">
        <button class="btn secondary" data-confirm="no">Оставить</button>
        <button class="btn danger" data-confirm="yes">Отменить заказ</button>
      </div>
    </div>
  </div>`;
}

function renderMenu() {
  return `<div class="sheet" data-open="${state.menu}">
    <div class="sheet-head">
      <div class="brand">${LOGO(22)}<span>СобериЗаказ</span></div>
      <button class="icon-btn" data-act="menu" aria-label="Закрыть меню">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
    <nav>
      <a href="#catalog">Каталог</a>
      <a href="#orders">Мои заказы</a>
      <a href="#info">Доставка и оплата</a>
      <a href="#admin">Управление</a>
      <button>Написать в сообщество</button>
      <a href="variants/index.html">Все варианты дизайна</a>
    </nav>
    <div class="sheet-note">Мини-приложение сообщества «КоргиХобби»</div>
  </div>`;
}

function render() {
  const hash = location.hash.replace('#', '') || 'catalog';
  const name = hash.split('/')[0];
  if (name === 'catalog') return renderCatalog();
  if (name === 'product') return renderProduct();
  if (name === 'step') return renderStep();
  if (name === 'review') return renderReview();
  if (name === 'success') return renderSuccess();
  if (name === 'orders') return renderOrders();
  if (name === 'order') return renderOrder(state.viewOrderId);
  if (name === 'admin') return renderAdmin();
  return renderCatalog();
}

function paint(keepScroll) {
  const y = keepScroll ? window.scrollY : 0;
  app.innerHTML = render() + renderMenu() + renderConfirm() + renderSheet();
  const name = (location.hash.replace('#', '') || 'catalog').split('/')[0];
  const main = app.querySelector('main');
  if (main) main.classList.add('page-' + name);
  window.scrollTo(0, y);
}

function go(hash) {
  location.hash = hash;
}

function seedReview() {
  if (Object.keys(state.sel).length) return;
  state.sel = { c101: 1, c202: 1, c302: 1, c401: 1, c501: 1 };
}

function handlePick(id) {
  const hit = CARD_MAP[id];
  if (!hit) return;
  const { card, step } = hit;
  if (state.sel[id]) {
    delete state.sel[id];
  } else {
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
  if (name === 'order') state.viewOrderId = Number(arg) || 14;
  if (name === 'step') {
    state.step = Math.max(0, Math.min(Number(arg) || 0, product().steps.length - 1));
  }
  if (name === 'review') seedReview();
  if (name === 'success' && !state.total) state.total = 3100;
  if (name === 'catalog') state.menu = false;
  if (name !== 'review') state.pickStep = null;
  paint(false);
}

app.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    state.confirmId = null;
    state.pickStep = null;
    paint(true);
    return;
  }
  const qtyBtn = e.target.closest('[data-qty]');
  if (qtyBtn) {
    const holder = qtyBtn.closest('[data-card]') || qtyBtn.closest('[data-pick]');
    if (holder) handleQty(holder.dataset.card || holder.dataset.pick, Number(qtyBtn.dataset.qty));
    return;
  }
  const reselect = e.target.closest('[data-reselect]');
  if (reselect) {
    state.pickStep = Number(reselect.dataset.reselect);
    paint(true);
    return;
  }
  const closeSheet = e.target.closest('[data-close-sheet]');
  if (closeSheet) {
    state.pickStep = null;
    paint(true);
    return;
  }
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    delete state.sel[removeBtn.dataset.remove];
    paint(true);
    return;
  }
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    handlePick(pick.dataset.pick);
    return;
  }
  const cancelBtn = e.target.closest('[data-cancel]');
  if (cancelBtn) {
    state.confirmId = Number(cancelBtn.dataset.cancel);
    paint(true);
    return;
  }
  const confirmBtn = e.target.closest('[data-confirm]');
  if (confirmBtn) {
    if (confirmBtn.dataset.confirm === 'yes' && state.confirmId) {
      const o = DATA.orders.find((x) => x.id === state.confirmId);
      if (o) {
        o.status = 'cancelled';
        o.cancelSeen = false;
        o.cancelledWhen = 'сегодня';
        o.unread = false;
      }
    }
    state.confirmId = null;
    paint(true);
    return;
  }
  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) {
    const o = DATA.orders.find((x) => x.id === Number(doneBtn.dataset.done));
    if (o && o.status === 'new') {
      o.status = 'done';
      o.doneWhen = 'сегодня';
      o.unread = false;
    }
    paint(true);
    return;
  }
  const moveBtn = e.target.closest('[data-move]');
  if (moveBtn && !moveBtn.disabled) {
    moveOrder(Number(moveBtn.dataset.id), moveBtn.dataset.move);
    paint(true);
    return;
  }
  const seenBtn = e.target.closest('[data-seen]');
  if (seenBtn) {
    DATA.orders.forEach((o) => { if (o.status === 'cancelled') o.cancelSeen = true; });
    paint(true);
    return;
  }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.dataset.act;
  if (a === 'menu') {
    state.menu = !state.menu;
    paint(true);
  }
  if (a === 'back') history.back();
  if (a === 'start') go('step/0');
  if (a === 'skip') {
    const st = product().steps[state.step];
    st.cards.forEach((c) => delete state.sel[c.id]);
    go(state.step === product().steps.length - 1 ? 'review' : 'step/' + (state.step + 1));
  }
  if (a === 'next') {
    const last = state.step === product().steps.length - 1;
    go(last ? 'review' : 'step/' + (state.step + 1));
  }
  if (a === 'submit') {
    const items = Object.entries(state.sel).map(([card, qty]) => ({ card, qty }));
    if (!items.length) return;
    const id = state.nextOrderId++;
    const order = {
      id, buyer: 'Анна', productId: state.productId, at: 202610271500, when: 'сегодня',
      status: 'new', unread: true, mine: true, items,
      q: Math.max(0, ...DATA.orders.map((o) => o.q)) + 1,
    };
    DATA.orders.unshift(order);
    state.queuePos = queuePosition(order);
    state.total = orderTotal();
    state.orderId = id;
    state.viewOrderId = id;
    go('success');
  }
});

app.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pick = e.target.closest('[data-pick]');
  if (!pick) return;
  e.preventDefault();
  handlePick(pick.dataset.pick);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.pickStep !== null || state.confirmId) {
    state.pickStep = null;
    state.confirmId = null;
    paint(true);
  }
});

window.addEventListener('hashchange', route);

if (!location.hash) location.hash = 'catalog';
route();
