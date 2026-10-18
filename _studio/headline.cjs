// one-off: the hero headline as a live signal
const fs = require('fs'), path = require('path'); const f = path.join(__dirname, '..', 'client', 'index.html'); let s = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const r = (a, b) => { if (!s.includes(a)) throw new Error('miss ' + a.slice(0, 60)); s = s.replace(a, b); };
r(`.hero h1{font-size:clamp(50px,7.6vw,118px)}.hero h1 span{color:var(--tom)}`, `.hero h1{font-size:clamp(50px,7.8vw,124px);line-height:.98;position:relative;display:inline-block}
.kick{display:inline-flex;align-items:center;gap:12px;font-family:var(--mono);font-size:12px;letter-spacing:.22em;color:#cfc5af;border:1.5px solid #3a3229;border-radius:99px;padding:8px 16px;background:#0f0d0b}
.vu{display:inline-flex;gap:3px;align-items:flex-end;height:14px}.vu i{width:3px;background:var(--min);border-radius:1px;animation:vu .9s ease-in-out infinite}.vu i:nth-child(2){animation-delay:.15s;background:var(--mus)}.vu i:nth-child(3){animation-delay:.3s;background:var(--tom)}.vu i:nth-child(4){animation-delay:.45s}
@keyframes vu{0%,100%{height:3px}50%{height:14px}}
.l1{display:block;color:var(--panel)}.l1 .that{color:transparent;-webkit-text-stroke:2px #cfc5af;font-style:normal}
/* "play": the signal itself: cable colours flowing through the letters, glowing, with a cable plugged in */
.play{position:relative;display:inline-block;background:linear-gradient(90deg,#ff5a36,#ffc12e,#19c98a,#2f6bff,#ff4fa3,#ff5a36);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:flow 6s linear infinite;filter:drop-shadow(0 0 18px rgba(255,90,54,.35))}
@keyframes flow{to{background-position:300% 0}}
.plug{position:absolute;right:-.62em;top:-.42em;width:.9em;height:.9em;overflow:visible;pointer-events:none}
/* "themselves": letters ride a travelling wave; the full stop is an LED */
.l2{display:block;color:var(--panel);white-space:nowrap}.l2 .ch{display:inline-block;animation:wave 2.6s ease-in-out infinite}
@keyframes wave{0%,100%{transform:translateY(0)}25%{transform:translateY(-.06em)}50%{transform:translateY(0)}}
.dot{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:var(--min);box-shadow:0 0 .12em var(--min),0 0 .4em var(--min);margin-left:.04em;animation:ledp 1.6s ease-in-out infinite;vertical-align:baseline}
@keyframes ledp{50%{opacity:.35;box-shadow:0 0 .05em var(--min)}}
.scope{display:block;width:min(820px,92%);height:46px;margin:14px auto 0;overflow:visible}
.scope path{fill:none;stroke:#9cf7c6;stroke-width:2;filter:drop-shadow(0 0 4px rgba(25,201,138,.8))}
.now{font-family:var(--mono);font-size:14px;color:#9cf7c6;margin-top:10px;min-height:20px;text-shadow:0 0 6px rgba(25,201,138,.5)}.now b{color:var(--mus);font-weight:500}`);
r(` <div><div class="silk" style="color:#8d8372">// autoplay · on pump.fun</div>
  <h1 class="disp" style="margin-top:16px">Coins that <span>play</span><br>themselves.</h1>`,
 ` <div><div class="kick"><span class="vu"><i></i><i></i><i></i><i></i></span>NOW PLAYING ON PUMP.FUN</div><br>
  <h1 class="disp" style="margin-top:22px"><span class="l1">Coins <em class="that">that</em> <span class="play">play<svg class="plug" viewBox="0 0 100 100"><path d="M10 92 C 10 40, 70 70, 80 -40" stroke="#0008" stroke-width="16" fill="none" transform="translate(3,4)"/><path d="M10 92 C 10 40, 70 70, 80 -40" stroke="#ff5a36" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M10 92 C 10 40, 70 70, 80 -40" stroke="#fff6" stroke-width="4" fill="none" transform="translate(-2,-3)"/><circle cx="10" cy="92" r="15" fill="#d6cdb9" stroke="#77705f" stroke-width="5"/><circle cx="10" cy="92" r="6" fill="#0d0b09"/></svg></span></span><span class="l2" id="l2">themselves</span></h1>
  <svg class="scope" viewBox="0 0 820 46" preserveAspectRatio="none"><path id="scope"/></svg>
  <div class="now" id="now"></div>`);
r(`heroLayout();`, `// headline: wave the letters of "themselves", end on an LED
$('l2').innerHTML = [...'themselves'].map((c, i) => \`<span class="ch" style="animation-delay:\${i * .09}s">\${c}</span>\`).join('') + '<span class="dot"></span>';
// oscilloscope trace under the headline: a travelling signal with a pulse running through it
(function scope() { const p = $('scope'); let t0 = performance.now(); const draw = () => { const t = (performance.now() - t0) / 1000; let d = 'M0 23';
  for (let x = 0; x <= 820; x += 6) { const ph = x / 820, pulse = Math.exp(-Math.pow(((ph - ((t * .35) % 1.4) + .2)) * 9, 2)); d += ' L' + x + ' ' + (23 + Math.sin(x / 22 - t * 5) * 4 * (1 - pulse) - pulse * 18 * Math.sin(x / 6)).toFixed(1); }
  p.setAttribute('d', d); }; setInterval(draw, 40); draw(); })();
// "now playing": types out real patches, one after another
(function now() { const P = ['fees in → buy back 50% → burn it → airdrop top 20', 'every 6h → pay one random holder', 'mcap passes $100k → burn 50% of held', 'fees in → buy TSLA with half → airdrop the rest', 'price −20% in 1h → buy the dip'];
  let k = 0, c = 0, hold = 0; setInterval(() => { const line = P[k]; if (c < line.length) c += 1; else if (++hold > 40) { hold = 0; c = 0; k = (k + 1) % P.length; }
    $('now').innerHTML = '<b>▶ now playing</b> · ' + esc(line.slice(0, c)) + '<span class="cur"></span>'; }, 45); })();
heroLayout();`);
fs.writeFileSync(f, s); console.log('ok');
