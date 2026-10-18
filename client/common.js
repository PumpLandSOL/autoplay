// shared: nav/footer, Phantom wallet, base58, the launch-funding transaction (transfer + memo), canonical patch hash
const LOGO = '<svg viewBox="0 0 40 40"><rect x="3" y="5" width="34" height="30" rx="4" fill="#ece4d2"/><circle cx="12" cy="14" r="4" fill="#1b1712"/><circle cx="28" cy="14" r="4" fill="#1b1712"/><circle cx="12" cy="27" r="4" fill="#1b1712"/><circle cx="28" cy="27" r="4" fill="#1b1712"/><path d="M12 14C12 24 28 18 28 27" stroke="#ff5a36" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M28 14C28 22 12 20 12 27" stroke="#2f6bff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
const CABLES = ['#ff5a36', '#2f6bff', '#ffc12e', '#19c98a', '#ff4fa3', '#8c5cff'];
function chrome(active) {
  const n = document.createElement('nav'); n.className = 'top';
  n.innerHTML = `<div class="wrap"><a class="brand" href="/">${LOGO}AUTOPLAY</a><div class="links">${[['/build', 'Build'], ['/coins', 'Coins'], ['/me', 'My coins'], ['/docs', 'Docs']].map(([h, l]) => `<a href="${h}" class="${active === h ? 'on' : ''}">${l}</a>`).join('')}</div><div class="sp"></div><button class="btn dark" id="wbtn" onclick="connect()">Connect</button><a class="btn hot" href="/build">Launch</a></div>`;
  document.body.prepend(n);
  const COLS = [['Platform', [['Builder', '/build'], ['Quick launch', '/#quick'], ['Explore', '/coins'], ['Flywheel', '/docs#flywheel'], ['My coins', '/me'], ['Brand', '/docs#brand']]],
    ['Build with', [['Examples', '/#recipes'], ['Modules', '/docs#modules'], ['Stock rules', '/docs#stocks'], ['Rules gallery', '/docs#gallery'], ['Embed', '/docs#embed']]],
    ['Docs', [['Receipts', '/docs#receipts'], ['Verify on Solana', '/docs#verify'], ['Vault', '/docs#vault'], ['FAQ', '/#faq'], ['Launching', '/docs#launching']]],
    ['Legal', [['Terms', '/docs#terms'], ['Risks', '/docs#risks'], ['Privacy', '/docs#privacy']]],
    ['Network', [['Solana', 'https://solana.com'], ['pump.fun', 'https://pump.fun'], ['Webhooks', '/docs#webhooks']]]];
  const f = document.createElement('footer'); f.innerHTML = `<div class="wrap fcols"><div class="fbrand"><span class="brand" style="font-size:16px">${LOGO}AUTOPLAY</span><p>Coins that play themselves. Launched on pump.fun, rules fingerprinted on Solana, every move on-chain.</p></div>${COLS.map(([h, ls]) => `<div class="fcol"><h5>${h}</h5>${ls.map(([t, u]) => `<a href="${u}"${/^https/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('')}</div>`).join('')}</div><div class="wrap fbar"><span>© ${new Date().getFullYear()} AUTOPLAY</span><span>no team tokens · no platform fee · every action has a receipt</span></div>`; document.body.append(f);
  try { const w = localStorage.getItem('pb_wallet'); if (w) setWallet(w); } catch {}
  const p = sol(); if (p && p.on) p.on('accountChanged', (k) => setWallet(k ? k.toString() : null));
}
const $ = (i) => document.getElementById(i);
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const short = (a, x = 4, y = 4) => (a ? a.slice(0, x) + '…' + a.slice(-y) : '');
const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
const solFmt = (l) => (l / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
const usd = (x) => !x ? '—' : '$' + (x >= 1e6 ? (x / 1e6).toFixed(2) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'K' : x.toFixed(0));
const tx = (s) => 'https://solscan.io/tx/' + s, acct = (a) => 'https://solscan.io/account/' + a;
function toast(m) { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); } t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200); }
const api = async (p, b) => { const r = await fetch(p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'request failed'); return j; };

// ---------- wallet ----------
let WALLET = null;
const sol = () => (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null) || window.solflare || null;
function setWallet(w) { WALLET = w; try { w ? localStorage.setItem('pb_wallet', w) : localStorage.removeItem('pb_wallet'); } catch {} const b = $('wbtn'); if (b) b.textContent = w ? short(w) : 'Connect'; document.dispatchEvent(new CustomEvent('wallet', { detail: w })); }
async function connect() { const p = sol();
  if (!p) { if (/Android|iPhone|iPad/i.test(navigator.userAgent)) { location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin); return null; } toast('Install Phantom (or Solflare) to connect'); return null; }
  try { const r = await p.connect(); setWallet(r.publicKey.toString()); return WALLET; } catch { toast('Connection rejected'); return null; } }

// ---------- base58 + the funding transaction ----------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58dec(s) { let n = 0n; for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) throw new Error('b58'); n = n * 58n + BigInt(i); } const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const ch of s) { if (ch === '1') out.unshift(0); else break; } return new Uint8Array(out); }
function b58enc(bytes) { let n = 0n; for (const x of bytes) n = n * 256n + BigInt(x); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const x of bytes) { if (x === 0) s = '1' + s; else break; } return s; }
// legacy message: [payer(signer,w), vault(w), System, Memo] → transfer(payer→vault) + memo(text, signed by payer)
function fundMessage(from, to, blockhash, lamports, memo) {
  const F = b58dec(from), T = b58dec(to), SYS = b58dec('11111111111111111111111111111111'), MEMO = b58dec('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), H = b58dec(blockhash);
  const data = new Uint8Array(12); new DataView(data.buffer).setUint32(0, 2, true); let v = BigInt(lamports); for (let i = 0; i < 8; i++) { data[4 + i] = Number(v & 255n); v >>= 8n; }
  const m = new TextEncoder().encode(memo);
  return new Uint8Array([1, 0, 2, 4, ...F, ...T, ...SYS, ...MEMO, ...H, 2, 2, 2, 0, 1, data.length, ...data, 3, 1, 0, m.length, ...m]);
}
async function sendFunding(vault, lamports, memo) {
  const p = sol(); const { blockhash } = await api('/api/blockhash');
  const r = await p.request({ method: 'signAndSendTransaction', params: { message: b58enc(fundMessage(WALLET, vault, blockhash, lamports, memo)) } }); return r.signature;
}

// ---------- canonical patch + SHA-256 (must match server/rules.js canon) ----------
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
async function sha256hex(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// ---------- patch drawing (shared by builder, coin page, home hero) ----------
const ICON = { fees: '◎', every: '◷', mcap: '⤒', pump: '↗', dump: '↘', buyback: '⟲', burn: '🔥', airdrop: '⇶', lottery: '⚄', stock: '▤', creator: '☺', keep: '▣' };
// read-only patch: trigger plates on top, action plates below, cables between (used on coin + verify pages)
const LBLS = { fees: 'Creator fees arrive', every: 'Every N hours', mcap: 'Market cap crosses', pump: 'Price jumps', dump: 'Price drops', buyback: 'Buy back', burn: 'Burn', airdrop: 'Airdrop holders', lottery: 'Pay a random holder', stock: 'Buy a stock', creator: 'Pay the creator', keep: 'Keep in vault' };
function paramLine(m) { const p = m.params || {}; return m.type === 'every' ? `every ${p.hours}h · ${p.pctOfVault}% of vault` : m.type === 'mcap' ? `$${(+p.usd).toLocaleString()} · ${p.pctOfVault}% of vault` : m.type === 'pump' ? `+${p.pct}% in 1h · ${p.pctOfVault}%` : m.type === 'dump' ? `−${p.pct}% in 1h · ${p.pctOfVault}%` : m.type === 'burn' ? `${p.pctOfHeld}% of held` : m.type === 'airdrop' ? `top ${p.top}, pro rata` : m.type === 'stock' ? p.ticker + 'x via Jupiter' : ''; }
function drawPatch(el, patch, flash = {}) {
  const W = el.clientWidth || 800, pw = (n) => Math.min(148, Math.floor(W / (n + 1) - 8)), PWt = pw(patch.triggers.length), PWa = pw(patch.actions.length), row = (list, y) => list.map((m, i) => ({ m, x: (W / (list.length + 1)) * (i + 1), y }));
  const T = row(patch.triggers, 20), A = row(patch.actions, 210), pos = new Map(T.concat(A).map((p) => [p.m.id, p]));
  let h = `<svg viewBox="0 0 ${W} 320" style="width:100%;height:320px;display:block">`;
  patch.wires.forEach((w, k) => { const a = pos.get(w.from), b = pos.get(w.to); if (!a || !b) return; const x1 = a.x, y1 = a.y + 74, x2 = b.x, y2 = b.y, c = CABLES[k % CABLES.length], d = `M${x1},${y1} C${x1},${y1 + 70} ${x2},${y2 - 60} ${x2},${y2}`;
    h += `<path d="${d}" stroke="#0008" stroke-width="9" fill="none" transform="translate(0,4)"/><path d="${d}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round" ${flash[w.to] ? 'class="flash"' : ''}/><path d="${d}" stroke="#fff5" stroke-width="2" fill="none" transform="translate(-1,-2)"/>`;
    if (w.share) h += `<g transform="translate(${(x1 + x2) / 2},${(y1 + y2) / 2 + (k % 2) * 22 - 8})"><rect x="-22" y="-11" width="44" height="22" rx="11" fill="#ece4d2" stroke="${c}" stroke-width="2.5"/><text text-anchor="middle" y="5" font-family="IBM Plex Mono" font-weight="600" font-size="12" fill="#1b1712">${w.share}%</text></g>`; });
  for (const p of T.concat(A)) { const isT = patch.triggers.includes(p.m), lit = flash[p.m.id], PW = isT ? PWt : PWa;
    h += `<g transform="translate(${p.x - PW / 2},${p.y})"><rect width="${PW}" height="${isT ? 74 : 92}" rx="6" fill="#ece4d2" stroke="#0004"/><circle cx="12" cy="12" r="4" fill="#9a8f7c"/><circle cx="${PW - 12}" cy="12" r="4" fill="#9a8f7c"/><circle cx="28" cy="12" r="4.5" fill="${lit ? (isT ? '#ff3b1f' : '#19c98a') : '#5a1d12'}"/>
      <text x="12" y="${isT ? 36 : 44}" font-family="Unbounded" font-weight="700" font-size="${PW < 130 ? 10 : 12}" fill="#1b1712">${ICON[p.m.type]} ${LBLS[p.m.type]}</text><text x="12" y="${isT ? 54 : 62}" font-family="IBM Plex Mono" font-size="${PW < 130 ? 8.5 : 10}" fill="#5b5246">${esc(paramLine(p.m))}</text>
      <circle cx="${PW / 2}" cy="${isT ? 74 : 0}" r="9" fill="#d6cdb9" stroke="#77705f" stroke-width="3"/><circle cx="${PW / 2}" cy="${isT ? 74 : 0}" r="4" fill="#0d0b09"/></g>`; }
  el.innerHTML = h + '</svg>'; }
