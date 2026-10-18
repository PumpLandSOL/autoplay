// PATCHBAY rules: a patch is trigger modules wired to action modules. Each wire carries a share of the
// trigger's budget. A patch is canonicalized and SHA-256 fingerprinted; the fingerprint goes on-chain at launch.
'use strict';
const crypto = require('crypto');

const STOCKS = { TSLA: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', NVDA: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', SPY: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W' };

// module catalogue: what the editor shows and what the engine accepts
const TRIGGERS = {
  fees: { label: 'Creator fees arrive', desc: 'Every run, the coin collects its pump.fun creator fees. The amount collected is the budget.', params: {} },
  every: { label: 'Every N hours', desc: 'On a timer. Budget is a share of the vault\'s spare SOL.', params: { hours: [1, 168, 6], pctOfVault: [1, 50, 10] } },
  mcap: { label: 'Market cap crosses', desc: 'Fires once when market cap first crosses the line. Budget is a share of the vault\'s spare SOL.', params: { usd: [10000, 100000000, 100000], pctOfVault: [1, 100, 25] } },
  pump: { label: 'Price jumps', desc: 'Fires when the 1h price change is at least this much (cooldown 6h).', params: { pct: [5, 500, 25], pctOfVault: [1, 50, 10] } },
  dump: { label: 'Price drops', desc: 'Fires when the 1h price change is at least this much down (cooldown 6h).', params: { pct: [5, 90, 20], pctOfVault: [1, 50, 15] } },
};
const ACTIONS = {
  buyback: { label: 'Buy back', desc: 'Spend SOL buying the coin. Tokens stay in the vault.', params: {} },
  burn: { label: 'Burn', desc: 'Burn a share of the coin the vault holds. Gone for good.', params: { pctOfHeld: [1, 100, 100] }, tokens: true },
  airdrop: { label: 'Airdrop holders', desc: 'Send SOL to the top holders, pro rata to their balance.', params: { top: [3, 20, 20] } },
  lottery: { label: 'Pay a random holder', desc: 'One top-20 holder, picked weighted by balance from the run\'s blockhash, gets the SOL.', params: {} },
  stock: { label: 'Buy a stock', desc: 'Buy tokenized stock (xStocks) and hold it in the vault.', params: { ticker: [Object.keys(STOCKS)] } },
  creator: { label: 'Pay the creator', desc: 'Send SOL to the wallet that launched the coin.', params: {} },
  keep: { label: 'Keep in vault', desc: 'Leave it in the vault for later triggers.', params: {} },
};

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(+v)));
// validate + normalize; returns {patch} or {error}
function normalize(p) {
  if (!p || !Array.isArray(p.triggers) || !Array.isArray(p.actions) || !Array.isArray(p.wires)) return { error: 'patch needs triggers, actions, wires' };
  if (p.triggers.length < 1 || p.triggers.length > 6 || p.actions.length < 1 || p.actions.length > 10 || p.wires.length > 24) return { error: '1-6 triggers, 1-10 actions, up to 24 wires' };
  const ids = new Set(), norm = (list, cat) => list.map((m) => { const c = cat[m && m.type]; if (!c) throw new Error('unknown module ' + (m && m.type));
    const id = String(m.id || '').slice(0, 12); if (!/^[a-z0-9]{1,12}$/.test(id) || ids.has(id)) throw new Error('bad or duplicate module id'); ids.add(id);
    const params = {}; for (const [k, spec] of Object.entries(c.params)) { if (Array.isArray(spec[0])) { const v = String((m.params || {})[k] || spec[0][0]).toUpperCase(); if (!spec[0].includes(v)) throw new Error(k + ' must be one of ' + spec[0].join('/')); params[k] = v; } else params[k] = clamp((m.params || {})[k] ?? spec[2], spec); }
    return { id, type: m.type, params }; });
  let triggers, actions; try { triggers = norm(p.triggers, TRIGGERS); actions = norm(p.actions, ACTIONS); } catch (e) { return { error: e.message }; }
  const T = new Set(triggers.map((t) => t.id)), Ac = new Map(actions.map((a) => [a.id, a])), seen = new Set();
  const wires = []; for (const w of p.wires) { if (!T.has(w.from) || !Ac.has(w.to)) return { error: 'wire must go trigger → action' }; const key = w.from + '>' + w.to; if (seen.has(key)) return { error: 'duplicate wire' }; seen.add(key);
    const share = ACTIONS[Ac.get(w.to).type].tokens ? 0 : clamp(w.share, [1, 100]); wires.push({ from: w.from, to: w.to, share }); }
  for (const t of triggers) { const sum = wires.filter((w) => w.from === t.id).reduce((s, w) => s + w.share, 0); if (sum > 100) return { error: 'wires out of one trigger add up to ' + sum + '% (max 100)' }; }
  for (const a of actions) if (!wires.some((w) => w.to === a.id)) return { error: '"' + ACTIONS[a.type].label + '" has no cable plugged in' };
  if (!wires.length) return { error: 'patch at least one cable' };
  return { patch: { v: 1, triggers, actions, wires } };
}
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const fingerprint = (patch) => crypto.createHash('sha256').update(canon(patch)).digest('hex');

