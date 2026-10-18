// one-off: 5-column sitemap footer + "My coins" in the nav
const fs = require('fs'), path = require('path'); const f = path.join(__dirname, '..', 'client', 'common.js'); let s = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const lines = s.split('\n'); const i = lines.findIndex((l) => l.includes("const f = document.createElement('footer')"));
lines[i] = `  const COLS = [['Platform', [['Builder', '/build'], ['Quick launch', '/#quick'], ['Explore', '/coins'], ['Flywheel', '/docs#flywheel'], ['My coins', '/me'], ['Brand', '/docs#brand']]],
    ['Build with', [['Examples', '/#recipes'], ['Modules', '/docs#modules'], ['Stock rules', '/docs#stocks'], ['Rules gallery', '/docs#gallery'], ['Embed', '/docs#embed']]],
    ['Docs', [['Receipts', '/docs#receipts'], ['Verify on Solana', '/docs#verify'], ['Vault', '/docs#vault'], ['FAQ', '/#faq'], ['Launching', '/docs#launching']]],
    ['Legal', [['Terms', '/docs#terms'], ['Risks', '/docs#risks'], ['Privacy', '/docs#privacy']]],
    ['Network', [['Solana', 'https://solana.com'], ['pump.fun', 'https://pump.fun'], ['Webhooks', '/docs#webhooks']]]];
  const f = document.createElement('footer'); f.innerHTML = \`<div class="wrap fcols"><div class="fbrand"><span class="brand" style="font-size:16px">\${LOGO}PATCHBAY</span><p>Coins that play themselves. Launched on pump.fun, rules fingerprinted on Solana, every move on-chain.</p></div>\${COLS.map(([h, ls]) => \`<div class="fcol"><h5>\${h}</h5>\${ls.map(([t, u]) => \`<a href="\${u}"\${/^https/.test(u) ? ' target="_blank" rel="noopener"' : ''}>\${t}</a>\`).join('')}</div>\`).join('')}</div><div class="wrap fbar"><span>© \${new Date().getFullYear()} PATCHBAY</span><span>no team tokens · no platform fee · every action has a receipt</span></div>\`; document.body.append(f);`;
s = lines.join('\n');
s = s.replace("[['/build', 'Build'], ['/coins', 'Coins'], ['/docs', 'How it works']]", "[['/build', 'Build'], ['/coins', 'Coins'], ['/me', 'My coins'], ['/docs', 'Docs']]");
fs.writeFileSync(f, s);
const c = path.join(__dirname, '..', 'client', 'patch.css'); let css = fs.readFileSync(c, 'utf8');
if (!css.includes('.fcols')) css += `
.fcols{display:grid;grid-template-columns:1.4fr repeat(5,1fr);gap:28px;align-items:start}.fbrand p{color:#8d8372;font-family:var(--body);font-size:13.5px;line-height:1.55;margin-top:12px;max-width:260px}
.fcol h5{font-family:var(--mono);font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:#8d8372;font-weight:600;margin-bottom:14px}
.fcol a{display:block;font-family:var(--body);font-size:15px;font-weight:600;color:var(--panel);margin-bottom:12px;transition:color .15s,transform .15s}.fcol a:hover{color:var(--mus);transform:translateX(3px)}
.fbar{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid #2c261f;margin-top:30px;padding-top:20px;font-size:11.5px;color:#6d6455}
@media(max-width:900px){.fcols{grid-template-columns:1fr 1fr}.fbrand{grid-column:1/-1}}
`;
fs.writeFileSync(c, css); console.log('ok');
