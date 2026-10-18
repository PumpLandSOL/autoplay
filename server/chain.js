// Every on-chain action a patch can take. Each returns a confirmed signature or throws.
'use strict';
const crypto = require('crypto');
const S = require('./sol');
const PRIORITY = +process.env.PRIORITY_SOL || 0.0001, SLIPPAGE = +process.env.SLIPPAGE || 15;
const RENT_MIN = 890880; // a brand-new system account must receive at least this many lamports

async function pumpTx(body) {
  const r = await fetch('https://pumpportal.fun/api/trade-local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (r.status !== 200) throw new Error('pumpportal ' + r.status + ': ' + (await r.text()).slice(0, 160));
  return Buffer.from(await r.arrayBuffer());
}
// metadata (image + name/symbol/description/links) → pump.fun IPFS → metadata URI
async function uploadMeta({ name, symbol, description, image, twitter, website }) {
  const m = /^data:(image\/(png|jpeg|gif|webp));base64,(.+)$/.exec(image || ''); if (!m) throw new Error('image must be png/jpg/gif/webp');
  const fd = new FormData(); fd.append('file', new Blob([Buffer.from(m[3], 'base64')], { type: m[1] }), 'image.' + m[2]);
  for (const [k, v] of Object.entries({ name, symbol, description, twitter: twitter || '', telegram: '', website: website || '', showName: 'true' })) fd.append(k, v);
  const r = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('pump.fun ipfs ' + r.status); const j = await r.json(); if (!j.metadataUri) throw new Error('no metadataUri'); return j.metadataUri;
}
async function createCoin(agent, mintKp, { name, symbol, uri }, devBuySol) {
  const tx = await pumpTx({ publicKey: agent.address, action: 'create', tokenMetadata: { name, symbol, uri }, mint: mintKp.address, denominatedInSol: 'true', amount: devBuySol, slippage: SLIPPAGE, priorityFee: PRIORITY, pool: 'pump' });
  return S.sendAndConfirm(S.signTx(tx, [agent, mintKp]));
}
// simulate the claim first (free); only send it when the vault would actually gain at least `min` lamports
async function collectFees(agent, min = 2_000_000) {
  const tx = S.signTx(await pumpTx({ publicKey: agent.address, action: 'collectCreatorFee', priorityFee: PRIORITY, pool: 'pump' }), [agent]);
  const [sim, bal] = await Promise.all([S.rpc('simulateTransaction', [tx.toString('base64'), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed', accounts: { addresses: [agent.address], encoding: 'base64' } }]), S.balance(agent.address)]);
  if (sim.value.err) return { sig: null, gain: 0, why: 'simulate: ' + JSON.stringify(sim.value.err) };
  const gain = sim.value.accounts[0].lamports - bal; if (gain < min) return { sig: null, gain, why: 'below threshold' };
  return { sig: await S.sendAndConfirm(tx), gain };
}
const buyCoin = async (agent, mint, lamports) => S.sendAndConfirm(S.signTx(await pumpTx({ publicKey: agent.address, action: 'buy', mint, denominatedInSol: 'true', amount: +(lamports / 1e9).toFixed(9), slippage: SLIPPAGE, priorityFee: PRIORITY, pool: 'auto' }), [agent]));

// token accounts the owner holds for a mint (works for SPL Token and Token-2022)
async function tokenAccounts(owner, mint) {
  const r = await S.rpc('getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  return (r.value || []).map((a) => ({ address: a.pubkey, program: a.account.owner, raw: BigInt(a.account.data.parsed.info.tokenAmount.amount), ui: +a.account.data.parsed.info.tokenAmount.uiAmountString, decimals: a.account.data.parsed.info.tokenAmount.decimals }));
}
async function held(owner, mint) { const t = await tokenAccounts(owner, mint); return { raw: t.reduce((s, a) => s + a.raw, 0n), ui: t.reduce((s, a) => s + a.ui, 0), decimals: t[0] ? t[0].decimals : 6 }; }
async function burnHeld(agent, mint, pct) {
  const accts = (await tokenAccounts(agent.address, mint)).filter((a) => a.raw > 0n); if (!accts.length) throw new Error('vault holds none of the coin');
  const ixs = [S.ix.cuPrice(Math.round(PRIORITY * 1e15 / 200000))]; let total = 0n;
  for (const a of accts) { const amt = a.raw * BigInt(pct) / 100n; if (amt > 0n) { ixs.push(S.ix.burn(a.program, a.address, mint, agent.address, amt)); total += amt; } }
  if (total === 0n) throw new Error('nothing to burn'); const sig = await S.sendIxs(agent, ixs, []); return { sig, raw: total, decimals: accts[0].decimals };
}
// top holders that are real wallets (excludes the bonding curve, AMM pools and the vault itself)
async function holders(mint, top, exclude = []) {
  const big = (await S.rpc('getTokenLargestAccounts', [mint, { commitment: 'confirmed' }])).value.filter((x) => +x.amount > 0);
  if (!big.length) return [];
  const accs = (await S.rpc('getMultipleAccounts', [big.map((x) => x.address), { encoding: 'jsonParsed' }])).value;
  const rows = big.map((b, i) => ({ owner: accs[i] && accs[i].data.parsed.info.owner, raw: BigInt(b.amount) })).filter((r) => r.owner && !exclude.includes(r.owner));
  const owners = [...new Set(rows.map((r) => r.owner))];
  const oi = (await S.rpc('getMultipleAccounts', [owners, { encoding: 'base64' }])).value;
  const ok = new Map(owners.map((o, i) => [o, !oi[i] || oi[i].owner === S.P.system])), exists = new Map(owners.map((o, i) => [o, !!oi[i]]));
  const agg = new Map(); for (const r of rows) if (ok.get(r.owner)) agg.set(r.owner, (agg.get(r.owner) || 0n) + r.raw);
  return [...agg].map(([owner, raw]) => ({ owner, raw, exists: exists.get(owner) })).sort((a, b) => (b.raw > a.raw ? 1 : -1)).slice(0, top);
}
// SOL to many wallets, ≤18 transfers per tx; recipients that can't receive (new account below rent minimum) are dropped
async function paySol(agent, pays) {
  const good = pays.filter((p) => p.lamports >= 5000 && (p.exists || p.lamports >= RENT_MIN)), sigs = [];
  for (let i = 0; i < good.length; i += 18) { const chunk = good.slice(i, i + 18);
    sigs.push(await S.sendIxs(agent, [S.ix.cuPrice(Math.round(PRIORITY * 1e15 / 200000)), ...chunk.map((p) => S.ix.transfer(agent.address, p.to, p.lamports))], [])); }
  return { sigs, paid: good, dropped: pays.length - good.length };
}
function proRata(hs, lamports) { const tot = hs.reduce((s, h) => s + h.raw, 0n); if (tot === 0n) return [];
  return hs.map((h) => ({ to: h.owner, exists: h.exists, lamports: Number(BigInt(lamports) * h.raw / tot) })); }
// pick one holder weighted by balance, seeded by a recent blockhash (anyone can recompute the pick)
function weightedPick(hs, seed) { const tot = hs.reduce((s, h) => s + h.raw, 0n); if (tot === 0n) return null;
  const r = BigInt('0x' + crypto.createHash('sha256').update(seed).digest('hex')) % tot; let acc = 0n; for (const h of hs) { acc += h.raw; if (r < acc) return h; } return hs[hs.length - 1]; }
// SOL → any token via Jupiter (used for xStocks)
async function jupBuy(agent, outMint, lamports) {
  const q = await (await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${S.P.wsol}&outputMint=${outMint}&amount=${lamports}&slippageBps=150`, { signal: AbortSignal.timeout(15000) })).json();
  if (!q.outAmount) throw new Error('jupiter: no route ' + JSON.stringify(q).slice(0, 120));
  const sw = await (await fetch('https://lite-api.jup.ag/swap/v1/swap', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ quoteResponse: q, userPublicKey: agent.address, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: Math.round(PRIORITY * 1e9) }) })).json();
  if (!sw.swapTransaction) throw new Error('jupiter swap failed');
  return { sig: await S.sendAndConfirm(S.signTx(Buffer.from(sw.swapTransaction, 'base64'), [agent])), out: q.outAmount };
}
// market data (price, mcap, 1h change) from DexScreener; null until the coin has a pair
async function market(mint) {
  try { const j = await (await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, { signal: AbortSignal.timeout(10000) })).json();
    const p = (j.pairs || []).filter((x) => x.chainId === 'solana').sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    return p ? { priceUsd: +p.priceUsd, mcap: p.marketCap || p.fdv || 0, h1: (p.priceChange || {}).h1 || 0, h24: (p.priceChange || {}).h24 || 0, vol24: (p.volume || {}).h24 || 0, dex: p.dexId, url: p.url } : null; } catch { return null; }
}
// a funding transfer: who signed, how much reached `to`, and the memo text (for launch confirmation + verify page)
async function inspectTransfer(sig, to) {
  const t = await S.rpc('getTransaction', [sig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]); if (!t) return null;
  const keys = t.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey)); const i = keys.indexOf(to);
  const memo = (t.meta.logMessages || []).map((l) => (/Memo \(len \d+\): "(.*)"/.exec(l) || [])[1]).find(Boolean) || null;
  return { ok: !t.meta.err, signer: keys[0], received: i < 0 ? 0 : t.meta.postBalances[i] - t.meta.preBalances[i], memo, slot: t.slot, time: t.blockTime };
}

module.exports = { pumpTx, uploadMeta, createCoin, collectFees, buyCoin, tokenAccounts, held, burnHeld, holders, paySol, proRata, weightedPick, jupBuy, market, inspectTransfer, RENT_MIN };
