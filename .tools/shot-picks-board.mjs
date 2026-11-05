import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1180, height: 1200, deviceScaleFactor: 1 });
await page.goto('file:///D:/Боты/СобериЗаказ/docs/design-preview/pick-v2/index.html', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));
const height = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewport({ width: 1180, height, deviceScaleFactor: 1 });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'D:/Боты/СобериЗаказ/docs/shots/pick-v2-board.png', fullPage: false });
console.log(height);
await browser.close();
