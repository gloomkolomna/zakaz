import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API = 'http://127.0.0.1:8006/api';

const session = await fetch(`${API}/auth/session`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ params: { vk_user_id: '123' } }),
}).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (request.url().endsWith('/zakaz/api/auth/session')) {
    request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: session.token, vk_id: 123, role: 'player' }),
    });
    return;
  }
  request.continue();
});

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5177/zakaz/product/2', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Ночной сад'));
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 300));
const data = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent,
  button: document.querySelector('.blocked-cta .btn')?.textContent,
  disabled: document.querySelector('.blocked-cta .btn')?.hasAttribute('disabled'),
  note: document.querySelector('.blocked-note')?.textContent,
  early: document.querySelector('.early-note')?.textContent,
  badge: document.querySelector('.early-badge')?.textContent,
  overflowX: document.documentElement.scrollWidth > window.innerWidth,
}));
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/stage3-early-blocked-390.png' });
console.log(JSON.stringify({ ...data, errors }, null, 2));
await browser.close();
