import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'D:/Боты/СобериЗаказ/docs/store';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 32, height: 32, deviceScaleFactor: 8 });
await page.goto(`file:///${OUT}/favicon.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${OUT}/favicon-32@8x.png`, clip: { x: 0, y: 0, width: 32, height: 32 } });
await browser.close();
console.log('favicon raw done');
