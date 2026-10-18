// Dependency-free Solana toolkit: base58, ed25519 keypairs (node:crypto), legacy message building,
// versioned-transaction signing, a handful of instructions, and JSON-RPC with fallback endpoints.
'use strict';
const crypto = require('crypto');

// ---------- base58 ----------
const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', AM = Object.fromEntries([...A].map((c, i) => [c, i]));
function b58enc(buf) { buf = Buffer.from(buf); let n = BigInt('0x' + (buf.toString('hex') || '0')), s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b) break; s = '1' + s; } return s; }
function b58dec(s) { let n = 0n; for (const c of s) { const v = AM[c]; if (v === undefined) throw new Error('bad base58'); n = n * 58n + BigInt(v); }
  let h = n.toString(16); if (h.length % 2) h = '0' + h; const lead = (s.match(/^1*/) || [''])[0].length; return Buffer.concat([Buffer.alloc(lead), n ? Buffer.from(h, 'hex') : Buffer.alloc(0)]); }
const isAddr = (s) => { try { return typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) && b58dec(s).length === 32; } catch { return false; } };

// ---------- keys ----------
const PK8 = Buffer.from('302e020100300506032b657004220420', 'hex'), SPKI = Buffer.from('302a300506032b6570032100', 'hex');
function keypair(seed) { seed = seed ? Buffer.from(seed) : crypto.randomBytes(32);
  const priv = crypto.createPrivateKey({ key: Buffer.concat([PK8, seed]), format: 'der', type: 'pkcs8' });
  const pub = crypto.createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(12);
  return { seed, pub: Buffer.from(pub), address: b58enc(pub), sign: (msg) => crypto.sign(null, Buffer.from(msg), priv) }; }
function verifySig(msg, addr, sig) { try { return crypto.verify(null, Buffer.from(msg), crypto.createPublicKey({ key: Buffer.concat([SPKI, b58dec(addr)]), format: 'der', type: 'spki' }), Buffer.from(sig)); } catch { return false; } }

// ---------- encoding helpers ----------
function shortvec(n) { const o = []; for (;;) { let b = n & 0x7f; n >>= 7; if (n) { o.push(b | 0x80); } else { o.push(b); return Buffer.from(o); } } }
function readShortvec(buf, off) { let n = 0, s = 0, b; do { b = buf[off++]; n |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return [n, off]; }
const u64 = (v) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };

// ---------- programs + instructions ----------
const P = { system: '11111111111111111111111111111111', memo: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', budget: 'ComputeBudget111111111111111111111111111111',
  token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', token22: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PNo3fJ3GMSzBJWGq', wsol: 'So11111111111111111111111111111111111111112' };
const ix = {
  transfer: (from, to, lamports) => ({ programId: P.system, keys: [{ pubkey: from, isSigner: true, isWritable: true }, { pubkey: to, isSigner: false, isWritable: true }], data: Buffer.concat([u32(2), u64(lamports)]) }),
  memo: (text, signer) => ({ programId: P.memo, keys: signer ? [{ pubkey: signer, isSigner: true, isWritable: false }] : [], data: Buffer.from(text, 'utf8') }),
  burn: (tokenProgram, account, mint, owner, amount) => ({ programId: tokenProgram, keys: [{ pubkey: account, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false }], data: Buffer.concat([Buffer.from([8]), u64(amount)]) }),
  cuPrice: (micro) => ({ programId: P.budget, keys: [], data: Buffer.concat([Buffer.from([3]), u64(micro)]) }),
  cuLimit: (units) => ({ programId: P.budget, keys: [], data: Buffer.concat([Buffer.from([2]), u32(units)]) }),
};

