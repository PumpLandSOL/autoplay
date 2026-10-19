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
  ['autoplay-keyart.png', `Coins that play themselves.

Patch the rules. Launch on pump.fun. The coin's own fees pay for them, forever.

autoplaypad.net

$AUTO`],
  ['autoplay-howitworks.png', `Three moves. Zero code.

1. Wire the rules (or say them in one line)
2. One signature launches it on pump.fun
3. Every 10 minutes the vault claims fees and plays your patch

autoplaypad.net

$AUTO`],
  ['autoplay-modules.png', `5 triggers. 7 actions.

Fees arrive, every N hours, mcap crosses, price jumps, price drops.

Buy back, burn, airdrop holders, pay a random holder, buy a stock, pay the creator, keep.

Wire any of them together.

$AUTO`],
  ['autoplay-flywheel.png', `Its fees pay for its rules.

Trades pay creator fees. The coin's creator is its vault. The vault plays the patch: buybacks, burns, airdrops. More holders, more fees, again.

autoplaypad.net

$AUTO`],
  ['autoplay-verify.png', `Don't trust the rules. Check them.

Every patch is fingerprinted on Solana twice, by the creator and by the vault. /verify recomputes the hash in your browser. No edit endpoint.

autoplaypad.net

$AUTO`],
  ['autoplay-recipes.png', `Say it. It plays.

"buy back 70% and burn"
"airdrop 80% to the top 20 holders"
"every hour, pay one random holder"
"when mcap passes $100k, burn 50%"

Pick a recipe, launch it.

autoplaypad.net`],
  ["autoplay-say-18s.mp4", "Say it. It plays.\n\nType \"buy back 70% and burn\" and AUTOPLAY wires the patch for you. One signature launches it on pump.fun, and the coin runs it on its own fees.\n\nautoplaypad.net\n\n$AUTO"],
  ["autoplay-twocoins-18s.mp4", "Same trades. Same fees.\n\nNormal launch: fees go to the dev wallet, then get sold.\n\nAUTOPLAY launch: fees go to a vault that buys back, burns and pays holders.\n\nOne gets dumped. One plays itself.\n\n$AUTO"],
  ["autoplay-fees.png", "Your creator fees are the most honest signal a coin has.\n\nOn AUTOPLAY they can't be pocketed. They're spent by rules fingerprinted on Solana, every 10 minutes, with a receipt.\n\nautoplaypad.net\n\n$AUTO"],
  ["autoplay-patch-cant-lie.png", "A dev can lie in a TG.\n\nA patch can't.\n\nEvery AUTOPLAY coin publishes its rules, hashes them on Solana, and proves every move with a transaction.\n\nCheck any coin: autoplaypad.net\n\n$AUTO"],
  ["autoplay-build-on.png", "Building on top of AUTOPLAY? Plug in.\n\nAUTOPLAY has a public API, embeddable coin cards and signed webhooks for every buyback, burn and airdrop.\n\nautoplaypad.net/docs\n\n$AUTO"],
];
let md = '# AUTOPLAY X kit\n\nsite: https://autoplaypad.net\n', bad = 0;
T.forEach(([f, t], i) => { const n = [...t].length; if (n > 245) bad++; console.log(i + 1, n, f); md += `\n## ${i + 1}. ${f}\n\`\`\`\n${t}\n\`\`\`\n`; });
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'X-KIT.md'), md); if (bad) { console.log('OVER LIMIT:', bad); process.exit(1); }
