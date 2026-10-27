import puppeteer from 'puppeteer-core';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'D:/Боты/СобериЗаказ/docs/store';
const TMP = `${OUT}/.preview`;
const data = JSON.parse(await readFile(`${OUT}/lottie/zakaz-loader.json`, 'utf8'));

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 96, height: 96, deviceScaleFactor: 4 });
await page.setContent('<!doctype html><html><body style="margin:0;background:#f4f5f1"><div id="c" style="width:96px;height:96px"></div></body></html>');
await page.addScriptTag({ path: 'D:/Боты/СобериЗаказ/.tools/node_modules/lottie-web/build/player/lottie.min.js' });
await page.evaluate((animationData) => {
  window.__anim = window.lottie.loadAnimation({
    container: document.getElementById('c'),
    renderer: 'svg',
    loop: true,
    autoplay: false,
    animationData,
  });
  window.__anim.goToAndStop(0, true);
}, data);
await new Promise((r) => setTimeout(r, 600));

const order = [...Array(90).keys()].slice(6).concat([...Array(90).keys()].slice(0, 6));
let idx = 0;
for (const f of order) {
  await page.evaluate((frame) => window.__anim.goToAndStop(frame, true), f);
  await new Promise((r) => setTimeout(r, 15));
  await page.screenshot({ path: `${TMP}/f${String(idx).padStart(3, '0')}.png` });
  idx += 1;
}
await browser.close();

const py = 'D:/Боты/СобериЗаказ/api/venv/Scripts/python.exe';
execFileSync(py, ['-c', `
from PIL import Image
import glob
files = sorted(glob.glob(r'${TMP}/f*.png'))
frames = [Image.open(f).convert('RGB').resize((192, 192), Image.LANCZOS) for f in files]
frames[0].save(r'${OUT}/lottie-preview.gif', save_all=True, append_images=frames[1:], duration=33, loop=0, optimize=False, disposal=2)
print(len(frames), 'frames')
`], { stdio: 'inherit' });

await rm(TMP, { recursive: true, force: true });
