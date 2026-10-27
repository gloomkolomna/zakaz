import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'D:/Боты/СобериЗаказ/docs/design-preview';
const pages = {
  a: `${ROOT}/index.html`,
  b: `${ROOT}/variants/b/index.html`,
  c: `${ROOT}/variants/c/index.html`,
  d: `${ROOT}/variants/d/index.html`,
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

for (const [key, url] of Object.entries(pages)) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setViewport({ width: 390, height: 844 });

  await page.goto(url + '#step/0', { waitUntil: 'load' });
  await page.click('.pick');
  const afterPick = await page.$eval('.btn', (b) => b.textContent.trim());
  await page.click('[data-act="next"]');
  await new Promise((r) => setTimeout(r, 150));
  const onStep2 = await page.$eval('h1', (h) => h.textContent.trim());
  await page.goto(url + '#review', { waitUntil: 'load' });
  const total = await page.$eval('.total-value', (n) => n.textContent.trim());
  await page.click('[data-act="submit"]');
  await new Promise((r) => setTimeout(r, 150));
  const success = await page.$eval('h1', (h) => h.textContent.trim());
  const unread = await page.evaluate(async (u) => {
    const p = document.createElement('iframe');
    p.src = u + '#admin';
    document.body.appendChild(p);
    return true;
  }, url);

  console.log(key, JSON.stringify({ afterPick, onStep2, total, success, errors }));
  await page.close();
}

await browser.close();
