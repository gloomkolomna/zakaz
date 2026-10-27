import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'file:///D:/Боты/СобериЗаказ/docs/design-preview/index.html';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.setViewport({ width: 390, height: 900 });

await page.goto(URL + '#orders', { waitUntil: 'load' });
const cards = await page.$$eval('.order-card', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));

await page.goto(URL + '#order/14', { waitUntil: 'load' });
await page.click('[data-cancel]');
const dialog = await page.$eval('.modal-card h2', (e) => e.textContent.trim());
await page.click('[data-confirm="yes"]');
const afterCancel = await page.$eval('.order-status', (e) => e.textContent.replace(/\s+/g, ' ').trim());
const cancelButton = await page.$('[data-cancel]');

await page.goto(URL + '#admin', { waitUntil: 'load' });
const alertBefore = await page.$('.alert');
const alertText = alertBefore ? await page.$eval('.alert-title', (e) => e.textContent.trim()) : null;
await page.click('[data-seen]');
const alertAfter = await page.$('.alert');

await page.goto(URL + '#review', { waitUntil: 'load' });
const totalBefore = await page.$eval('.total-value', (e) => e.textContent.trim());
await page.click('[data-remove="c501"]');
const totalAfterRemove = await page.$eval('.total-value', (e) => e.textContent.trim());
await page.click('.stepper.mini [data-qty="1"]');
const totalAfterPlus = await page.$eval('.total-value', (e) => e.textContent.trim());

await page.click('[data-act="submit"]');
await new Promise((r) => setTimeout(r, 200));
const success = await page.$eval('h1', (e) => e.textContent.trim());
await page.goto(URL + '#orders', { waitUntil: 'load' });
const cardsAfter = await page.$$eval('.order-card', (els) => els.length);

console.log(JSON.stringify({
  cards, dialog, afterCancel, cancelGone: !cancelButton,
  alertText, alertGone: !alertAfter,
  totalBefore, totalAfterRemove, totalAfterPlus,
  success, cardsAfter, errors,
}, null, 2));

await browser.close();
