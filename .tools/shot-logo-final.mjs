import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'D:/Боты/СобериЗаказ/docs/design-preview';
const svg = await (await import('node:fs/promises')).readFile(ROOT + '/logo.svg', 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#f4f5f1;font-family:sans-serif;display:flex;align-items:center;gap:40px;padding:28px 32px}
.big svg{width:128px;height:128px}.small{display:flex;flex-direction:column;gap:10px;align-items:center;color:#68716a;font-size:12px}
.row{display:flex;gap:24px;align-items:flex-end}
</style></head><body>
<div class="big">${svg}</div>
<div class="row">
<div class="small">22${svg}</div><div class="small">32${svg}</div><div class="small">48${svg}</div>
</div>
</body></html>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 560, height: 200, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: ROOT + '/shots/logo-final.png', fullPage: true });
console.log('ok');
await browser.close();
