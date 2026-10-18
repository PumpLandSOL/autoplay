// real captures of the running site for the demo video: node shots-demo.cjs http://localhost:8260 <coinMint>
const { open, sleep } = require('./cdp.cjs'); const [, , U = 'http://localhost:8260', MINT] = process.argv;
(async () => { const c = await open('about:blank', 1280, 1100, 9960); const go = async (p, w = 4500) => { await c.send('Page.navigate', { url: U + p }); await sleep(w); };
  const all = `document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));1`;
  await go('/'); await c.ev(all); await sleep(800); await c.shot('shots/d-home.png');
  await go('/build?say=' + encodeURIComponent('buy back 50% and burn, airdrop 30% to top 10 holders, 20% to the creator')); await sleep(800); await c.ev('scrollTo(0,380)'); await sleep(600); await c.shot('shots/d-bench.png');
  await c.ev(`document.getElementById('launch').click();document.getElementById('nm').value='Self Playing';document.getElementById('tk').value='PLAY';document.getElementById('ds').value='a coin that buys back, burns and airdrops itself';document.getElementById('db').value='0.25';document.getElementById('db').oninput();
    const cv=document.createElement('canvas');cv.width=cv.height=96;const x=cv.getContext('2d');x.fillStyle='#ff5a36';x.fillRect(0,0,96,96);x.fillStyle='#ece4d2';x.beginPath();x.moveTo(34,24);x.lineTo(34,72);x.lineTo(74,48);x.fill();document.getElementById('pv').src=cv.toDataURL();1`); await sleep(700); await c.shot('shots/d-launch.png');
  await go('/c/' + MINT, 4000); for (let i = 0; i < 40 && !(await c.ev("!!document.getElementById('rc')")); i++) await sleep(1000); await sleep(1500); await c.shot('shots/d-coin.png');
  await go('/docs', 3500); await c.ev(`document.getElementById('webhooks').scrollIntoView();scrollBy(0,-90);1`); await sleep(500); await c.shot('shots/d-docs.png');
  c.close(); console.log('ok'); })();
