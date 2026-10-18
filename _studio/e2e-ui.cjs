// UI launch path with a mock Phantom (real ed25519 key in the page): bench → launch modal → prepare → the wallet is asked
// to sign a funding message; we decode that message and check payer, vault, lamports and memo.
const { open, sleep } = require('./cdp.cjs'); const S = require('../server/sol'); const U = process.argv[2] || 'http://localhost:8261';
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', m); };
(async () => { const c = await open('about:blank', 1440, 1000, 9871); await c.send('Page.navigate', { url: U + '/build?say=' + encodeURIComponent('buy back 60% and burn, airdrop 30% to top 10 holders, keep the rest') }); await sleep(4500);
  const user = S.keypair();
  await c.ev(`window.__msgs=[];window.phantom={solana:{isPhantom:true,connect:async()=>({publicKey:{toString:()=>'${user.address}'}}),on(){},request:async({method,params})=>{window.__msgs.push(params.message);return {signature:'5'.repeat(88)}}}};1`);
  ok((await c.ev(`document.getElementById('rules').innerText`)).includes('60% buys the coin back'), 'sentence patched onto the bench');
  const fp = await c.ev(`document.getElementById('fp').textContent`); ok(/^[0-9a-f]{64}$/.test(fp), 'fingerprint shown: ' + fp.slice(0, 16) + '…');
  await c.ev(`document.getElementById('launch').click();1`); await sleep(400);
  await c.ev(`(async()=>{await connect();document.getElementById('nm').value='Self Playing';document.getElementById('tk').value='PLAY';document.getElementById('db').value='0.25';document.getElementById('db').oninput();
    const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle='#ff5a36';x.fillRect(0,0,64,64);IMG=cv.toDataURL('image/png');goBtn();return 1})()`);
  ok((await c.ev(`document.getElementById('go').textContent`)).includes('0.29 SOL'), 'button shows total: vault buy 0.25 + 0.04');
  await c.ev(`document.getElementById('go').click();1`); await sleep(9000);
  const msgs = await c.ev('window.__msgs'); ok(msgs.length === 1, 'wallet asked to sign exactly one transaction');
  const m = Buffer.from(S.b58dec(msgs[0])), keys = []; for (let i = 0; i < m[3]; i++) keys.push(S.b58enc(m.subarray(4 + 32 * i, 36 + 32 * i)));
  ok(keys[0] === user.address, 'payer = connected wallet');
  const lam = Number(m.readBigUInt64LE(4 + 32 * keys.length + 32 + 1 + 1 + 1 + 1 + 1 + 1 + 4)); ok(lam === 290_000_000, 'transfer amount = 0.29 SOL (' + lam + ')');
  const memo = m.subarray(m.length - 76).toString(); ok(memo === 'patchbay:v1:' + fp, 'memo = patchbay:v1:<fingerprint>');
  ok(keys[2] === '11111111111111111111111111111111' && keys[3] === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'programs: System transfer + Memo');
  await sleep(32000); const err = await c.ev(`document.getElementById('lerr').textContent`); ok(/not found|failed/i.test(err), 'confirm refuses a signature that is not on-chain: "' + err.slice(0, 60) + '"');
  await c.shot('shots/launch-modal.png'); c.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
