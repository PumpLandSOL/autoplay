// two more AUTOPLAY motion pieces: src/say.html (one line → a playing coin) and src/twocoins.html (ordinary coin vs AUTOPLAY coin)
'use strict';
const fs = require('fs'), path = require('path'); const SRC = path.join(__dirname, 'src');
const V = fs.readFileSync(path.join(__dirname, 'videos.cjs'), 'utf8');
const HEAD = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="_v.css">`;
let LIB, STYLE; eval(V.slice(V.indexOf('const LIB ='), V.indexOf('// ---------- 2.')).replace('const LIB', 'LIB').replace('const STYLE', 'STYLE'));

// ---------- 4. say it: 18s, typed one-liners become patches ----------
const LINES = [['buy back 70% and burn', [['Fees arrive'], ['Buy back', '70%'], ['Burn', 'held']]],
  ['airdrop 80% to the top 20 holders', [['Fees arrive'], ['Airdrop', 'top 20'], ['Keep', '20%']]],
  ['every hour, pay one random holder', [['Every 1h'], ['Random holder', '100%']]],
  ['when mcap passes $100k, burn 50%', [['Mcap $100k'], ['Burn', '50%']]]];
fs.writeFileSync(path.join(SRC, 'say.html'), HEAD + STYLE + `<style>.inp{position:absolute;left:190px;top:150px;width:900px;padding:22px 28px;font-family:'IBM Plex Mono';font-size:30px;border-radius:14px;background:#0f0d0b;border:2px solid #3a3229;color:#ece4d2}.inp .q{color:#a89d88}.cur{display:inline-block;width:14px;height:30px;background:#ff5a36;vertical-align:-5px;margin-left:2px}</style>
<body><canvas id="bg" width="1280" height="720"></canvas>
<div class="c" id="a"><div><div class="k">no code · no bots · no dev</div><div class="d" style="font-size:110px;margin-top:16px;line-height:1">Say it.<br><span class="g">It plays.</span></div></div></div>
<div id="b" style="position:absolute;inset:0"><div style="position:absolute;top:60px;left:0;right:0;text-align:center" class="k" id="cnt"></div><div class="inp"><span class="q">›</span> <span id="ty"></span><span class="cur"></span></div><div id="mods"></div><svg id="w" style="position:absolute;inset:0" viewBox="0 0 1280 720"></svg></div>
<div class="c" id="c"><div><div class="k">pick a recipe · launch on pump.fun</div><div class="d" style="font-size:80px;margin-top:18px;line-height:1.05">One line.<br><span class="g">One signature.</span></div></div></div>
<div class="c" id="f"><div><div class="d" style="font-size:100px;letter-spacing:.02em">AUTOPLAY</div><div class="d" style="font-size:46px;margin-top:14px">Coins <span class="that">that</span> <span class="g">play</span> themselves<span class="led"></span></div><div class="m" style="font-size:28px;margin-top:30px;color:#ffc12e">autoplaypad.net · $AUTO</div></div></div>
<script>${LIB}
const L=${JSON.stringify(LINES)},C=['#ff5a36','#ffc12e','#19c98a','#2f6bff'],T0=2.6,SEG=2.9;
window.__seek=(t)=>{bg(t,.7);$('a').style.opacity=win(t,0,T0);$('b').style.opacity=win(t,T0,T0+SEG*4);$('c').style.opacity=win(t,T0+SEG*4,T0+SEG*4+2.4);$('f').style.opacity=e((t-(T0+SEG*4+2.4))/.5);
 const i=Math.max(0,Math.min(3,Math.floor((t-T0)/SEG))),lt=t-T0-i*SEG,[txt,m]=L[i];$('cnt').textContent='recipe '+(i+1)+' / 4';
 $('ty').textContent=txt.slice(0,Math.floor(Math.max(0,lt)*26));const p0=lt-1.15,acts=m.slice(1),tr=m[0];
 let h='<div class="mod" style="left:545px;top:290px;opacity:'+cl(p0*3)+'"><i class="on"></i><div class="s">TRIGGER</div><div class="t">'+tr[0]+'</div></div>',w='';
 acts.forEach((a,k)=>{const x=640+(k-(acts.length-1)/2)*320,p=e((p0-.25-k*.2)/.6);h+='<div class="mod" style="left:'+(x-95)+'px;top:520px;opacity:'+cl(p0*3-k*.4)+'"><i class="'+(p>.98?'on':'')+'"></i><div class="s">ACTION · '+a[1]+'</div><div class="t">'+a[0]+'</div></div>';w+=cable(640,390,x,520,C[(i+k)%4],p);});
 $('mods').innerHTML=h;$('w').innerHTML=w;};window.__ready=document.fonts.ready;window.__seek(0);</script>`);

// ---------- 5. two coins: 18s, where the fees go ----------
fs.writeFileSync(path.join(SRC, 'twocoins.html'), HEAD + STYLE + `<style>.col{position:absolute;top:120px;width:520px;height:520px;border-radius:16px;padding:28px}.col h3{font-family:Unbounded;font-size:30px}.row{display:flex;justify-content:space-between;font-family:'IBM Plex Mono';font-size:20px;padding:12px 0;border-bottom:1px dashed #3a3229}.big{font-family:Unbounded;font-weight:900;font-size:64px;margin-top:18px}.coin{position:absolute;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe08a,#e0a000);box-shadow:0 0 12px rgba(255,193,46,.7)}</style>
<body><canvas id="bg" width="1280" height="720"></canvas>
<div class="c" id="a"><div><div class="k">same trades · same fees</div><div class="d" style="font-size:96px;margin-top:16px;line-height:1.02">Two coins.<br><span class="g">Watch the fees.</span></div></div></div>
<div id="b" style="position:absolute;inset:0">
 <div class="col" style="left:90px;border:2px solid #3a3229;background:#14110e"><div class="k" style="color:#a89d88">a normal launch</div><h3 style="margin-top:10px">$COIN</h3><div id="lrows" style="margin-top:20px"></div><div class="big" style="color:#a89d88" id="lbig"></div></div>
 <div class="col" style="left:670px;border:2px solid #19c98a;background:#14110e;box-shadow:0 0 70px rgba(25,201,138,.15)"><div class="k">an autoplay launch</div><h3 style="margin-top:10px" class="g">$PLAY</h3><div id="rrows" style="margin-top:20px"></div><div class="big g" id="rbig"></div></div>
 <div id="cn"></div></div>
<div class="c" id="c"><div><div class="k">its fees pay for its rules</div><div class="d" style="font-size:84px;margin-top:18px;line-height:1.05">One gets dumped.<br><span class="g">One plays itself.</span></div></div></div>
<div class="c" id="f"><div><div class="d" style="font-size:100px;letter-spacing:.02em">AUTOPLAY</div><div class="d" style="font-size:46px;margin-top:14px">Coins <span class="that">that</span> <span class="g">play</span> themselves<span class="led"></span></div><div class="m" style="font-size:28px;margin-top:30px;color:#ffc12e">autoplaypad.net · $AUTO</div></div></div>
<script>${LIB}
const LR=[['fees in','2.40 SOL'],['to the dev wallet','2.40 SOL'],['bought back','0'],['burned','0'],['holders paid','0']],RR=[['fees in','2.40 SOL'],['to the vault','2.40 SOL'],['bought back','1.20 SOL'],['burned','14.2M $PLAY'],['holders paid','0.72 SOL']];
const rows=(R,t,c)=>R.slice(0,Math.max(0,Math.floor((t-3.4)/.9)+1)).map(([k,v],i)=>'<div class="row"><span style="color:#a89d88">'+k+'</span><span style="color:'+(i>1&&c?'#19c98a':i>1?'#5b5246':'#ece4d2')+'">'+v+'</span></div>').join('');
window.__seek=(t)=>{bg(t,.6);$('a').style.opacity=win(t,0,2.8);$('b').style.opacity=win(t,2.8,12.4);$('c').style.opacity=win(t,12.4,15.2);$('f').style.opacity=e((t-15.2)/.5);
 $('lrows').innerHTML=rows(LR,t,0);$('rrows').innerHTML=rows(RR,t,1);$('lbig').innerHTML=t>8.6?'→ dev <span style="font-size:30px">sells</span>':'';$('rbig').innerHTML=t>8.6?'→ holders':'';
 let h='';if(t>2.8&&t<12.4)for(let i=0;i<10;i++){const p=((t-2.8)*.45+i/10)%1,s=i%2;h+='<span class="coin" style="left:'+(s?930:350)+'px;top:'+(700-p*90)+'px;opacity:'+Math.min(1,p*4,(1-p)*4)+'"></span>';}$('cn').innerHTML=h;};
window.__ready=document.fonts.ready;window.__seek(0);</script>`);
console.log('scenes written');
