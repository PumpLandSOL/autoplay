// AUTOPLAY X kit: node tweets.cjs → brand/X-KIT.md (fails if any tweet is over 245 characters)
const fs = require('fs'), path = require('path');
const T = [
  ['autoplay-hype-16s.mp4', `Your coin launches. Then it just sits there.

Not anymore. AUTOPLAY coins play themselves: patch the rules once, and the coin's own creator fees buy back, burn and airdrop holders. Forever.

autoplaypad.net

$AUTO`],
  ['autoplay-demo-31s.mp4', `Patch a coin in one line. Launch it on pump.fun in one signature. Watch it play.

Every buyback, burn and airdrop lands on Solana with a receipt.

autoplaypad.net

$AUTO`],
  ['autoplay-explainer-34s.mp4', `How AUTOPLAY works:

pump.fun pays creator fees on every trade. On AUTOPLAY the creator is a vault, and the vault spends those fees exactly how you patched it. Fingerprinted on Solana.

autoplaypad.net`],
  ['autoplay-vs.png', `pump.fun hit $8.8B. Virtuals $5.1B. Zora $1.5B (ATH, fully diluted).

None of them let a coin spend its own fees by rules.

AUTOPLAY does. Buybacks, burns, airdrops, stocks, receipts.

$AUTO`],
];
let md = '# AUTOPLAY X kit\n\nsite: https://autoplaypad.net\n', bad = 0;
T.forEach(([f, t], i) => { const n = [...t].length; if (n > 245) bad++; console.log(i + 1, n, f); md += `\n## ${i + 1}. ${f}\n\`\`\`\n${t}\n\`\`\`\n`; });
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'X-KIT.md'), md); if (bad) { console.log('OVER LIMIT:', bad); process.exit(1); }
