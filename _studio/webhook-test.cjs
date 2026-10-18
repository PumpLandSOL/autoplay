// one-off: append webhook + creator-filter checks to e2e.cjs (before the public API block)
const fs = require('fs'); let s = fs.readFileSync(__dirname + '/e2e.cjs', 'utf8').split('\r\n').join('\n');
if (s.includes('webhook')) return console.log('already');
s = s.replace("  console.log('A · public API');", `  console.log('A · webhooks + my coins');
  ok((await post('/api/webhooks', { mint: coin.mint, url: 'http://example.com/h' })).status === 400, 'webhook: plain http rejected');
  ok((await post('/api/webhooks', { mint: coin.mint, url: 'https://127.0.0.1/h' })).status === 400, 'webhook: private host rejected (no SSRF)');
  const wh = await post('/api/webhooks', { mint: coin.mint, url: 'https://hooks.example.com/pb' }); ok(wh.id && /^[0-9a-f]{48}$/.test(wh.secret), 'webhook registered, secret returned once');
  const caught = []; const realFetch = global.fetch; global.fetch = async (u, o) => { if (String(u).startsWith('https://hooks.example.com')) { caught.push(o); return { ok: true }; } return realFetch(u, o); };
  L.fees = 200_000_000; await srv.runCoin(coin); await new Promise((z) => setTimeout(z, 200)); global.fetch = realFetch;
  const d = caught[0]; const expect = d && 'sha256=' + require('crypto').createHmac('sha256', wh.secret).update(d.body).digest('hex');
  ok(caught.length >= 3 && JSON.parse(d.body).event === 'receipt', 'run delivered each receipt to the webhook (' + caught.length + ' deliveries)');
  ok(d && d.headers['x-autoplay-signature'] === expect, 'delivery is HMAC-SHA256 signed with the secret');
  ok(!JSON.stringify(await get('/api/coin/' + coin.mint)).includes(wh.secret), 'webhook secret never appears in public API');
  const mine = await get('/api/coins?creator=' + creator.address); ok(mine.coins.length >= 3 && mine.coins.every((c) => c.creator === creator.address), 'My coins: ' + mine.coins.length + ' coins for the creator wallet (incl. refunded)');
  ok((await (await fetch(U + '/embed/' + coin.mint)).text()).includes('AUTOPLAY embed'), 'embed page served');
  ok((await post('/api/webhooks', { mint: coin.mint, id: wh.id, secret: 'nope' }).catch(() => ({}))) && true, '');
  console.log('A · public API');`);
s = s.replace(`ok((await post('/api/webhooks', { mint: coin.mint, id: wh.id, secret: 'nope' }).catch(() => ({}))) && true, '');\n`, '');
fs.writeFileSync(__dirname + '/e2e.cjs', s); console.log('ok');
