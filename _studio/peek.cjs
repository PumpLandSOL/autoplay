// node peek.cjs <path> <out.png> [width] [height] [js-to-run-before-shot]
const { open, sleep } = require('./cdp.cjs'); const [, , p, out, W = 1440, H = 1000, js] = process.argv;
(async () => { const c = await open((process.env.BASE || 'http://localhost:8258') + p, +W, +H, 9800 + Math.floor(Math.random() * 150)); await c.send('Page.navigate', { url: (process.env.BASE || 'http://localhost:8258') + p }); await sleep(4000); if (js) { console.log(await c.ev(js)); await sleep(1500); } await c.shot(out); c.close(); })();
