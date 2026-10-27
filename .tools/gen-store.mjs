import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'D:/Боты/СобериЗаказ/docs/store';
const PREVIEW = 'file:///D:/Боты/СобериЗаказ/docs/design-preview/index.html';

await mkdir(`${OUT}/raw`, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});

async function render(url, width, height, out, after) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
  if (after) {
    await after(page);
    await new Promise((r) => setTimeout(r, 350));
  }
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
  await page.close();
}

await render(`file://${OUT}/assets.html?a=icon`, 576, 576, `${OUT}/raw/icon-576@2x.png`);
await render(`file://${OUT}/assets.html?a=snippet`, 1120, 630, `${OUT}/raw/snippet-1120x630@2x.png`);

const shots = [
  ['screen-1-catalog', '#catalog', null],
  ['screen-2-product', '#product/1', null],
  ['screen-3-step', '#step/2', async (page) => {
    await page.click('[data-pick]');
  }],
  ['screen-4-review', '#review', null],
];

for (const [name, hash, after] of shots) {
  await render(`${PREVIEW}${hash}`, 600, 1200, `${OUT}/raw/${name}@2x.png`, after);
}

await browser.close();
console.log('raw rendered');
