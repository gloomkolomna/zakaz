import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'D:/Боты/СобериЗаказ/docs/design-preview';
const OUT = `${ROOT}/shots`;

const pages = {
  a: `${ROOT}/index.html`,
  b: `${ROOT}/variants/b/index.html`,
  c: `${ROOT}/variants/c/index.html`,
  d: `${ROOT}/variants/d/index.html`,
};

const shots = [];
for (const [key, url] of Object.entries(pages)) {
  shots.push([`${key}-catalog`, url, '#catalog', 390, 844, false]);
  shots.push([`${key}-step`, url, '#step/0', 390, 844, false]);
  shots.push([`${key}-review`, url, '#review', 390, 1000, false]);
  shots.push([`${key}-success`, url, '#success', 390, 844, false]);
  shots.push([`${key}-admin`, url, '#admin', 390, 1000, false]);
  shots.push([`${key}-desktop`, url, '#catalog', 1440, 900, false]);
}

shots.push(['a-orders', pages.a, '#orders', 390, 844, false]);
shots.push(['a-order', pages.a, '#order/14', 390, 1000, false]);
shots.push(['a-order-cancelled', pages.a, '#order/13', 390, 1000, false]);
shots.push(['chooser', ROOT + '/variants/index.html', '', 1440, 1200, true]);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});

for (const [name, url, hash, width, height, full] of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url + hash, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: full });
  await page.close();
}

await browser.close();
console.log('shots done:', shots.length);
