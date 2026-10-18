// one-off: FAQ accordion at the bottom of the home page
const fs = require('fs'), path = require('path'); const f = path.join(__dirname, '..', 'client', 'index.html'); let s = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const Q = [
 ['What is AUTOPLAY?', 'A launchpad for pump.fun coins that run their own rules. You wire triggers (fees arrive, a timer, a market-cap line, a price move) to actions (buy back, burn, airdrop, random holder, buy a stock, pay the creator, keep). The coin\'s vault is its creator, so its creator fees pay for those rules, forever.'],
 ['Where does the money for the rules come from?', 'From the coin\'s own creator fees. pump.fun pays creator fees on every trade to the coin\'s creator, and a AUTOPLAY coin\'s creator is its vault. The vault claims them when the claim is worth more than its gas and spends them exactly as the patch says.'],
 ['What does it cost to launch?', 'Your chosen vault buy plus 0.04 SOL: 0.03 SOL for pump.fun\'s create and 0.01 SOL kept in the vault for gas. AUTOPLAY takes no fee and has no team allocation of any coin.'],
 ['Can the rules be changed after launch?', 'No. There is no edit endpoint, and the patch\'s SHA-256 fingerprint is written on Solana by both the creator and the vault. If anyone changed the rules, the fingerprint would stop matching and /verify would show it.'],
 ['How do I know a coin really runs its patch?', 'Every action is a Solana transaction signed by the coin\'s vault, listed as a receipt with a Solscan link. The verify page recomputes the patch fingerprint in your browser and checks it against the memos on-chain.'],
 ['Who holds the vault key?', 'The AUTOPLAY executor, encrypted at rest with AES-256-GCM. It only signs the transactions the patch prescribes, and every one of them is public.'],
 ['How often does a coin act?', 'Every 10 minutes the executor checks each coin: it simulates the fee claim for free, claims when it\'s worth it, reads the market, and fires whichever triggers are due.'],
 ['How is the random holder picked?', 'Among the top 20 real holders (the bonding curve, pools and the vault are excluded), weighted by balance, using sha256 of the run\'s Solana blockhash and the mint. The seed and winner are in the receipt, so anyone can recompute the pick.'],
 ['Who gets airdrops?', 'The top N holders you choose (3 to 20), pro rata to their balance, in SOL. Shares too small to open a brand-new Solana account are skipped so one tiny share never fails the batch.'],
 ['What stocks can a coin buy?', 'TSLA, NVDA and SPY as xStocks, tokenized equities traded on Solana, swapped through Jupiter. The vault holds them and the coin page shows its holdings live.'],
 ['What happens after the coin graduates from the bonding curve?', 'Everything keeps working: buybacks route through PumpSwap and the creator-fee claim covers both the curve and the pool.'],
 ['What if a launch or an action fails?', 'If pump.fun\'s create fails, the vault refunds everything to your wallet automatically. If an action fails during a run, it\'s logged as a receipt with the reason and the SOL stays in the vault for the next run.'],
 ['Can I build on top of AUTOPLAY?', 'Yes. There\'s a public JSON API, embeddable coin cards at /embed/<mint>, and HMAC-signed webhooks that push every receipt to your server. See the docs.'],
];
const css = `.faq{max-width:860px;margin:26px auto 0;display:grid;gap:10px}.faq details{padding:0;overflow:hidden}.faq summary{list-style:none;cursor:pointer;padding:26px 56px 20px 22px;font-family:var(--disp);font-weight:700;font-size:17px;position:relative}.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'';position:absolute;right:22px;top:50%;width:22px;height:22px;margin-top:-6px;border-radius:50%;background:radial-gradient(circle,#0d0b09 0 4px,#bdb3a0 5px 7px,#77705f 8px 9px,#d6cdb9 10px);transition:transform .3s}
.faq details[open] summary::after{transform:rotate(180deg);box-shadow:0 0 0 3px var(--min)}.faq details[open]{box-shadow:inset 0 1px 0 #fff8,inset 0 -2px 0 #0002,0 10px 30px rgba(0,0,0,.45),0 0 0 2px var(--min)}
.faq .a{padding:0 22px 22px;color:var(--ink2);font-size:15px;line-height:1.65;animation:fq .35s ease}@keyframes fq{from{opacity:0;transform:translateY(-6px)}}`;
s = s.replace('</style></head>', css + '\n</style></head>');
const html = `<h2 id="faq" style="scroll-margin-top:90px">Questions.</h2><p class="sub">Everything people ask before they launch.</p>
<div class="faq">${Q.map(([q, a]) => `<details class="plate rv"><summary>${q}</summary><div class="a">${a.replace(/</g, '&lt;')}</div></details>`).join('\n')}</div>
</main>`;
const i = s.lastIndexOf('</main>'); if (i < 0) throw new Error('no main'); s = s.slice(0, i) + html + s.slice(i + 7);
fs.writeFileSync(f, s); console.log('ok', Q.length);
