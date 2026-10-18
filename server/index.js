// AUTOPLAY: patch a coin together, it plays itself.
// A patch (triggers → wires → actions) is fingerprinted, signed on-chain by the creator, and run forever by the coin's own
// vault: a keypair that is the coin's pump.fun creator, so creator fees land in it and pay for every rule.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const S = require('./sol'), C = require('./chain'), R = require('./rules');

const PORT = +process.env.PORT || 8258, DIR = process.env.DATA_PATH || path.join(__dirname, '..', 'data'), CLIENT = path.join(__dirname, '..', 'client');
const RUN_MIN = +process.env.RUN_MIN || 10, RESERVE = 10_000_000, LAUNCH_COST = 30_000_000, MIN_ACTION = 1_000_000, MIN_FEES = 5_000_000, MAX_DEV_BUY = 5;
const SITE = process.env.SITE_URL || 'https://autoplay.fun';
fs.mkdirSync(DIR, { recursive: true });
const DB = path.join(DIR, 'db.json');

// ---------- vault keys: AES-256-GCM at rest under MASTER_KEY (env) or a generated key file in DATA_PATH ----------
const KEYFILE = path.join(DIR, '.master');
const MK = process.env.MASTER_KEY || ''; // 64 hex chars, or base64 of 32 bytes (Render generateValue)
const MASTER = MK ? Buffer.from(MK, /^[0-9a-f]{64}$/i.test(MK) ? 'hex' : 'base64') : (fs.existsSync(KEYFILE) ? Buffer.from(fs.readFileSync(KEYFILE, 'utf8').trim(), 'hex') : (() => { const k = crypto.randomBytes(32); fs.writeFileSync(KEYFILE, k.toString('hex'), { mode: 0o600 }); return k; })());
if (MASTER.length !== 32) throw new Error('MASTER_KEY must be 32 bytes (64 hex or base64)');
// on Render, vault keys must live on a persistent disk or a redeploy would lose them: no launches without DATA_PATH
const LAUNCHES_OPEN = !process.env.RENDER || !!process.env.DATA_PATH;
const seal = (seed) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', MASTER, iv); const ct = Buffer.concat([c.update(seed), c.final()]); return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.'); };
const open = (s) => { const [iv, tag, ct] = s.split('.').map((x) => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', MASTER, iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]); };
const vaultOf = (coin) => S.keypair(open(coin.vaultKey));

// ---------- state ----------
let D; try { D = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { D = { coins: {}, receipts: [], stats: { routed: 0, actions: 0, fees: 0, burnedRaw: '0' } }; }
let dirty = false; const save = () => { dirty = true; }; setInterval(() => { if (!dirty) return; dirty = false; const tmp = DB + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(D)); fs.renameSync(tmp, DB); }, 3000);
const coins = () => Object.values(D.coins);
// ---------- webhooks: every receipt for a coin is POSTed to its subscribers, signed with HMAC-SHA256 ----------
D.hooks = D.hooks || {}; // mint → [{ id, url, secret, created, fails }]
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[|.*\.local$|.*\.internal$|.*\.localhost$)/i;
function hookUrlOk(u) { try { const x = new URL(u); return x.protocol === 'https:' && !PRIVATE_HOST.test(x.hostname) && u.length <= 300; } catch { return false; } }
function deliver(mint, row) { for (const h of D.hooks[mint] || []) { const body = JSON.stringify({ event: 'receipt', mint, receipt: row }), sig = crypto.createHmac('sha256', h.secret).update(body).digest('hex');
  fetch(h.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-autoplay-signature': 'sha256=' + sig, 'x-autoplay-event': 'receipt' }, body, redirect: 'manual', signal: AbortSignal.timeout(8000) })
    .then((x) => { h.fails = x.ok ? 0 : (h.fails || 0) + 1; }).catch(() => { h.fails = (h.fails || 0) + 1; })
    .finally(() => { if (h.fails >= 50) D.hooks[mint] = D.hooks[mint].filter((y) => y !== h); save(); }); } }
function receipt(coin, r) { const row = { id: crypto.randomBytes(5).toString('hex'), at: Date.now(), mint: coin.mint, ticker: coin.symbol, ...r }; D.receipts.unshift(row); if (D.receipts.length > 5000) D.receipts.length = 5000;
  (coin.receipts = coin.receipts || []).unshift(row.id); if (coin.mint) deliver(coin.mint, row); if (coin.receipts.length > 400) coin.receipts.length = 400; if (r.ok) { D.stats.actions++; D.stats.routed += r.lamports || 0; } save(); return row; }

// ---------- launch: prepare → creator funds the vault (memo = fingerprint) → vault creates the coin ----------
async function prepare(b) {
  const r = R.normalize(b.patch); if (r.error) throw new Error(r.error);
  const name = String(b.name || '').trim(), symbol = String(b.symbol || '').trim().toUpperCase().replace(/^\$/, ''), description = String(b.description || '').slice(0, 500);
  if (!/^.{2,32}$/.test(name)) throw new Error('name: 2-32 characters'); if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw new Error('ticker: 2-10 letters/digits');
  if (!S.isAddr(b.creator)) throw new Error('connect a Solana wallet');
  const devBuy = Math.max(0, Math.min(MAX_DEV_BUY, +b.devBuy || 0)); if (!isFinite(devBuy)) throw new Error('bad dev buy');
  if (!b.image || b.image.length > 1_500_000) throw new Error('add an image under 1 MB');
  const id = crypto.randomBytes(8).toString('hex'), twitter = String(b.twitter || '').slice(0, 120), website = String(b.website || '').slice(0, 120);
  // pump.fun IPFS first; if it is down, serve the standard metadata JSON ourselves (pump.fun reads any https URI)
  let uri; try { uri = await C.uploadMeta({ name, symbol, description, image: b.image, twitter, website }); } catch { uri = SITE + '/meta/' + id + '.json'; }
  const vault = S.keypair(), mint = S.keypair(), hash = R.fingerprint(r.patch);
  const need = LAUNCH_COST + Math.round(devBuy * 1e9) + RESERVE;
  D.coins[id] = { id, status: 'awaiting-funds', name, symbol, description, uri, twitter, website, image: b.image, creator: b.creator, patch: r.patch, hash, devBuy, need,
    vault: vault.address, vaultKey: seal(vault.seed), mint: mint.address, mintKey: seal(mint.seed), created: Date.now(), trig: {} };
  save(); return { id, vault: vault.address, mint: mint.address, need, hash, memo: 'autoplay:v1:' + hash };
}
async function confirmLaunch(id, sig) {
  const c = D.coins[id]; if (!c) throw new Error('unknown launch'); if (c.status === 'live') return pub(c); if (c.status !== 'awaiting-funds') throw new Error('launch is ' + c.status);
  if (confirming.has(id)) throw new Error('already confirming'); confirming.add(id);
  try { return await confirmInner(c, sig); } finally { confirming.delete(id); }
}
const confirming = new Set();
async function confirmInner(c, sig) {
  let t = null; for (let i = 0; i < 12 && !t; i++) { t = await C.inspectTransfer(sig, c.vault).catch(() => null); if (!t) await new Promise((z) => setTimeout(z, 2500)); }
  if (!t || !t.ok) throw new Error('funding transaction not found or failed');
  if (coins().some((x) => x.fundSig === sig)) throw new Error('that transaction already funded a launch');
  if (t.signer !== c.creator) throw new Error('funding must be signed by the creator wallet');
  if (t.memo !== 'autoplay:v1:' + c.hash) throw new Error('memo must carry the patch fingerprint');
  if (t.received < c.need) throw new Error('vault received ' + t.received / 1e9 + ' SOL, needs ' + c.need / 1e9);
  c.fundSig = sig; c.status = 'creating'; save();
  const vault = vaultOf(c), mint = S.keypair(open(c.mintKey));
  try { c.createSig = await C.createCoin(vault, mint, { name: c.name, symbol: c.symbol, uri: c.uri }, c.devBuy);
    // the vault itself signs the fingerprint too, binding mint ↔ patch on-chain
    c.memoSig = await S.sendIxs(vault, [S.ix.memo('autoplay:v1:' + c.mint + ':' + c.hash, vault.address)], []).catch(() => null);
    c.status = 'live'; c.launched = Date.now(); c.nextRun = Date.now() + 60_000; delete c.image_pending; save();
    receipt(c, { kind: 'launch', ok: true, lamports: 0, sig: c.createSig, text: `$${c.symbol} launched on pump.fun` + (c.devBuy ? ` with a ${c.devBuy} SOL vault buy` : '') });
    return pub(c);
  } catch (e) { c.status = 'failed'; c.error = String(e.message || e).slice(0, 200); save();
    // refund whatever the vault holds back to the creator
    try { const bal = await S.balance(c.vault); if (bal > 10000) c.refundSig = await S.sendIxs(vault, [S.ix.transfer(vault.address, c.creator, bal - 5000)], []); save(); } catch {}
    throw new Error('pump.fun create failed: ' + c.error + (c.refundSig ? ' (refunded)' : '')); }
}

// ---------- executor ----------
const running = new Set();
async function runCoin(c) {
  if (running.has(c.id)) return; running.add(c.id);
  const v = vaultOf(c), now = Date.now(), log = (r) => receipt(c, r);
  try {
    // 1. collect creator fees; the balance delta is the fee budget
    const before = await S.balance(c.vault); let fees = 0;
    try { const r = await C.collectFees(v); if (r.sig) { const after = await S.balance(c.vault); fees = Math.max(0, after - before); c.feesTotal = (c.feesTotal || 0) + fees; D.stats.fees += fees;
      log({ kind: 'fees', ok: true, lamports: fees, sig: r.sig, text: `collected ${(fees / 1e9).toFixed(4)} SOL in creator fees` }); } c.lastCollect = r.why || 'ok'; } catch (e) { c.lastCollect = String(e.message).slice(0, 120); }
    // fees wait for a fees trigger; in a patch without one they simply join the vault
    c.carry = c.patch.triggers.some((t) => t.type === 'fees') ? (c.carry || 0) + fees : 0;
    const mk = await C.market(c.mint); if (mk) c.market = { ...mk, at: now };
    const bal = await S.balance(c.vault), spare = () => Math.max(0, bal - RESERVE - (c.carry || 0));
    // 2. decide which triggers fire this run
    const fire = [];
    for (const t of c.patch.triggers) { const st = c.trig[t.id] || (c.trig[t.id] = {});
      if (t.type === 'fees' && c.carry >= MIN_FEES) fire.push([t, c.carry]);
      if (t.type === 'every' && now - (st.last || c.launched) >= t.params.hours * 3600e3) fire.push([t, Math.floor(spare() * t.params.pctOfVault / 100)]);
      if (t.type === 'mcap' && !st.done && mk && mk.mcap >= t.params.usd) { st.done = true; fire.push([t, Math.floor(spare() * t.params.pctOfVault / 100)]); }
      if (t.type === 'pump' && mk && mk.h1 >= t.params.pct && now - (st.last || 0) > 6 * 3600e3) fire.push([t, Math.floor(spare() * t.params.pctOfVault / 100)]);
      if (t.type === 'dump' && mk && mk.h1 <= -t.params.pct && now - (st.last || 0) > 6 * 3600e3) fire.push([t, Math.floor(spare() * t.params.pctOfVault / 100)]); }
    // 3. run each fired trigger's wires: SOL actions first, then token actions (burn)
    for (const [t, budget] of fire) { c.trig[t.id].last = now; if (t.type === 'fees') c.carry = 0; if (budget < MIN_ACTION) continue;
      const head = t.type === 'fees' ? 'fees arrived' : t.type === 'every' ? `${t.params.hours}h timer` : t.type === 'mcap' ? `mcap passed $${t.params.usd.toLocaleString()}` : t.type === 'pump' ? `price +${t.params.pct}% (1h)` : `price −${t.params.pct}% (1h)`;
      const ws = c.patch.wires.filter((w) => w.from === t.id), A = new Map(c.patch.actions.map((a) => [a.id, a]));
      for (const w of ws.filter((w) => !R.ACTIONS[A.get(w.to).type].tokens)) { const a = A.get(w.to), amt = Math.floor(budget * w.share / 100); if (amt < MIN_ACTION && a.type !== 'keep') continue;
        try { await act(c, v, a, amt, head, log); } catch (e) { log({ kind: a.type, ok: false, lamports: amt, trigger: head, text: `${R.ACTIONS[a.type].label} failed: ${String(e.message || e).slice(0, 140)}`, sig: e.sig || null }); } }
      for (const w of ws.filter((w) => R.ACTIONS[A.get(w.to).type].tokens)) { const a = A.get(w.to);
        try { const b = await C.burnHeld(v, c.mint, a.params.pctOfHeld); const ui = Number(b.raw) / 10 ** b.decimals; c.burned = (c.burned || 0) + ui; D.stats.burnedRaw = String(BigInt(D.stats.burnedRaw) + b.raw);
          log({ kind: 'burn', ok: true, lamports: 0, trigger: head, sig: b.sig, tokens: ui, text: `burned ${Math.round(ui).toLocaleString()} $${c.symbol}` }); }
        catch (e) { if (!/holds none|nothing to burn/.test(e.message)) log({ kind: 'burn', ok: false, lamports: 0, trigger: head, text: 'burn failed: ' + String(e.message).slice(0, 140) }); } } }
    c.lastRun = now;
  } catch (e) { c.lastError = String(e.message || e).slice(0, 200); }
  finally { c.nextRun = Date.now() + RUN_MIN * 60e3; running.delete(c.id); save(); }
}
async function act(c, v, a, amt, head, log) {
  const sol = (x) => (x / 1e9).toFixed(4);
  if (a.type === 'keep') return log({ kind: 'keep', ok: true, lamports: 0, trigger: head, text: `kept ${sol(amt)} SOL in the vault` });
  if (a.type === 'buyback') { const sig = await C.buyCoin(v, c.mint, amt); c.boughtBack = (c.boughtBack || 0) + amt; return log({ kind: 'buyback', ok: true, lamports: amt, trigger: head, sig, text: `bought back $${c.symbol} with ${sol(amt)} SOL` }); }
  if (a.type === 'creator') { const sig = await S.sendIxs(v, [S.ix.transfer(v.address, c.creator, amt)], []); return log({ kind: 'creator', ok: true, lamports: amt, trigger: head, sig, text: `paid the creator ${sol(amt)} SOL` }); }
  if (a.type === 'stock') { const { sig, out } = await C.jupBuy(v, R.STOCKS[a.params.ticker], amt); return log({ kind: 'stock', ok: true, lamports: amt, trigger: head, sig, text: `bought ${a.params.ticker}x with ${sol(amt)} SOL`, out }); }
  const hs = await C.holders(c.mint, a.type === 'airdrop' ? a.params.top : 20, [c.vault]); if (!hs.length) throw new Error('no holders yet');
  if (a.type === 'airdrop') { const r = await C.paySol(v, C.proRata(hs, amt)); if (!r.paid.length) throw new Error('every share was below the rent minimum for a new account');
    const paid = r.paid.reduce((s, p) => s + p.lamports, 0); return log({ kind: 'airdrop', ok: true, lamports: paid, trigger: head, sig: r.sigs[0], sigs: r.sigs, text: `airdropped ${sol(paid)} SOL to ${r.paid.length} holders` }); }
  if (a.type === 'lottery') { const bh = await S.blockhash(), w = C.weightedPick(hs, bh + c.mint); const r = await C.paySol(v, [{ to: w.owner, exists: w.exists, lamports: amt }]); if (!r.paid.length) throw new Error('winner is a new account and the prize is below rent minimum');
    return log({ kind: 'lottery', ok: true, lamports: amt, trigger: head, sig: r.sigs[0], seed: bh, winner: w.owner, text: `paid ${sol(amt)} SOL to ${w.owner.slice(0, 4)}…${w.owner.slice(-4)} (random holder)` }); }
}
setInterval(() => { for (const c of coins()) if (c.status === 'live' && Date.now() >= (c.nextRun || 0)) runCoin(c); }, 15_000);
// launches stuck awaiting funds expire after 2h
// (if a creator paid but never confirmed, e.g. a timeout, their SOL goes back before the record is dropped)
setInterval(async () => { for (const c of coins()) if (c.status === 'awaiting-funds' && Date.now() - c.created > 7200e3) {
  try { const bal = await S.balance(c.vault); if (bal > 10000) { c.refundSig = await S.sendIxs(vaultOf(c), [S.ix.transfer(c.vault, c.creator, bal - 5000)], []); } delete D.coins[c.id]; save(); } catch { /* retry next sweep */ } } }, 600e3);

// ---------- public views ----------
const pub = (c) => ({ id: c.id, status: c.status, name: c.name, symbol: c.symbol, description: c.description, mint: c.mint, vault: c.vault, creator: c.creator, patch: c.patch, hash: c.hash, rules: R.describe(c.patch),
  launched: c.launched || null, created: c.created, devBuy: c.devBuy, fundSig: c.fundSig || null, createSig: c.createSig || null, memoSig: c.memoSig || null, market: c.market || null,
  feesTotal: c.feesTotal || 0, boughtBack: c.boughtBack || 0, burned: c.burned || 0, nextRun: c.nextRun || null, lastRun: c.lastRun || null, image: '/api/img/' + c.id, uri: c.uri, error: c.status === 'failed' ? c.error : undefined });
const live = () => coins().filter((c) => c.status === 'live');
async function vaultView(c) { const [bal, hold] = await Promise.all([S.balance(c.vault).catch(() => null), C.held(c.vault, c.mint).catch(() => null)]);
  const stocks = {}; for (const [k, m] of Object.entries(R.STOCKS)) { const h = await C.held(c.vault, m).catch(() => null); if (h && h.ui > 0) stocks[k] = h.ui; } return { sol: bal, coin: hold ? hold.ui : null, stocks }; }

// ---------- http ----------
const send = (res, code, obj, h = {}) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...h }); res.end(JSON.stringify(obj)); };
const body = (req, max = 2_000_000) => new Promise((ok) => { let d = ''; req.on('data', (x) => { d += x; if (d.length > max) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const hits = new Map(); const limited = (ip, n) => { const m = Math.floor(Date.now() / 60000), h = hits.get(ip); if (h && h[0] === m && h[1] >= n) return true; hits.set(ip, h && h[0] === m ? [m, h[1] + 1] : [m, 1]); if (hits.size > 5000) hits.clear(); return false; };
const vcache = new Map();
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname, ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    if (p === '/api/catalog') return send(res, 200, { launchesOpen: LAUNCHES_OPEN, triggers: R.TRIGGERS, actions: R.ACTIONS, stocks: Object.keys(R.STOCKS), launchCost: LAUNCH_COST + RESERVE, runMin: RUN_MIN });
    if (p === '/api/stats') { const L = live(); return send(res, 200, { coins: L.length, routedSol: D.stats.routed / 1e9, feesSol: D.stats.fees / 1e9, actions: D.stats.actions, mcapUsd: L.reduce((s, c) => s + ((c.market && c.market.mcap) || 0), 0) }); }
    if (p === '/api/activity') return send(res, 200, { items: D.receipts.slice(0, Math.min(100, +u.searchParams.get('n') || 40)) });
    if (p === '/api/coins' && u.searchParams.get('creator')) { const w = u.searchParams.get('creator'); return send(res, 200, { coins: coins().filter((c) => c.creator === w && c.status !== 'awaiting-funds').sort((a, b) => (b.created || 0) - (a.created || 0)).map(pub) }); }
    if (p === '/api/webhooks' && req.method === 'POST') { if (limited(ip + ':wh', 20)) return send(res, 429, { error: 'slow down' }); const { mint, url } = await body(req, 4000); const c = coins().find((x) => x.mint === mint && x.status === 'live');
      if (!c) return send(res, 404, { error: 'unknown coin' }); if (!hookUrlOk(url)) return send(res, 400, { error: 'url must be a public https URL' });
      const list = D.hooks[mint] = D.hooks[mint] || []; if (list.length >= 20) return send(res, 400, { error: 'this coin already has 20 webhooks' });
      const h = { id: crypto.randomBytes(6).toString('hex'), url, secret: crypto.randomBytes(24).toString('hex'), created: Date.now(), fails: 0 }; list.push(h); save();
      return send(res, 200, { id: h.id, mint, url, secret: h.secret, note: 'verify x-autoplay-signature = sha256=HMAC_SHA256(secret, raw body). The secret is shown once.' }); }
    if (p === '/api/webhooks' && req.method === 'DELETE') { const { mint, id, secret } = await body(req, 4000); const list = D.hooks[mint] || [], h = list.find((x) => x.id === id && x.secret === secret);
      if (!h) return send(res, 404, { error: 'not found' }); D.hooks[mint] = list.filter((x) => x !== h); save(); return send(res, 200, { ok: true }); }
    if (p === '/api/coins') return send(res, 200, { coins: live().sort((a, b) => (b.launched || 0) - (a.launched || 0)).slice(0, 100).map(pub) });
    if (/^\/meta\/[0-9a-f]{16}\.json$/.test(p)) { const c = D.coins[p.slice(6, 22)]; if (!c) return send(res, 404, { error: 'not found' });
      return send(res, 200, { name: c.name, symbol: c.symbol, description: c.description, image: SITE + '/api/img/' + c.id, showName: true, createdOn: SITE, twitter: c.twitter || undefined, website: c.website || SITE + '/c/' + c.mint }, { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' }); }
    if (p.startsWith('/api/img/')) { const c = D.coins[p.slice(9)]; const m = c && /^data:(image\/[a-z]+);base64,(.+)$/.exec(c.image || ''); if (!m) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': m[1], 'cache-control': 'public, max-age=86400' }); return res.end(Buffer.from(m[2], 'base64')); }
    if (p.startsWith('/api/coin/')) { const k = p.slice(10), c = D.coins[k] || coins().find((x) => x.mint === k); if (!c || c.status === 'awaiting-funds') return send(res, 404, { error: 'not found' });
      let vv = vcache.get(c.id); if (!vv || Date.now() - vv.t > 20000) { vv = { t: Date.now(), v: await vaultView(c) }; vcache.set(c.id, vv); }
      return send(res, 200, { ...pub(c), vaultHoldings: vv.v, receipts: (c.receipts || []).slice(0, 80).map((id) => D.receipts.find((r) => r.id === id)).filter(Boolean) }); }
    if (p.startsWith('/api/verify/')) { const c = coins().find((x) => x.mint === p.slice(12)); if (!c || c.status !== 'live') return send(res, 404, { error: 'not found' });
      const [fund, vm] = await Promise.all([C.inspectTransfer(c.fundSig, c.vault).catch(() => null), c.memoSig ? C.inspectTransfer(c.memoSig, c.vault).catch(() => null) : null]);
      return send(res, 200, { mint: c.mint, creator: c.creator, vault: c.vault, patch: c.patch, canonical: R.canon(c.patch), hash: c.hash, fund: fund && { sig: c.fundSig, signer: fund.signer, memo: fund.memo, received: fund.received, time: fund.time }, vaultMemo: vm && { sig: c.memoSig, signer: vm.signer, memo: vm.memo, time: vm.time }, createSig: c.createSig }); }
    if (p === '/api/parse' && req.method === 'POST') { const { text } = await body(req, 4000); const r = R.parse(text); return r.error ? send(res, 400, r) : send(res, 200, { patch: r.patch, rules: R.describe(r.patch), hash: R.fingerprint(r.patch) }); }
    if (p === '/api/validate' && req.method === 'POST') { const r = R.normalize((await body(req, 40000)).patch); return r.error ? send(res, 400, r) : send(res, 200, { patch: r.patch, rules: R.describe(r.patch), hash: R.fingerprint(r.patch) }); }
    if (p === '/api/launch/prepare' && req.method === 'POST') { if (!LAUNCHES_OPEN) return send(res, 503, { error: 'launches open once the server has persistent storage' }); if (limited(ip, +process.env.LAUNCH_RPM || 6)) return send(res, 429, { error: 'slow down' }); try { return send(res, 200, await prepare(await body(req))); } catch (e) { return send(res, 400, { error: String(e.message || e) }); } }
    if (p === '/api/launch/confirm' && req.method === 'POST') { const { id, sig } = await body(req, 4000); if (!/^[1-9A-HJ-NP-Za-km-z]{60,90}$/.test(sig || '')) return send(res, 400, { error: 'bad signature' });
      try { return send(res, 200, await confirmLaunch(id, sig)); } catch (e) { return send(res, 400, { error: String(e.message || e) }); } }
    if (p.startsWith('/api/launch/') && req.method === 'GET') { const c = D.coins[p.slice(12)]; return c ? send(res, 200, { id: c.id, status: c.status, mint: c.mint, vault: c.vault, need: c.need, hash: c.hash, error: c.error || null }) : send(res, 404, { error: 'not found' }); }
    if (p === '/api/blockhash') return send(res, 200, { blockhash: await S.blockhash() });
    // static
    const routes = { '/': 'index.html', '/build': 'build.html', '/coins': 'coins.html', '/docs': 'docs.html', '/me': 'me.html' };
    let f = routes[p] || p.slice(1); if (p.startsWith('/c/')) f = 'coin.html'; if (p.startsWith('/verify/')) f = 'verify.html'; if (p.startsWith('/embed/')) f = 'embed.html';
    const fp = path.join(CLIENT, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
    if (!fp.startsWith(CLIENT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res);
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log('AUTOPLAY on :' + PORT, '· coins', coins().length, '· rpc', S.RPCS[0]));
module.exports = { runCoin, D };