// legacy message: header, account keys (signer-writable, signer-ro, writable, ro), blockhash, compiled instructions
function compileLegacy(feePayer, ixs, blockhash) {
  const meta = new Map(); const touch = (k, s, w) => { const m = meta.get(k) || { s: false, w: false }; m.s = m.s || s; m.w = m.w || w; meta.set(k, m); };
  touch(feePayer, true, true); for (const i of ixs) { for (const k of i.keys) touch(k.pubkey, k.isSigner, k.isWritable); touch(i.programId, false, false); }
  const keys = [...meta.keys()], rank = (k) => { const m = meta.get(k); return k === feePayer ? -1 : (m.s ? 0 : 2) + (m.w ? 0 : 1); };
  keys.sort((a, b) => rank(a) - rank(b));
  const nSig = keys.filter((k) => meta.get(k).s).length, nRoSig = keys.filter((k) => meta.get(k).s && !meta.get(k).w).length, nRo = keys.filter((k) => !meta.get(k).s && !meta.get(k).w).length;
  const idx = (k) => keys.indexOf(k);
  const body = [Buffer.from([nSig, nRoSig, nRo]), shortvec(keys.length), ...keys.map(b58dec), b58dec(blockhash), shortvec(ixs.length)];
  for (const i of ixs) body.push(Buffer.from([idx(i.programId)]), shortvec(i.keys.length), Buffer.from(i.keys.map((k) => idx(k.pubkey))), shortvec(i.data.length), i.data);
  return { message: Buffer.concat(body), signers: keys.slice(0, nSig) };
}
// serialized tx = shortvec(nSig) + sigs + message
function assemble(message, signers, kps) {
  const sigs = signers.map((s) => { const k = kps.find((x) => x.address === s); return k ? k.sign(message) : Buffer.alloc(64); });
  return Buffer.concat([shortvec(signers.length), ...sigs, message]);
}
// parse any serialized tx (legacy or v0); return message bytes + required signer addresses
function parseTx(buf) {
  buf = Buffer.from(buf); let [n, off] = readShortvec(buf, 0); const sigStart = off; off += 64 * n; const message = buf.subarray(off);
  let m = 0; if (message[0] & 0x80) m = 1; const nReq = message[m]; let [nKeys, ko] = readShortvec(message, m + 3);
  const keys = []; for (let i = 0; i < nKeys; i++) keys.push(b58enc(message.subarray(ko + 32 * i, ko + 32 * i + 32)));
  return { n, sigStart, message, signers: keys.slice(0, nReq), keys, versioned: !!m };
}
// sign an externally-built tx (PumpPortal / Jupiter) with whichever of our keys it requires
function signTx(buf, kps) {
  const t = parseTx(buf), out = Buffer.from(buf);
  t.signers.forEach((s, i) => { const k = kps.find((x) => x.address === s); if (k) k.sign(t.message).copy(out, t.sigStart + 64 * i); });
  const missing = t.signers.filter((s, i) => out.subarray(t.sigStart + 64 * i, t.sigStart + 64 * i + 64).every((b) => b === 0));
  if (missing.length) throw new Error('tx needs signatures we do not hold: ' + missing.join(','));
  return out;
}
const sigOf = (buf) => { const t = parseTx(buf); return b58enc(Buffer.from(buf).subarray(t.sigStart, t.sigStart + 64)); };

// ---------- RPC ----------
const RPCS = (process.env.SOL_RPC ? process.env.SOL_RPC.split(',') : []).concat(['https://api.mainnet-beta.solana.com', 'https://solana-mainnet.gateway.tatum.io', 'https://solana-rpc.publicnode.com']);
// tries each endpoint (with one backoff retry on rate limits); a real JSON-RPC error from a healthy node is final
async function rpc(method, params = []) {
  let last; for (const url of RPCS) for (let tryN = 0; tryN < 2; tryN++) { try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
    if (r.status === 429 || r.status >= 500) { last = new Error(url + ' ' + r.status); await new Promise((z) => setTimeout(z, 800 * (tryN + 1))); continue; }
    const j = await r.json(); if (j.error) { last = new Error(j.error.message || JSON.stringify(j.error)); last.rpc = j.error;
      if (/rate|limit|personal token|not available|disabled/i.test(last.message)) break; throw last; } return j.result;
  } catch (e) { if (e.rpc) throw e; last = e; } } throw last || new Error('rpc unavailable'); }
const blockhash = async () => (await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value.blockhash;
const balance = async (a) => (await rpc('getBalance', [a, { commitment: 'confirmed' }])).value;
async function send(buf, { skipPreflight = false } = {}) { return rpc('sendTransaction', [Buffer.from(buf).toString('base64'), { encoding: 'base64', skipPreflight, maxRetries: 3, preflightCommitment: 'confirmed' }]); }
async function confirm(sig, ms = 60000) { const end = Date.now() + ms;
  while (Date.now() < end) { const s = (await rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: false }])).value[0];
    if (s && s.err) throw Object.assign(new Error('tx failed: ' + JSON.stringify(s.err)), { sig });
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return s; await new Promise((r) => setTimeout(r, 1500)); }
  throw Object.assign(new Error('not confirmed in time'), { sig }); }
async function sendAndConfirm(buf) { const sig = await send(buf); await confirm(sig); return sig; }
async function simulate(buf, sigVerify = true) { return (await rpc('simulateTransaction', [Buffer.from(buf).toString('base64'), { encoding: 'base64', sigVerify, replaceRecentBlockhash: !sigVerify, commitment: 'confirmed' }])).value; }
// build + sign + send a legacy tx from our own instructions
async function sendIxs(payer, ixs, kps) { const { message, signers } = compileLegacy(payer.address, ixs, await blockhash()); return sendAndConfirm(assemble(message, signers, kps.concat([payer]))); }

module.exports = { b58enc, b58dec, isAddr, keypair, verifySig, ix, P, compileLegacy, assemble, parseTx, signTx, sigOf, rpc, blockhash, balance, send, confirm, sendAndConfirm, simulate, sendIxs, RPCS };
