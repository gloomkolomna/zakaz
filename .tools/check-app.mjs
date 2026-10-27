import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:5177/zakaz';
const OUT = 'D:/Боты/СобериЗаказ/docs/shots';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const report = [];

async function metrics(name) {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const data = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    h1: document.querySelector('h1')?.textContent || '',
  }));
  report.push({ name, ...data });
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function h1(text) {
  await page.waitForFunction(
    (expected) => document.querySelector('h1')?.textContent?.includes(expected),
    { timeout: 15000 },
    text,
  );
}

async function adminReady(selector) {
  await h1('Управление');
  if (selector) {
    await page.waitForSelector(selector, { timeout: 15000 });
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
}

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
await h1('Наборы для вышивки');
await metrics('stage1-catalog-390');

await page.click('a.product');
await h1('Трекер на год');
await metrics('stage1-product-390');

await page.click('.blocked-cta .btn');
await h1('Размер');
await metrics('stage1-builder-390');

await page.click('.pick');
await page.click('.bar .btn');
await h1('Основа');
await page.click('.pick');
await page.click('.bar .btn');
await h1('Упаковка');
await page.click('.pick');
await page.click('.bar .btn');
await h1('Ваш заказ');
await metrics('stage1-review-390');

await page.click('.bar .btn');
await page.waitForFunction(
  () => document.querySelector('h1')?.textContent?.startsWith('Заказ №'),
  { timeout: 15000 },
);
await metrics('stage1-success-390');

await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle2' });
await h1('Мои заказы');
await metrics('stage1-orders-390');

await page.goto(`${BASE}/orders/1`, { waitUntil: 'networkidle2' });
await h1('Заказ №1');
await metrics('stage1-order-detail-390');

await page.goto(`${BASE}/info`, { waitUntil: 'networkidle2' });
await h1('Информация');
await metrics('stage1-info-390');

await page.goto(`${BASE}/admin/sections`, { waitUntil: 'networkidle2' });
await adminReady('.admin-list');
await metrics('stage1-admin-sections-390');

await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
await adminReady('.admin-form');
await metrics('stage1-admin-products-390');

await page.goto(`${BASE}/admin/products/1`, { waitUntil: 'networkidle2' });
await adminReady('.admin-step');
await metrics('stage1-admin-product-edit-390');

await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
await adminReady('.summary');
await metrics('stage1-admin-orders-390');

await page.goto(`${BASE}/admin/players`, { waitUntil: 'networkidle2' });
await adminReady('.admin-list');
await metrics('stage1-admin-players-390');

await page.goto(`${BASE}/admin/texts`, { waitUntil: 'networkidle2' });
await adminReady('textarea');
await metrics('stage1-admin-texts-390');

await page.goto(`${BASE}/admin/logs`, { waitUntil: 'networkidle2' });
await adminReady();
await new Promise((resolve) => setTimeout(resolve, 600));
await metrics('stage1-admin-logs-390');

await page.setViewport({ width: 630, height: 600, deviceScaleFactor: 2 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
await h1('Наборы для вышивки');
await metrics('stage1-catalog-630');

await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
await adminReady('.summary');
await metrics('stage1-admin-orders-630');

await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
await h1('Наборы для вышивки');
await metrics('stage1-catalog-1000');

await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
await adminReady('.summary');
await metrics('stage1-admin-orders-1000');

await browser.close();
console.log(JSON.stringify({ report, errors }, null, 2));
