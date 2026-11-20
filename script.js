/* October 2026 report. Static KPI data; views loaded from metrics.json when available. */
const monthlyData={
 '강미경':{'5월':[145,145],'6월':[106,106],'7월':[153,131],'8월':[108,98],'9월':[168,116],'10월':[128,128]},
 '신유':{'5월':[119,119],'6월':[108,107],'7월':[116,106],'8월':[106,95],'9월':[147,99],'10월':[139,134]},
 '유연식':{'5월':[100,100],'6월':[101,97],'7월':[171,134],'8월':[108,101],'9월':[99,98],'10월':[158,153]}
};
const months=['5월','6월','7월','8월','9월','10월'];
const managers=['강미경','신유','유연식'];
const monthTable=document.getElementById('monthly-table');
function cell(s,cls=''){return `<div${cls?` class="${cls}"`:''}>${s}</div>`}
function monthCell(vals,month){return cell(`<strong>${vals[0]}</strong><span> / ${vals[1]}</span>`,month==='10월'?'current-month':'')}
let html='<div class="monthly-row monthly-header">'+cell('담당자','monthly-person')+months.map(m=>cell(`<strong>${m}</strong><small>콘텐츠 / 크리에이터</small>`,m==='10월'?'current-month':'')).join('')+'</div>';
for(const manager of managers){html+='<div class="monthly-row">'+cell(manager,'monthly-person')+months.map(m=>monthCell(monthlyData[manager][m],m)).join('')+'</div>'}
html+='<div class="monthly-row monthly-total">'+cell('TOTAL','monthly-person')+months.map(m=>monthCell(managers.reduce((a,n)=>[a[0]+monthlyData[n][m][0],a[1]+monthlyData[n][m][1]],[0,0]),m)).join('')+'</div>';
monthTable.innerHTML=html;
const number=n=>new Intl.NumberFormat('en-US').format(n);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Expected metrics.json: {"updated_at":"...","videos":[{"manager":"강미경","creator":"...","url":"https://...","views":1234}]}
fetch('metrics.json?ts='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('missing');return r.json()}).then(data=>{
 const videos=(Array.isArray(data.videos)?data.videos:[]).filter(v=>typeof v.views==='number'&&Number.isFinite(v.views)&&v.views>=0);
 if(!videos.length)return;
 const unique=[...new Map(videos.map((v,i)=>[String(v.url||v.video_id||'missing-'+i),v])).values()];
 const total=unique.reduce((sum,v)=>sum+v.views,0);
 document.querySelectorAll('[data-manager]').forEach(el=>{const m=el.dataset.manager;const subset=unique.filter(v=>v.manager===m);el.textContent=m==='TOTAL'?number(total):subset.length?number(subset.reduce((s,v)=>s+v.views,0)):'—';});
 document.getElementById('total-views').textContent=number(total);
 document.getElementById('avg-views').textContent=number(Math.round(total/unique.length));
 document.getElementById('tracked-videos').textContent=number(unique.length)+'개';
 document.getElementById('manager-views').innerHTML=managers.map(m=>`<div class="views-card"><small>${m} · 조회수</small><strong>${unique.some(v=>v.manager===m)?number(unique.filter(v=>v.manager===m).reduce((s,v)=>s+v.views,0)):'—'}</strong></div>`).join('');
 document.getElementById('top-videos').innerHTML=unique.sort((a,b)=>b.views-a.views).slice(0,10).map((v,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(v.manager)}</td><td>${escapeHtml(v.creator)}</td><td>${number(v.views)}</td><td>${/^https:\/\//.test(v.url||'')?`<a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer">TikTok ↗</a>`:'—'}</td></tr>`).join('');
 document.getElementById('views-note').textContent='Apify 공개 조회수 기준 · 마지막 수집: '+(data.updated_at||'미기재')+' · 수집된 영상만 합산 (10월 발생 조회수만을 의미하지 않음)';
}).catch(()=>{});
