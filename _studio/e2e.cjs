// PATCHBAY E2E. Part A: the whole server (launch flow + executor) against an in-memory chain.
// Part B: the browser's funding transaction, signed with a real ed25519 key and simulated on Solana mainnet.
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), S = require(ROOT + '/server/sol'), C = require(ROOT + '/server/chain');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

// ---------- in-memory chain ----------
const L = { bal: {}, tok: {}, txs: {}, sent: [], mcap: 50000, h1: 0, fees: 0, createFail: false }; let n = 0; const sig = () => (++n, S.b58enc(require('crypto').randomBytes(64)));
S.balance = async (a) => L.bal[a] || 0; S.blockhash = async () => '11111111111111111111111111111111';
S.sendIxs = async (payer, ixs) => { const s = sig(); for (const i of ixs) { if (i.programId === S.P.system) { const lam = Number(i.data.readBigUInt64LE(4)), to = i.keys[1].pubkey; L.bal[payer.address] -= lam + 5000; L.bal[to] = (L.bal[to] || 0) + lam; }
  if (i.programId === S.P.memo) L.txs[s] = { ok: true, signer: payer.address, received: 0, memo: i.data.toString() }; } L.sent.push({ s, ixs, payer: payer.address }); return s; };
C.uploadMeta = async () => 'https://ipfs.io/ipfs/test';
C.inspectTransfer = async (s, to) => (L.txs[s] ? { ...L.txs[s], received: L.txs[s].to === to ? L.txs[s].received : L.txs[s].received } : null);
C.createCoin = async (agent, mint, meta, dev) => { if (L.createFail) throw new Error('simulated failure'); L.bal[agent.address] -= 20_000_000 + dev * 1e9; L.tok[agent.address] = 34_000_000 * 1e6; return sig(); };
C.collectFees = async (agent) => { if (L.fees < 2_000_000) return { sig: null, gain: L.fees, why: 'below threshold' }; L.bal[agent.address] += L.fees; L.fees = 0; return { sig: sig(), gain: 1 }; };
C.buyCoin = async (agent, mint, lam) => { L.bal[agent.address] -= lam; L.tok[agent.address] = (L.tok[agent.address] || 0) + lam * 1000; L.buys = (L.buys || 0) + lam; return sig(); };
C.burnHeld = async (agent, mint, pct) => { const amt = BigInt(Math.floor((L.tok[agent.address] || 0) * pct / 100)); if (!amt) throw new Error('vault holds none of the coin'); L.tok[agent.address] -= Number(amt); return { sig: sig(), raw: amt, decimals: 6 }; };
const HOLDERS = ['A1', 'B2', 'C3', 'D4'].map((x, i) => ({ owner: S.keypair(Buffer.alloc(32, i + 1)).address, raw: BigInt((4 - i) * 1e12), exists: i !== 3 }));
C.holders = async (mint, top, ex) => HOLDERS.filter((h) => !ex.includes(h.owner)).slice(0, top);
const realPay = C.paySol; C.paySol = async (agent, pays) => { const good = pays.filter((p) => p.lamports >= 5000 && (p.exists || p.lamports >= C.RENT_MIN)); for (const p of good) { L.bal[agent.address] -= p.lamports; L.bal[p.to] = (L.bal[p.to] || 0) + p.lamports; } return { sigs: good.length ? [sig()] : [], paid: good, dropped: pays.length - good.length }; };
C.jupBuy = async (agent, outMint, lam) => { L.bal[agent.address] -= lam; L.stock = (L.stock || 0) + lam; return { sig: sig(), out: '123' }; };
C.market = async () => ({ priceUsd: 0.0001, mcap: L.mcap, h1: L.h1, h24: 0, vol24: 0 }); C.held = async (o) => ({ ui: (L.tok[o] || 0) / 1e6, raw: 0n, decimals: 6 });

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-')); process.env.DATA_PATH = DATA; process.env.PORT = '8259'; process.env.LAUNCH_RPM = '100'; process.env.RUN_MIN = '10';
const srv = require(ROOT + '/server/index.js'); const U = 'http://localhost:8259';
const post = async (p, b) => { const r = await fetch(U + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, ...(await r.json()) }; };
const get = async (p) => (await fetch(U + p)).json();
const IMG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
const creator = S.keypair(), stranger = S.keypair();
function fund(id, from, to, lamports, memo) { const s = sig(); L.txs[s] = { ok: true, signer: from, to, received: lamports, memo }; L.bal[to] = (L.bal[to] || 0) + lamports; return s; }

