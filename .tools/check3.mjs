import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'file:///D:/Боты/СобериЗаказ/docs/design-preview/index.html';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 900 });

await page.goto(URL + '#orders', { waitUntil: 'load' });
const buyerQueues = await page.$$eval('.oc-queue', (els) => els.map((e) => e.textContent.trim()));

await page.goto(URL + '#order/14', { waitUntil: 'load' });
const detailQueue = await page.$eval('.queue-line', (e) => e.textContent.trim());

await page.goto(URL + '#admin', { waitUntil: 'load' });
const qnums = await page.$$eval('.qnum', (els) => els.map((e) => e.textContent.trim()));
const summary = await page.$$eval('.summary-v', (els) => els.map((e) => e.textContent.trim()));

await page.click('[data-done="14"]');
const qAfter = await page.$$eval('.qnum', (els) => els.map((e) => e.textContent.trim()));

await page.goto(URL + '#order/14', { waitUntil: 'load' });
const doneStatus = await page.$eval('.order-status', (e) => e.textContent.trim());
const doneNote = await page.$eval('.cancelled-note', (e) => e.textContent.trim());
const queueLineGone = await page.$('.queue-line');

await page.goto(URL + '#review', { waitUntil: 'load' });
await page.click('[data-act="submit"]');
await new Promise((r) => setTimeout(r, 200));
const success = await page.$eval('.done-wrap p', (e) => e.textContent.trim());

console.log(JSON.stringify({ buyerQueues, detailQueue, qnums, summary, qAfter, doneStatus, doneNote, queueLineGone: !queueLineGone, success, errors }, null, 2));
await browser.close();
