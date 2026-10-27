import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'D:/Боты/СобериЗаказ/docs/design-preview';
const URL = 'file:///D:/Боты/СобериЗаказ/docs/design-preview/index.html';
const shots = [
  ['resp-630-catalog', '#catalog', 630, 600],
  ['resp-630-step', '#step/0', 630, 600],
  ['resp-1000-product', '#product/1', 1000, 700],
  ['resp-1000-review', '#review', 1000, 700],
  ['resp-1000-catalog', '#catalog', 1000, 700],
  ['resp-390-catalog', '#catalog', 390, 844],
];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const report = [];
for (const [name, hash, width, height] of shots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(URL + hash, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const cards = [...document.querySelectorAll('.products .product')];
    const tops = new Set(cards.slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().top)));
    const hero = document.querySelector('.hero');
    const head = document.querySelector('.product-head');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      columns: tops.size,
      sideBySide: hero && head ? hero.getBoundingClientRect().right <= head.getBoundingClientRect().left + 1 : null,
      pageClass: main ? main.className : null,
    };
  });
  await page.screenshot({ path: `${ROOT}/shots/${name}.png` });
  report.push({ name, width, height, ...metrics, errors });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
