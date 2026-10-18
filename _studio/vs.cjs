// AUTOPLAY vs launchpads: per-coin feature checklist + each launchpad token's ATH fully diluted value → brand/autoplay-vs.png
'use strict';
const fs = require('fs'), path = require('path'); const { open, sleep } = require('./cdp.cjs');
const style = fs.readFileSync(path.join(__dirname, 'src', 'autoplay-keyart.html'), 'utf8').match(/<style>[\s\S]*?<\/style>/)[0];
const cols = [['AUTOPLAY', '$AUTO', true], ['pump.fun', '$PUMP'], ['letsbonk.fun', '$BONK'], ['Virtuals', '$VIRTUAL'], ['Zora', '$ZORA']];
const rows = ['Coin spends its own creator fees by rules', 'Per-coin buybacks + burns', 'Holder airdrops + random-holder payouts', 'Buys tokenized stocks (xStocks)', 'Rules fingerprinted on Solana', 'Receipt for every action', 'Patch builder + one-line launch', 'No platform fee'];
// CoinGecko, Oct 18 2026: ATH price × max supply
const ath = [null, '$8.82B', '$5.13B', '$5.07B', '$1.46B'];
const g = 'display:grid;grid-template-columns:620px repeat(5,1fr);align-items:center';
const head = `<div style="${g};padding-bottom:14px;border-bottom:3px solid #1b1712"><span></span>${cols.map(([n, t, me]) => `<div style="text-align:center;${me ? 'background:#14110e;color:#ece4d2;border-radius:10px;padding:12px 0' : 'padding:12px 0'}"><div class="d" style="font-size:30px;letter-spacing:-.02em">${n}</div><div class="m" style="font-size:18px;opacity:.7;margin-top:4px">${t}</div></div>`).join('')}</div>`;
const body = rows.map((r) => `<div style="${g};padding:12px 0;border-bottom:1.5px solid #cfc5af"><span style="font-size:27px;font-weight:600">${r}</span>${cols.map((c) => `<span style="text-align:center;font-size:38px;font-weight:900;color:${c[2] ? '#0f9a68' : '#c4321a'}">${c[2] ? '✓' : '✗'}</span>`).join('')}</div>`).join('');
const foot = `<div style="${g};padding:18px 0 4px"><span style="font-size:27px;font-weight:700">Token ATH, fully diluted</span>${ath.map((a, i) => `<span class="d" style="text-align:center;font-size:${i ? 34 : 24}px;${i ? '' : 'color:#0f9a68'}">${a || 'launching'}</span>`).join('')}</div>`;
const html = `<!doctype html><meta charset="utf-8">${style}<body style="width:2400px;height:1350px">
<div style="position:absolute;left:100px;right:100px;top:64px;text-align:center"><div class="k" style="font-size:26px">// the launchpad checklist</div><div class="d" style="font-size:80px;margin-top:12px">They launch coins. <span class="play">Ours play.</span></div>
<div class="plate" style="margin-top:38px;padding:34px 40px 26px;text-align:left">${head}${body}${foot}</div>
<div class="m" style="font-size:19px;color:#a89d88;margin-top:18px;text-align:left">Features compared per coin, as offered to every coin a launchpad lists. ATH fully diluted value = all-time-high price × max supply, CoinGecko, Oct 18 2026. $BONK is the token of the letsbonk.fun ecosystem.</div></div></body>`;
(async () => { const f = path.join(__dirname, 'src', 'autoplay-vs.html'); fs.writeFileSync(f, html);
  const c = await open('file:///' + f.split(path.sep).join('/'), 2400, 1350, 9950); await sleep(2800); await c.ev('document.fonts.ready.then(()=>1)'); await sleep(600);
  await c.shot(path.join(__dirname, '..', 'brand', 'autoplay-vs.png')); c.close(); console.log('rendered autoplay-vs'); })();