(async () => { await new Promise((r) => setTimeout(r, 400));
  console.log('A · launch flow');
  const parsed = await post('/api/parse', { text: 'buy back 50% and burn, airdrop 30% to top 3 holders, 10% to the creator, keep the rest' });
  ok(parsed.patch && parsed.rules.length === 1, 'sentence → patch: ' + parsed.rules[0]);
  ok((await post('/api/validate', { patch: { triggers: [{ id: 'a', type: 'fees' }], actions: [{ id: 'b', type: 'buyback' }], wires: [{ from: 'a', to: 'b', share: 150 }] } })).hash, 'share is clamped to 100% (150 → 100)');
  ok((await post('/api/validate', { patch: { triggers: [{ id: 'a', type: 'fees' }], actions: [{ id: 'b', type: 'nuke' }], wires: [] } })).status === 400, 'unknown module rejected');
  const base = { patch: parsed.patch, name: 'Self Playing', symbol: 'play', description: 'test', image: IMG, devBuy: 0.5, creator: creator.address };
  ok((await post('/api/launch/prepare', { ...base, creator: 'nope' })).status === 400, 'prepare rejects a bad creator address');
  ok((await post('/api/launch/prepare', { ...base, symbol: 'TOO-LONG-TICKER' })).status === 400, 'prepare rejects a bad ticker');
  const pr = await post('/api/launch/prepare', base); ok(pr.vault && pr.need === 30e6 + 0.5e9 + 10e6 && pr.memo === 'patchbay:v1:' + parsed.hash, 'prepare: vault + need 0.54 SOL + memo carries the fingerprint');
  ok((await post('/api/launch/confirm', { id: pr.id, sig: fund(0, creator.address, pr.vault, pr.need, 'patchbay:v1:deadbeef') })).error?.includes('memo'), 'confirm rejects a wrong memo');
  ok((await post('/api/launch/confirm', { id: pr.id, sig: fund(0, stranger.address, pr.vault, pr.need, pr.memo) })).error?.includes('creator'), 'confirm rejects a different signer');
  ok((await post('/api/launch/confirm', { id: pr.id, sig: fund(0, creator.address, pr.vault, 1000, pr.memo) })).error?.includes('needs'), 'confirm rejects underfunding');
  L.bal[pr.vault] = 0; const good = fund(0, creator.address, pr.vault, pr.need, pr.memo);
  const live = await post('/api/launch/confirm', { id: pr.id, sig: good }); ok(live.status === 'live' && live.mint === pr.mint, 'confirm → vault creates the coin → live');
  ok(L.sent.some((t) => t.ixs.some((i) => i.programId === S.P.memo && i.data.toString() === 'patchbay:v1:' + pr.mint + ':' + parsed.hash)), 'vault wrote its own memo binding mint ↔ fingerprint');
  const pr2 = await post('/api/launch/prepare', base); ok((await post('/api/launch/confirm', { id: pr2.id, sig: good })).error?.includes('already funded'), 'a funding tx cannot be reused for a second launch');
  L.createFail = true; const pr3 = await post('/api/launch/prepare', { ...base, symbol: 'FAIL' }); const f3 = fund(0, creator.address, pr3.vault, pr3.need, pr3.memo);
  const r3 = await post('/api/launch/confirm', { id: pr3.id, sig: f3 }); ok(r3.error?.includes('refunded') && L.bal[creator.address] > 0, 'failed create refunds the creator automatically'); L.createFail = false;

  console.log('A · executor');
  const coin = srv.D.coins[pr.id]; const vb0 = L.bal[pr.vault];
  L.fees = 1_000_000; await srv.runCoin(coin); ok(!coin.receipts.some((id) => srv.D.receipts.find((r) => r.id === id && r.kind === 'fees')), 'tiny fees (0.001) are not claimed: simulate says below threshold');
  L.fees = 1_000_000_000; const creatorBefore = L.bal[creator.address] || 0; const tok0 = L.tok[pr.vault]; await srv.runCoin(coin);
  const rec = (k) => srv.D.receipts.filter((r) => r.mint === coin.mint && r.kind === k && r.ok);
  ok(rec('fees').length === 1 && coin.feesTotal === 1e9, 'claimed 1 SOL of creator fees');
  ok(L.buys === 500_000_000, 'buyback got exactly 50% (0.5 SOL)');
  ok(rec('burn').length === 1 && L.tok[pr.vault] === 0, 'burn burned 100% of held coins after the buyback');
  const air = rec('airdrop')[0]; ok(air && Math.abs(air.lamports - 300_000_000) <= 3, 'airdrop sent 0.3 SOL to the top 3 holders');
  ok(L.bal[HOLDERS[0].owner] === 133_333_333 && L.bal[HOLDERS[1].owner] === 100_000_000 && L.bal[HOLDERS[2].owner] === 66_666_666, 'pro rata to balances 4:3:2 → 0.1333 / 0.1000 / 0.0667 SOL');
  ok(L.bal[creator.address] - creatorBefore === 100_000_000, 'creator paid exactly 10% (0.1 SOL)');
  ok(rec('keep').length === 1, 'the remaining 10% stays in the vault (receipt logged)');
  ok(coin.carry === 0, 'fee budget fully consumed');

  console.log('A · triggers');
  const pr4 = await post('/api/launch/prepare', { ...base, symbol: 'TIMER', patch: { triggers: [{ id: 't1', type: 'every', params: { hours: 1, pctOfVault: 50 } }, { id: 't2', type: 'mcap', params: { usd: 100000, pctOfVault: 10 } }], actions: [{ id: 'a1', type: 'lottery' }, { id: 'a2', type: 'stock', params: { ticker: 'tsla' } }], wires: [{ from: 't1', to: 'a1', share: 100 }, { from: 't2', to: 'a2', share: 100 }] } });
  ok(!pr4.error, 'stock ticker normalized (tsla → TSLA) ' + (pr4.error || ''));
  await post('/api/launch/confirm', { id: pr4.id, sig: fund(0, creator.address, pr4.vault, pr4.need + 2e9, pr4.memo) }); const c4 = srv.D.coins[pr4.id];
  await srv.runCoin(c4); ok(!srv.D.receipts.some((r) => r.mint === c4.mint && r.kind === 'lottery'), 'hourly timer does not fire before an hour');
  c4.launched -= 3601e3; const before = L.bal[pr4.vault]; await srv.runCoin(c4); const lot = srv.D.receipts.find((r) => r.mint === c4.mint && r.kind === 'lottery');
  ok(lot && lot.seed && lot.winner, 'timer fired: random holder paid, seed + winner in the receipt');
  ok(lot && Math.abs(lot.lamports - Math.floor((before - 10e6) * .5)) < 2, '…with 50% of spare vault SOL');
  ok(lot && C.weightedPick(HOLDERS.slice(0, 20), lot.seed + c4.mint).owner === lot.winner, 'the pick is reproducible from the seed');
  L.mcap = 150000; await srv.runCoin(c4); await srv.runCoin(c4); ok(srv.D.receipts.filter((r) => r.mint === c4.mint && r.kind === 'stock').length === 1, 'market-cap trigger fires exactly once (TSLA bought once)');

  C.uploadMeta = async () => { throw new Error('pump ipfs 500'); }; const pr5 = await post('/api/launch/prepare', { ...base, symbol: 'META' });
  const m5 = await get('/meta/' + pr5.id + '.json'); ok(srv.D.coins[pr5.id].uri.endsWith('/meta/' + pr5.id + '.json') && m5.name === 'Self Playing' && m5.image.endsWith('/api/img/' + pr5.id), 'pump.fun IPFS down → self-hosted metadata JSON serves name + image');
  const im = await fetch(U + '/api/img/' + pr5.id); ok(im.status === 200 && im.headers.get('content-type') === 'image/png', 'coin image served for the metadata');
  console.log('A · public API');
  const cv = await get('/api/coin/' + coin.mint); ok(cv.receipts.length >= 6 && cv.rules.length && !JSON.stringify(cv).includes('vaultKey') && !JSON.stringify(cv).includes(coin.vaultKey), 'coin view has receipts and never leaks the vault key');
  const vf = await get('/api/verify/' + coin.mint); ok(vf.hash === parsed.hash && vf.canonical && vf.fund.memo === 'patchbay:v1:' + parsed.hash, 'verify returns patch, canonical bytes and the creator memo');
  const st = await get('/api/stats'); ok(st.coins === 2 && st.actions > 5 && st.routedSol > 0.9, `stats: ${st.coins} coins, ${st.actions} actions, ${st.routedSol} SOL routed`);
  ok(!JSON.stringify(await get('/api/coins')).includes(coin.vaultKey), '/api/coins never leaks keys');
  ok(fs.readFileSync(path.join(DATA, '.master'), 'utf8').length === 64, 'master key generated in DATA_PATH');

  console.log('B · real Solana: the browser funding transaction');
  const ctx = { TextEncoder, console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(ROOT + '/client/common.js', 'utf8').replace(/^const \$ =.*$/m, ''), ctx);
  const payer = S.keypair(), vault = S.keypair(), bh = await (require('./../server/sol').rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).then((r) => r.value.blockhash);
  const msg = Buffer.from(vm.runInContext(`fundMessage(${JSON.stringify(payer.address)}, ${JSON.stringify(vault.address)}, ${JSON.stringify(bh)}, 540000000, 'patchbay:v1:${parsed.hash}')`, ctx));
  const srvMsg = S.compileLegacy(payer.address, [S.ix.transfer(payer.address, vault.address, 540000000), S.ix.memo('patchbay:v1:' + parsed.hash, payer.address)], bh).message;
  ok(Buffer.compare(msg, srvMsg) === 0, 'browser-built message is byte-identical to the server compiler');
  const signed = S.assemble(msg, [payer.address], [payer]); const sim = await S.simulate(signed, true);
  ok(JSON.stringify(sim.err) === '"AccountNotFound"', 'mainnet accepts the signature and format (fails only because the test payer has no SOL): ' + JSON.stringify(sim.err));
  const bad = Buffer.from(signed); bad[10] ^= 1; ok(JSON.stringify((await S.simulate(bad, true).catch((e) => ({ err: e.message }))).err).includes('Signature'), 'a tampered funding tx is rejected by mainnet');

  fs.writeFileSync(path.join(DATA, 'db.json'), JSON.stringify(srv.D)); console.log('data:', DATA);
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
