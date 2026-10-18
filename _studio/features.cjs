// one-off: My coins filter, embeds, webhooks (HMAC-signed receipt delivery)
const fs = require('fs'), path = require('path'); const f = path.join(__dirname, '..', 'server', 'index.js'); let s = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const r = (a, b) => { if (!s.includes(a)) throw new Error('miss ' + a.slice(0, 60)); s = s.replace(a, b); };
r(`function receipt(coin, r) {`, `// ---------- webhooks: every receipt for a coin is POSTed to its subscribers, signed with HMAC-SHA256 ----------
D.hooks = D.hooks || {}; // mint → [{ id, url, secret, created, fails }]
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?|.*\.local$|.*\.internal$)/i;
function hookUrlOk(u) { try { const x = new URL(u); return x.protocol === 'https:' && !PRIVATE_HOST.test(x.hostname) && u.length <= 300; } catch { return false; } }
function deliver(mint, row) { for (const h of D.hooks[mint] || []) { const body = JSON.stringify({ event: 'receipt', mint, receipt: row }), sig = crypto.createHmac('sha256', h.secret).update(body).digest('hex');
  fetch(h.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-autoplay-signature': 'sha256=' + sig, 'x-autoplay-event': 'receipt' }, body, redirect: 'manual', signal: AbortSignal.timeout(8000) })
    .then((x) => { h.fails = x.ok ? 0 : (h.fails || 0) + 1; }).catch(() => { h.fails = (h.fails || 0) + 1; })
    .finally(() => { if (h.fails >= 50) D.hooks[mint] = D.hooks[mint].filter((y) => y !== h); save(); }); } }
function receipt(coin, r) {`);
r(`(coin.receipts = coin.receipts || []).unshift(row.id);`, `(coin.receipts = coin.receipts || []).unshift(row.id); if (coin.mint) deliver(coin.mint, row);`);
r(`    if (p === '/api/coins') return send(res, 200, { coins: live().sort(`, `    if (p === '/api/coins' && u.searchParams.get('creator')) { const w = u.searchParams.get('creator'); return send(res, 200, { coins: coins().filter((c) => c.creator === w && c.status !== 'awaiting-funds').sort((a, b) => (b.created || 0) - (a.created || 0)).map(pub) }); }
    if (p === '/api/webhooks' && req.method === 'POST') { if (limited(ip, 20)) return send(res, 429, { error: 'slow down' }); const { mint, url } = await body(req, 4000); const c = coins().find((x) => x.mint === mint && x.status === 'live');
      if (!c) return send(res, 404, { error: 'unknown coin' }); if (!hookUrlOk(url)) return send(res, 400, { error: 'url must be a public https URL' });
      const list = D.hooks[mint] = D.hooks[mint] || []; if (list.length >= 20) return send(res, 400, { error: 'this coin already has 20 webhooks' });
      const h = { id: crypto.randomBytes(6).toString('hex'), url, secret: crypto.randomBytes(24).toString('hex'), created: Date.now(), fails: 0 }; list.push(h); save();
      return send(res, 200, { id: h.id, mint, url, secret: h.secret, note: 'verify x-autoplay-signature = sha256=HMAC_SHA256(secret, raw body). The secret is shown once.' }); }
    if (p === '/api/webhooks' && req.method === 'DELETE') { const { mint, id, secret } = await body(req, 4000); const list = D.hooks[mint] || [], h = list.find((x) => x.id === id && x.secret === secret);
      if (!h) return send(res, 404, { error: 'not found' }); D.hooks[mint] = list.filter((x) => x !== h); save(); return send(res, 200, { ok: true }); }
    if (p === '/api/coins') return send(res, 200, { coins: live().sort(`);
r(`const routes = { '/': 'index.html', '/build': 'build.html', '/coins': 'coins.html', '/docs': 'docs.html' };`, `const routes = { '/': 'index.html', '/build': 'build.html', '/coins': 'coins.html', '/docs': 'docs.html', '/me': 'me.html' };`);
r(`if (p.startsWith('/verify/')) f = 'verify.html';`, `if (p.startsWith('/verify/')) f = 'verify.html'; if (p.startsWith('/embed/')) f = 'embed.html';`);
fs.writeFileSync(f, s); console.log('ok');
