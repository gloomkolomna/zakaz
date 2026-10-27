import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:5177/zakaz/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const errors = [];
const statuses = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (response) => {
  if (response.url().includes('/zakaz/api/')) {
    statuses.push(`${response.status()} ${new URL(response.url()).pathname}`);
  }
});

await page.setViewport({ width: 390, height: 844 });
await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForFunction(
  () => document.querySelector('h1')?.textContent === 'Наборы для вышивки',
  { timeout: 20000 },
);

const before = await page.evaluate(() => localStorage.getItem('token'));
await page.evaluate(() => localStorage.setItem('token', 'broken-token'));
await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForFunction(
  () => document.querySelector('h1')?.textContent === 'Наборы для вышивки',
  { timeout: 20000 },
);
const after = await page.evaluate(() => localStorage.getItem('token'));

await browser.close();
console.log(JSON.stringify({
  tokenBefore: Boolean(before),
  tokenReplaced: after !== 'broken-token' && Boolean(after),
  unauthorizedCalls: statuses.filter((s) => s.startsWith('401')),
  errors,
}, null, 2));
