import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'D:/Боты/СобериЗаказ/docs/store';
const data = JSON.parse(await readFile(`${OUT}/lottie/zakaz-loader.json`, 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 96, height: 96, deviceScaleFactor: 4 });
await page.setContent('<!doctype html><html><body style="margin:0;background:#f4f5f1"><div id="c" style="width:96px;height:96px"></div></body></html>');
await page.addScriptTag({ path: 'D:/Боты/СобериЗаказ/.tools/node_modules/lottie-web/build/player/lottie.min.js' });
const errors = await page.evaluate((animationData) => {
  const errs = [];
  try {
    const anim = window.lottie.loadAnimation({
      container: document.getElementById('c'),
      renderer: 'svg',
      loop: true,
      autoplay: false,
      animationData,
    });
    window.__anim = anim;
    anim.addEventListener('DOMLoaded', () => { window.__ready = true; });
    anim.goToAndStop(0, true);
  } catch (e) {
    errs.push(String(e));
  }
  return errs;
}, data);

await new Promise((r) => setTimeout(r, 600));
const ready = await page.evaluate(() => Boolean(window.__ready));
const frames = [0, 10, 25, 40, 60];
for (const f of frames) {
  await page.evaluate((frame) => window.__anim.goToAndStop(frame, true), f);
  await new Promise((r) => setTimeout(r, 120));
  await page.screenshot({ path: `${OUT}/raw/lottie-frame-${f}.png` });
}

const svg = await page.evaluate(() => document.querySelector('#c svg')?.outerHTML?.length || 0);
console.log(JSON.stringify({ ready, errors, svgLength: svg }, null, 2));
await browser.close();
