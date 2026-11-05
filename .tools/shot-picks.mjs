import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'D:/Боты/СобериЗаказ/docs/design-preview/pick-v2';
const OUT = 'D:/Боты/СобериЗаказ/docs/shots';

const shots = [
  ['pick-v2-current-390', `${ROOT}/current.html`, 390, 844, false],
  ['pick-v2-rows-390', `${ROOT}/rows.html`, 390, 895, false],
  ['pick-v2-rows-630', `${ROOT}/rows.html`, 630, 830, false],
  ['pick-v2-rows-1000', `${ROOT}/rows.html`, 1000, 836, false],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});

const report = [];
for (const [name, url, width, height, full] of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(`file:///${url}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    height: document.documentElement.scrollHeight,
    rows: [...document.querySelectorAll('.pick-row')].map((row) => Math.round(row.getBoundingClientRect().height)),
  }));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  report.push({ name, ...metrics });
  await page.close();
}

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 895, deviceScaleFactor: 2 });
await page.goto(`file:///${ROOT}/rows.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));
await page.click('.pick-thumb');
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/pick-v2-photo-390.png`, fullPage: false });
await page.close();

await browser.close();
console.log(JSON.stringify(report, null, 2));
