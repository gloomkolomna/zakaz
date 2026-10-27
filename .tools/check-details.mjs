import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5177/zakaz/product/1', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Цветение'));
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 300));
const desktop = await page.evaluate(() => {
  const hero = document.querySelector('.hero')?.getBoundingClientRect();
  const head = document.querySelector('.product-head')?.getBoundingClientRect();
  return {
    sideBySide: hero && head ? hero.right <= head.left + 1 : null,
    heroHeight: hero?.height,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
  };
});
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/stage4-product-1000.png' });
await page.click('.hero .image-button');
await page.waitForSelector('.zoom-modal', { timeout: 3000 });
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/stage4-zoom-1000.png' });
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.zoom-modal'));

await page.setViewport({ width: 630, height: 600, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5177/zakaz/product/1/build', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Размер');
await page.click('.pick');
await page.click('.bar .btn');
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Основа');
await page.click('.pick');
await page.click('.bar .btn');
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Упаковка');
await page.click('.pick');
await page.click('.bar .btn');
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Ваш заказ');
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 300));
const review = await page.evaluate(() => {
  const bar = document.querySelector('.bar')?.getBoundingClientRect();
  return {
    barBottom: bar?.bottom,
    viewport: window.innerHeight,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
  };
});
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/stage4-review-630.png' });

await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5177/zakaz/admin/sections', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Управление');
await page.waitForSelector('.admin-list');
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/stage4-admin-sections-1000.png' });
const tabs = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.admin-tab')];
  return { count: links.length, lastRight: links.at(-1)?.getBoundingClientRect().right, width: window.innerWidth };
});

console.log(JSON.stringify({ desktop, review, tabs, errors }, null, 2));
await browser.close();
