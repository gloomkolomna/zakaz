import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'file:///D:/Боты/СобериЗаказ/docs/design-preview/index.html';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 900 });

await page.goto(URL + '#review', { waitUntil: 'load' });
const total0 = await page.$eval('.total-value', (e) => e.textContent.trim());

await page.click('[data-reselect="2"]');
const sheetTitle = await page.$eval('.sheet-card h2', (e) => e.textContent.trim());
const sheetCards = await page.$$eval('.sheet-card .pick', (els) => els.map((e) => e.querySelector('.pick-name').textContent.trim()));
await page.click('.sheet-card [data-pick="c303"]');
const total1 = await page.$eval('.total-value', (e) => e.textContent.trim());
await page.click('.sheet-card > .btn');
const sheetGone = !(await page.$('.sheet-card'));
const reviewText = await page.$eval('.page', (e) => e.textContent.replace(/\s+/g, ' ').trim());

await page.click('[data-reselect="0"]');
await page.click('.sheet-card [data-pick="c102"]');
const total2 = await page.$eval('.total-value', (e) => e.textContent.trim());
await page.click('.sheet-card [data-close-sheet]');

await page.click('[data-remove="c102"]');
const missing = await page.$$eval('.empty', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const submitDisabled = await page.$eval('[data-act="submit"]', (b) => b.disabled);

console.log(JSON.stringify({ total0, sheetTitle, sheetCards, total1, sheetGone, hasBlackFrame: reviewText.includes('Чёрная рама'), total2, missing, submitDisabled, errors }, null, 2));
await browser.close();
