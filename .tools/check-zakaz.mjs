import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:5177/zakaz/';
const OUT = 'D:/Боты/СобериЗаказ/docs/shots';

mkdirSync(OUT, { recursive: true });

const viewports = [
  [360, 640],
  [390, 844],
  [430, 932],
  [630, 600],
  [768, 700],
  [1000, 700],
  [1000, 4050],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--disable-dev-shm-usage'],
});

const report = [];

for (const [width, height] of viewports) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'Наборы для вышивки',
    { timeout: 20000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const metrics = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const header = document.querySelector('.topbar');
    const menu = document.querySelector('.icon-btn');
    const rect = menu?.getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      appWidth: document.querySelector('.app')?.getBoundingClientRect().width,
      h1: h1?.textContent,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      bodyFont: getComputedStyle(document.body).fontFamily,
      headerHeight: header?.getBoundingClientRect().height,
      menu: rect ? { width: rect.width, height: rect.height } : null,
      literata: document.fonts.check('600 32px Literata'),
      golos: document.fonts.check('400 15px "Golos Text"'),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  await page.screenshot({ path: `${OUT}/stage0-catalog-${width}.png` });

  if (width === 390) {
    await page.click('button[aria-label="Меню"]');
    await page.waitForSelector('.menu-sheet', { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const menuVisible = await page.evaluate(() => {
      const sheet = document.querySelector('.menu-sheet');
      if (!sheet) return false;
      const rect = sheet.getBoundingClientRect();
      const links = [...document.querySelectorAll('.menu-link')].map((a) => a.textContent);
      return {
        covered: rect.width === window.innerWidth && rect.height === window.innerHeight,
        links,
      };
    });
    await page.screenshot({ path: `${OUT}/stage0-menu-390.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.menu-sheet'), { timeout: 3000 });
    report.push({ width, height, ...metrics, menuVisible, errors });
  } else {
    report.push({ width, height, ...metrics, errors });
  }

  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
