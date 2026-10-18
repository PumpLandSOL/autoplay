// builds the three AUTOPLAY video scene pages (src/demo.html, src/hype.html, src/explain.html); render with video.cjs
'use strict';
const fs = require('fs'), path = require('path'); const SRC = path.join(__dirname, 'src');
const HEAD = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="_v.css">`;

// ---------- 1. demo: a guided tour over real captures ----------
const TOURCSS = `<style>.win{position:absolute;left:190px;top:118px;width:900px;height:562px;border-radius:12px;overflow:hidden;border:2px solid #3a3229;box-shadow:0 30px 90px rgba(0,0,0,.8),0 0 60px rgba(255,90,54,.12);background:#0f0d0b}
.bar{height:38px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#1d1915;border-bottom:1px solid #2c261f}.bar i{width:11px;height:11px;border-radius:50%;background:#3a3229;display:block}
.url{margin-left:14px;flex:1;height:24px;border-radius:7px;background:#14110e;font-family:'IBM Plex Mono';font-size:13px;display:flex;align-items:center;padding:0 12px;color:#a89d88}.url b{color:#ece4d2;font-weight:500}
.vp{position:absolute;top:38px;left:0;right:0;bottom:0;overflow:hidden}.vp img{position:absolute;left:0;top:0;width:900px;transform-origin:0 0}
.hl{position:absolute;border:3px solid #19c98a;border-radius:8px;box-shadow:0 0 24px rgba(25,201,138,.5)}.cap{position:absolute;left:0;right:0;top:40px;text-align:center}.cap .d{font-weight:700}</style>`;
const TOUR = { hlc: '#19c98a',
  intro: ['autoplaypad.net · real captures', 'Patch a coin.<br><span class="g">Watch it play.</span>', 'The full flow, start to finish'],
  scenes: [
    [2.8, '01 / SAY IT OR PATCH IT', 'Type one line, or wire triggers to actions', 'd-home.png', '/', [0, 140], [150, 170, 980, 230]],
    [7.2, '02 / THE BENCH', 'Cables carry each action\'s share of the fees', 'd-bench.png', '/build', [0, 40], [215, 55, 730, 620]],
    [11.6, '03 / ONE SIGNATURE', 'Name it, add an image, choose the vault buy', 'd-launch.png', '/build', [40, 160], [320, 160, 640, 790]],
    [16, '04 / IT PLAYS', 'Fees claimed, bought back, burned, airdropped', 'd-coin.png', '/c/PLAY', [0, 90], [20, 255, 1240, 80]],
    [20.2, '05 / EVERY MOVE, A RECEIPT', 'Each one links to its Solana transaction', 'd-coin.png', '/c/PLAY', [430, 560], [20, 700, 700, 330]],
    [24.4, '06 / BUILD ON IT', 'Public API, embeds and signed webhooks', 'd-docs.png', '/docs#webhooks', [0, 80], null]],
  end: 28.4, outro: '<div class="k">AUTOPLAY · on pump.fun</div><div class="d" style="font-size:62px;line-height:1.08;margin-top:14px">Coins that <span class="g">play</span><br>themselves.</div><div class="m" style="font-size:26px;margin-top:26px;color:#ffc12e">autoplaypad.net · $AUTO</div>' };
fs.writeFileSync(path.join(SRC, 'demo.html'), HEAD + TOURCSS + `<body><script>window.TOUR=${JSON.stringify(TOUR)}</script><script src="tour.js"></script>`);

// shared animation helpers for the motion pieces
const LIB = `const $=(i)=>document.getElementById(i),cl=(x)=>Math.max(0,Math.min(1,x)),e=(x)=>1-Math.pow(1-cl(x),3),win=(t,a,b,f=.3)=>cl((t-a)/f)*cl((b-t)/f);
const cv=$('bg'),x=cv.getContext('2d');function bg(t,int){x.fillStyle='#14110e';x.fillRect(0,0,1280,720);for(let i=0;i<1280;i+=48){x.fillStyle='rgba(236,228,210,'+(.035*int)+')';for(let j=0;j<720;j+=48){x.beginPath();x.arc(i+24,j+24,1.6,0,7);x.fill();}}
 x.strokeStyle='rgba(156,247,198,'+(.35*int)+')';x.lineWidth=2;x.beginPath();for(let i=0;i<=1280;i+=8){const p=Math.exp(-Math.pow((i-((t*420)%1700)+200)/60,2));x.lineTo(i,660+Math.sin(i/26-t*5)*5*(1-p)-p*30*Math.sin(i/7));}x.stroke();}
const cable=(x1,y1,x2,y2,c,p)=>{const d='M'+x1+' '+y1+' C'+x1+' '+(y1+110)+' '+x2+' '+(y2-110)+' '+x2+' '+y2;return '<path d="'+d+'" stroke="#000a" stroke-width="14" fill="none" transform="translate(0,5)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="'+(1-p)+'"/><path d="'+d+'" stroke="'+c+'" stroke-width="11" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="'+(1-p)+'"/>';};`;
const STYLE = `<style>.mod{position:absolute;width:190px;padding:22px 16px 16px;border-radius:8px;background:#ece4d2;color:#1b1712;box-shadow:inset 0 1px 0 #fff8,0 14px 30px rgba(0,0,0,.55)}.mod .s{font-family:'IBM Plex Mono';font-size:11px;letter-spacing:.18em;color:#5b5246}.mod .t{font-family:Unbounded;font-weight:700;font-size:20px;margin-top:6px;letter-spacing:-.02em}
.mod i{position:absolute;top:9px;left:14px;width:10px;height:10px;border-radius:50%;background:#5a1d12}.mod i.on{background:#19c98a;box-shadow:0 0 10px #19c98a}.that{color:transparent;-webkit-text-stroke:2px #cfc5af}.led{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:#19c98a;box-shadow:0 0 .4em #19c98a;margin-left:.05em}</style>`;

// ---------- 2. hype: 16s kinetic ----------
fs.writeFileSync(path.join(SRC, 'hype.html'), HEAD + STYLE + `<body><canvas id="bg" width="1280" height="720"></canvas>
<div class="c" id="a"><div><div class="k">every other launchpad</div><div class="d" style="font-size:78px;margin-top:16px;line-height:1.05">Your coin launches.<br><span style="color:#a89d88">Then it just sits there.</span></div></div></div>
<div class="c" id="b"><div class="d" style="font-size:150px;line-height:.95">Not<br><span class="g">anymore.</span></div></div>
<div id="c" style="position:absolute;inset:0"><div class="cap" style="position:absolute;top:44px;left:0;right:0;text-align:center"><div class="k">patch it once</div><div class="d" style="font-size:44px;margin-top:8px">It <span class="g">plays</span> forever.</div></div>
 <div class="mod" id="m0" style="left:545px;top:170px"><i class="on"></i><div class="s">TRIGGER</div><div class="t">Fees arrive</div></div>
 ${['Buy back', 'Burn', 'Airdrop', 'Buy TSLA'].map((t, i) => `<div class="mod" id="m${i + 1}" style="left:${130 + i * 270}px;top:470px"><i id="l${i + 1}"></i><div class="s">ACTION</div><div class="t">${t}</div></div>`).join('')}
 <svg id="w" style="position:absolute;inset:0" viewBox="0 0 1280 720"></svg></div>
<div class="c" id="d"><div class="d" style="font-size:96px;line-height:1.02" id="words"></div></div>
<div class="c" id="e"><div><div class="k">every 10 minutes · every move on-chain</div><div class="d" style="font-size:84px;margin-top:18px;line-height:1.05">Paid for by<br><span class="g">its own fees.</span></div></div></div>
<div class="c" id="f"><div><div class="d" style="font-size:100px;letter-spacing:.02em">AUTOPLAY</div><div class="d" style="font-size:46px;margin-top:14px">Coins <span class="that">that</span> <span class="g">play</span> themselves<span class="led"></span></div><div class="m" style="font-size:28px;margin-top:30px;color:#ffc12e">autoplaypad.net · $AUTO</div></div></div>
<script>${LIB}
const W=['Buy back.','Burn.','Airdrop holders.','Buy TSLA.','Pay a random holder.'],C=['#ff5a36','#ffc12e','#19c98a','#2f6bff'];
window.__seek=(t)=>{bg(t,t<5?.4:1);$('a').style.opacity=win(t,.1,2.6);$('b').style.opacity=win(t,2.6,4.6);$('b').firstChild.style.transform='scale('+(1.25-.25*e((t-2.6)/.5))+')';
 $('c').style.opacity=win(t,4.6,9.4);let h='';for(let i=0;i<4;i++){const p=e((t-5.3-i*.35)/.7);h+=cable(640,270,225+i*270,470,C[i],p);$('l'+(i+1)).className=p>.98?'on':'';$('m'+(i+1)).style.transform='translateY('+(1-e((t-4.8-i*.12)/.4))*60+'px)';}$('w').innerHTML=h;
 $('d').style.opacity=win(t,9.4,12.2);const k=Math.min(W.length-1,Math.floor((t-9.4)/.56));$('words').innerHTML=t>9.4?W.slice(0,k+1).map((w,i)=>'<div style="opacity:'+(i===k?1:.28)+'">'+w+'</div>').slice(-3).join(''):'';
 $('e').style.opacity=win(t,12.2,14.4);$('f').style.opacity=e((t-14.4)/.5);};window.__ready=document.fonts.ready;window.__seek(0);</script>`);

// ---------- 3. explainer: 34s, how it works ----------
fs.writeFileSync(path.join(SRC, 'explain.html'), HEAD + STYLE + `<style>.st{position:absolute;inset:0}.ttl{position:absolute;top:46px;left:0;right:0;text-align:center}.ttl .d{font-size:42px;margin-top:8px}
.box{position:absolute;border-radius:10px;font-family:Unbounded;font-weight:700;display:grid;place-items:center;text-align:center}.coin{position:absolute;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe08a,#e0a000);box-shadow:0 0 12px rgba(255,193,46,.7)}
.term{position:absolute;left:250px;top:200px;width:780px;padding:26px 30px;font-size:21px;line-height:1.9}.rc{display:flex;justify-content:space-between;gap:20px;padding:12px 18px;border-bottom:1px dashed #3a3229;font-family:'IBM Plex Mono';font-size:19px}</style>
<body><canvas id="bg" width="1280" height="720"></canvas>
<div class="c" id="s0"><div><div class="k">how autoplay works</div><div class="d" style="font-size:88px;margin-top:16px;line-height:1.02">A coin that runs<br><span class="g">its own rules.</span></div><div class="m mu" style="font-size:20px;margin-top:22px">in 30 seconds</div></div></div>
<div class="st" id="s1"><div class="ttl"><div class="k">01 · the money</div><div class="d">Every pump.fun trade pays <span class="g">creator fees.</span></div></div>
 <div class="box plate" style="left:140px;top:300px;width:280px;height:150px;font-size:26px">TRADES</div><div class="box plate" style="left:860px;top:300px;width:280px;height:150px;font-size:26px" id="cr">CREATOR</div><div id="f1"></div></div>
<div class="st" id="s2"><div class="ttl"><div class="k">02 · the twist</div><div class="d">On AUTOPLAY, the creator is a <span class="g">vault.</span></div></div>
 <div class="box" style="left:440px;top:230px;width:400px;height:260px;border:4px solid #ece4d2;border-top:0;border-radius:0 0 18px 18px;font-size:30px;color:#ece4d2">VAULT<div class="m" style="font-size:15px;font-family:'IBM Plex Mono';font-weight:400;color:#a89d88;position:absolute;bottom:18px">its own keypair · the coin's creator</div></div><div id="f2"></div></div>
<div class="st" id="s3"><div class="ttl"><div class="k">03 · the patch</div><div class="d">You wire what the vault does <span class="g">with every fee.</span></div></div>
 <div class="mod" style="left:545px;top:160px"><i class="on"></i><div class="s">TRIGGER</div><div class="t">Fees arrive</div></div>
 ${[['Buy back', '50%'], ['Burn', 'held'], ['Airdrop', '30%'], ['Creator', '20%']].map(([t, s], i) => `<div class="mod" id="e${i}" style="left:${130 + i * 270}px;top:480px"><i id="el${i}"></i><div class="s">ACTION · ${s}</div><div class="t">${t}</div></div>`).join('')}<svg id="w3" style="position:absolute;inset:0" viewBox="0 0 1280 720"></svg></div>
<div class="st" id="s4"><div class="ttl"><div class="k">04 · locked in</div><div class="d">Its fingerprint goes <span class="g">on Solana.</span></div></div><div class="lcd term" id="t4"></div></div>
<div class="st" id="s5"><div class="ttl"><div class="k">05 · forever</div><div class="d">Every 10 minutes, <span class="g">it plays.</span></div></div><svg id="ring" style="position:absolute;inset:0" viewBox="0 0 1280 720"></svg></div>
<div class="st" id="s6"><div class="ttl"><div class="k">06 · proof</div><div class="d">Every move is a <span class="g">receipt.</span></div></div><div style="position:absolute;left:230px;top:190px;width:820px" class="plate" id="r6"></div></div>
<div class="c" id="s7"><div><div class="d" style="font-size:92px;letter-spacing:.02em">AUTOPLAY</div><div class="d" style="font-size:42px;margin-top:12px">Patch it. <span class="g">It plays itself.</span></div><div class="m" style="font-size:26px;margin-top:28px;color:#ffc12e">autoplaypad.net · $AUTO</div></div></div>
<script>${LIB}
const T=[0,3.6,8,12.6,17.6,22.4,27.6,31.6],C=['#ff5a36','#ffc12e','#19c98a','#8c5cff'];
const coins=(id,t,t0,x0,x1,y,n)=>{let h='';for(let i=0;i<n;i++){const p=((t-t0)*.7+i/n)%1;h+='<span class="coin" style="left:'+(x0+(x1-x0)*p)+'px;top:'+(y+Math.sin(p*Math.PI)*-60)+'px;opacity:'+(t>t0?Math.min(1,p*5,(1-p)*5):0)+'"></span>';}$(id).innerHTML=h;};
const L4=['› canon(patch) → sha256','› a4f1c09e7b2d5f38…91c','› creator signs  memo autoplay:v1:a4f1…  ✓','› vault signs    memo autoplay:v1:<mint>:a4f1…  ✓','› no edit endpoint. change a rule, the hash breaks.'];
const R6=[['FEES IN','collected 0.2140 SOL in creator fees','#19c98a'],['BUYBACK','bought back $PLAY with 0.1070 SOL','#ff5a36'],['BURN','burned 1,284,000 $PLAY','#ffc12e'],['AIRDROP','airdropped 0.0642 SOL to 10 holders','#19c98a'],['CREATOR','paid the creator 0.0428 SOL','#8c5cff']];
window.__seek=(t)=>{bg(t,t<T[1]||t>T[7]?.4:1);for(let i=0;i<8;i++){const el=$('s'+i);el.style.opacity=i===7?e((t-T[7])/.5):win(t,T[i],T[i+1]||99);}
 coins('f1',t,T[1]+.6,420,860,355,6);coins('f2',t,T[2]+.4,200,560,330,6);
 let h='';for(let i=0;i<4;i++){const p=e((t-T[3]-.5-i*.45)/.7);h+=cable(640,262,225+i*270,480,C[i],p);$('el'+i).className=p>.98?'on':'';}$('w3').innerHTML=h;
 const k=Math.floor((t-T[4]-.3)/.85),c=Math.floor(((t-T[4]-.3)%.85)/.85*60);$('t4').innerHTML=L4.map((l,i)=>i<k?l:i===k?l.slice(0,c):'').filter(Boolean).join('<br>')+'<span style="display:inline-block;width:9px;height:18px;background:#9cf7c6;vertical-align:-3px"></span>';
 const st=['SIMULATE','CLAIM','CHECK TRIGGERS','PLAY THE PATCH','RECEIPTS'],a=((t-T[5])*1.1)%5;let g='<circle cx="640" cy="415" r="215" fill="none" stroke="#2c261f" stroke-width="24"/>';
 st.forEach((s,i)=>{const ang=-Math.PI/2+i*2*Math.PI/5,X=640+235*Math.cos(ang)*1.25,Y=415+215*Math.sin(ang),on=Math.floor(a)===i;g+='<g transform="translate('+X+','+Y+')"><rect x="-100" y="-24" width="200" height="48" rx="10" fill="'+(on?'#19c98a':'#ece4d2')+'"/><text text-anchor="middle" y="7" font-family="Unbounded" font-weight="700" font-size="15" fill="#1b1712">'+s+'</text></g>';});
 const aa=-Math.PI/2+a*2*Math.PI/5;g+='<circle cx="'+(640+215*Math.cos(aa))+'" cy="'+(415+215*Math.sin(aa))+'" r="13" fill="#fff" style="filter:drop-shadow(0 0 10px #19c98a)"/><text x="640" y="407" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="34" fill="#ece4d2">$PLAY</text><text x="640" y="443" text-anchor="middle" font-family="IBM Plex Mono" font-size="16" fill="#a89d88">fees only claimed when worth the gas</text>';$('ring').innerHTML=g;
 const n=Math.floor((t-T[6]-.2)/.6);$('r6').innerHTML=R6.slice(0,Math.max(0,n+1)).map(([k,s,c])=>'<div class="rc"><span><b style="color:'+c+';font-family:IBM Plex Mono">'+k+'</b>&nbsp;&nbsp;'+s+'</span><span style="color:#5b5246">tx ↗</span></div>').join('');};
window.__ready=document.fonts.ready;window.__seek(0);</script>`);
console.log('scenes written');
