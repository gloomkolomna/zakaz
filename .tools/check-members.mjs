import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:5177/zakaz/';
const OUT = 'D:/Боты/СобериЗаказ/docs/shots';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (request.url().endsWith('/zakaz/api/auth/session')) {
    request.respond({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: {
          code: 'members_only',
          message: 'Приложение доступно только подписчикам сообщества',
        },
      }),
    });
    return;
  }
  request.continue();
});

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForFunction(
  () => document.querySelector('h1')?.textContent === 'Только для подписчиков',
  { timeout: 10000 },
);
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 300));

const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  overflowX: document.documentElement.scrollWidth > window.innerWidth,
  title: document.querySelector('h1')?.textContent,
  buttons: [...document.querySelectorAll('.notice-actions .btn')].map((b) => b.textContent?.trim()),
  link: document.querySelector('.notice-actions a')?.getAttribute('href'),
}));

await page.screenshot({ path: `${OUT}/stage0-members-390.png` });
await browser.close();
console.log(JSON.stringify({ ...metrics, errors }, null, 2));