// plain-English description of a patch (also used on the coin page)
function describe(patch) {
  const A = new Map(patch.actions.map((a) => [a.id, a])), out = [];
  for (const t of patch.triggers) { const ws = patch.wires.filter((w) => w.from === t.id); if (!ws.length) continue;
    const head = t.type === 'fees' ? 'When creator fees arrive' : t.type === 'every' ? `Every ${t.params.hours}h, with ${t.params.pctOfVault}% of the vault` : t.type === 'mcap' ? `When market cap first passes $${t.params.usd.toLocaleString()}, with ${t.params.pctOfVault}% of the vault` : t.type === 'pump' ? `When price jumps ${t.params.pct}% in an hour, with ${t.params.pctOfVault}% of the vault` : `When price drops ${t.params.pct}% in an hour, with ${t.params.pctOfVault}% of the vault`;
    out.push(head + ': ' + ws.map((w) => { const a = A.get(w.to); if (a.type === 'burn') return 'then ' + a.params.pctOfHeld + '% of the coins the vault holds are burned'; return w.share + '% ' + ({ buyback: 'buys the coin back', airdrop: `airdrops to the top ${a.params.top} holders`, lottery: 'pays one random holder', stock: `buys ${a.params.ticker}`, creator: 'pays the creator', keep: 'stays in the vault' })[a.type]; }).join(', ') + '.'); }
  return out;
}

// sentence → patch (deterministic). Covers the phrasing people actually type; the editor fixes the rest.
function parse(text) {
  const s = String(text || '').toLowerCase(), t = [], a = [], w = []; let n = 0; const id = () => 'm' + (++n);
  const num = (re, d) => { const m = s.match(re); return m ? +m[1].replace(/,/g, '') : d; };
  let trig;
  if (/every\s+(\d+)\s*(h|hour)/.test(s)) trig = { id: id(), type: 'every', params: { hours: num(/every\s+(\d+)\s*(?:h|hour)/, 6), pctOfVault: num(/(\d+)%\s*of\s*(?:the\s*)?vault/, 10) } };
  else if (/every\s+(hour|day)/.test(s)) trig = { id: id(), type: 'every', params: { hours: /day/.test(s) ? 24 : 1, pctOfVault: 10 } };
  else if (/market\s*cap|mcap/.test(s)) { const m = s.match(/\$?\s*([\d.]+)\s*(k|m)?/); const usd = m ? +m[1] * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1) : 100000; trig = { id: id(), type: 'mcap', params: { usd, pctOfVault: 25 } }; }
  else if (/(pump|jump|moon|up)\s.*?(\d+)%/.test(s) && /price/.test(s)) trig = { id: id(), type: 'pump', params: { pct: num(/(\d+)%/, 25), pctOfVault: 10 } };
  else if (/(drop|dip|dump|down)/.test(s) && /price/.test(s)) trig = { id: id(), type: 'dump', params: { pct: num(/(\d+)%/, 20), pctOfVault: 15 } };
  else trig = { id: id(), type: 'fees', params: {} };
  t.push(trig);
  // "every hour, send 20% of fees/the vault to …": the % sizes the timer budget and the action takes all of it
  let s2 = s; const ofv = s.match(/(\d+)\s*%\s*of\s*(?:the\s*)?(?:fees|vault|treasury)/);
  if (ofv && trig.params.pctOfVault !== undefined) { trig.params.pctOfVault = +ofv[1]; s2 = s.replace(ofv[0], ''); }
  const parts = s2.split(/,|\band\b|\bthen\b|;/).map((x) => x.trim()).filter(Boolean); let rest = 100;
  const add = (type, params, share) => { share = Math.max(1, Math.min(rest, share)); rest -= share; const x = { id: id(), type, params }; a.push(x); w.push({ from: trig.id, to: x.id, share }); };
  for (const p of parts) { const pct = (p.match(/(\d+)\s*%/) || [])[1], half = /half/.test(p) ? 50 : /quarter/.test(p) ? 25 : /third/.test(p) ? 33 : null, share = +(pct || half || 0);
    if (/buy\s*back|buyback/.test(p)) add('buyback', {}, share || rest);
    else if (/burn/.test(p)) { const b = { id: id(), type: 'burn', params: { pctOfHeld: +(pct || 100) } }; a.push(b); w.push({ from: trig.id, to: b.id, share: 0 }); }
    else if (/random|lottery|lucky/.test(p)) add('lottery', {}, share || rest);
    else if (/airdrop|holders|share/.test(p)) add('airdrop', { top: num(/top\s*(\d+)/, 20) }, share || rest);
    else if (/tesla|tsla/.test(p)) add('stock', { ticker: 'TSLA' }, share || rest);
    else if (/nvidia|nvda/.test(p)) add('stock', { ticker: 'NVDA' }, share || rest);
    else if (/spy|s&p|sp500/.test(p)) add('stock', { ticker: 'SPY' }, share || rest);
    else if (/\bcreator\b|\bme\b|\bdev\b|\bmyself\b/.test(p)) add('creator', {}, share || rest);
    else if (/keep|save|vault|treasury/.test(p) && !/of\s*(the\s*)?vault/.test(p)) add('keep', {}, share || rest);
    if (rest <= 0) break; }
  if (!a.length) add('buyback', {}, 50), add('airdrop', { top: 20 }, 50);
  return normalize({ triggers: t, actions: a, wires: w });
}

module.exports = { TRIGGERS, ACTIONS, STOCKS, normalize, fingerprint, canon, describe, parse };
