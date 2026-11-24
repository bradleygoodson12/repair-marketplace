// Renders video.html to MP4 frame-by-frame.
//   node render.js                 -> out/repair-bee-explainer-clean.mp4 (no captions)
//   node render.js --stills 3,20   -> out/still-3.png ... (quick visual check)
// Needs: Playwright + Chromium, ffmpeg. Serves this folder on a local port
// because the page fetch()es timeline.json.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DIR = __dirname;
const OUT = path.join(DIR, 'out');
const FPS = 30;
const WORKERS = Number(process.env.WORKERS || 4);
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIR) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/video.html`);
  const dur = await page.evaluate(() => window.__ready);
  await page.evaluate(() => document.fonts.ready);
  return { page, dur };
}

async function main() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  const stillsArg = process.argv.indexOf('--stills');
  if (stillsArg > -1) {
    const { page } = await openPage(browser, port);
    for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
      await page.evaluate((t) => seek(t), t);
      await page.screenshot({ path: path.join(OUT, `still-${t}.png`) });
    }
  } else {
    const { dur } = await openPage(browser, port).then(async (x) => { await x.page.close(); return x; });
    const total = Math.ceil(dur * FPS);
    const per = Math.ceil(total / WORKERS);
    const t0 = Date.now();
    let done = 0;
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const from = w * per, to = Math.min(total, from + per);
      const { page } = await openPage(browser, port);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(OUT, `seg-${w}.mp4`)],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = from; f < to; f++) {
        await page.evaluate((t) => seek(t), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (++done % 300 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
    }));
    fs.writeFileSync(path.join(OUT, 'segs.txt'), Array.from({ length: WORKERS }, (_, w) => `file 'seg-${w}.mp4'`).join('\n'));
    await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segs.txt'),
      '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'repair-bee-explainer-clean.mp4')], { stdio: 'inherit' }).on('close', r));
    for (let w = 0; w < WORKERS; w++) fs.unlinkSync(path.join(OUT, `seg-${w}.mp4`));
    fs.unlinkSync(path.join(OUT, 'segs.txt'));
    console.log(`done: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
