'use strict';
const $=id=>document.getElementById(id), val=id=>$(id).value, num=id=>Number(val(id)), cents=n=>Math.round((n+Number.EPSILON)*100)/100, money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n), iso=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`, dt=s=>new Date(`${s}T12:00:00Z`), add=(d,n)=>new Date(d.getTime()+n*86400000), fmt=s=>s?new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'—';
// A semimonthly schedule is numbered by the 1st/2nd half of the month.
// Weekly and biweekly schedules are counted from their actual pay-period end
// date; the first ending in the calendar year is period 1. Employers whose
// schedules span year boundaries differently can manually override the number.
function effectivePeriods(){return Number(val('annualPeriods'))}
function inferPeriod(){
 const end=dt(val('end')),year=end.getUTCFullYear(),month=end.getUTCMonth(),day=end.getUTCDate(),frequency=Number(val('frequency'));
 if(frequency===24)return month*2+(day<=15?1:2);
 if(frequency===12)return month+1;
 const jan1=dt(`${year}-01-01`);
 const dayIndex=Math.floor((end-jan1)/86400000);
 return Math.floor(dayIndex/(frequency===26?14:7))+1;
}
function syncPeriod(){
 const total=$('annualPeriods'),n=$('periodNumber');
 const limit=Number(total.value);n.max=String(Number.isInteger(limit)&&limit>0?limit:366);
 if($('autoPeriod').checked){n.value=String(inferPeriod());n.readOnly=true;}else{n.readOnly=false;}
 $('periodHint').textContent=$('autoPeriod').checked?'Automatically determined from the period end date; turn off to edit.':'Manual period number enabled.';
}
const TABLES={
'single:false':[[0,0,0],[7500,0,.10],[19900,1240,.12],[57900,5800,.22],[113200,17966,.24],[209275,41024,.32],[263725,58448,.35],[648100,192979.25,.37]],
'married:false':[[0,0,0],[19300,0,.10],[44100,2480,.12],[120100,11600,.22],[230700,35932,.24],[422850,82048,.32],[531750,116896,.35],[788000,206583.5,.37]],
'head_of_household:false':[[0,0,0],[15550,0,.10],[33250,1770,.12],[83000,7740,.22],[121250,16155,.24],[217300,39207,.32],[271750,56631,.35],[656150,191171,.37]],
'single:true':[[0,0,0],[8050,0,.10],[14250,620,.12],[33250,2900,.22],[60900,8983,.24],[108938,20512,.32],[136163,29224,.35],[328350,96489.63,.37]],
'married:true':[[0,0,0],[16100,0,.10],[28500,1240,.12],[66500,5800,.22],[121800,17966,.24],[217875,41024,.32],[272325,58448,.35],[400450,103291.75,.37]],
'head_of_household:true':[[0,0,0],[12075,0,.10],[20925,885,.12],[45800,3870,.22],[64925,8077.5,.24],[112950,19603.5,.32],[140175,28315,.35],[332375,95585.5,.37]]};
function nth(y,m,weekday,n){let d=dt(`${y}-${String(m).padStart(2,'0')}-01`);return add(d,(weekday-d.getUTCDay()+7)%7+7*(n-1))}function last(y,m,weekday){let d=new Date(Date.UTC(y,m,0,12));return add(d,-(d.getUTCDay()-weekday+7)%7)}
function holidays(y){let h=new Set;for(let yr of [y-1,y,y+1]){for(let [m,day] of [[1,1],[6,19],[7,4],[11,11],[12,25]]){let d=dt(`${yr}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`);if(d.getUTCDay()===0)d=add(d,1);if(d.getUTCFullYear()===y)h.add(iso(d))}if(yr===y){for(let d of [nth(y,1,1,3),nth(y,2,1,3),last(y,5,1),nth(y,9,1,1),nth(y,10,1,2),nth(y,11,4,4)])h.add(iso(d))}}return h}
function bank(d){return d.getUTCDay()!==0&&d.getUTCDay()!==6&&!holidays(d.getUTCFullYear()).has(iso(d))}function prev(d,inclusive=true){d=inclusive?d:add(d,-1);while(!bank(d))d=add(d,-1);return d}
function calculate(){let salary=num('salary'),periods=effectivePeriods();if(!Number.isFinite(salary)||salary<0||!Number.isInteger(periods)||!val('start')||!val('end')||val('start')>val('end'))throw Error('Enter a valid salary and pay period.');for(let id of ['credits','other','deductions','extra','postTax'])if(!Number.isFinite(num(id))||num(id)<0)throw Error('W-4 and deduction amounts must be nonnegative.');
let gross=cents(salary/periods),step2=$('step2').checked,filing=val('filing');let standard=step2?0:filing==='married'?12900:8600;let adjusted=Math.max(0,gross*periods+num('other')-num('deductions')-standard);let bracket=TABLES[`${filing}:${step2}`].filter(r=>adjusted>=r[0]).at(-1);let fed=cents(Math.max(0,(bracket[1]+(adjusted-bracket[0])*bracket[2])/periods-num('credits')/periods)+num('extra'));let ss=cents(gross*.062),med=cents(gross*.0145),other=num('postTax');if($('overrideCurrent').checked){fed=num('manualFed');ss=num('manualSS');med=num('manualMed');other=num('manualOther');for(let x of [fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid current deductions.')}let net=cents(gross-fed-ss-med-other);if(net<0)throw Error('Deductions exceed gross pay.');let payday=prev(dt(val('end'))),process=prev(prev(payday,false),false);return {gross,fed,ss,med,other,net,payday:iso(payday),process:iso(process)}}
function projectedYtd(r){let n=num('periodNumber'),max=effectivePeriods();if(!Number.isInteger(n)||n<1||n>max)throw Error(`Pay period number must be between 1 and ${max}.`);if(val('ytdSource')==='manual'){let gross=num('manualYtdGross'),fed=num('manualYtdFed'),ss=num('manualYtdSS'),med=num('manualYtdMed'),other=num('manualYtdOther');for(let x of [gross,fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid YTD amounts.');return {n,gross,fed,ss,med,other,net:cents(gross-fed-ss-med-other),estimated:false}}let gross=cents(num('salary')*n/max),fed=cents(r.fed*n),ss=cents(r.ss*n),med=cents(r.med*n),other=cents(r.other*n),net=cents(gross-fed-ss-med-other);return {n,gross,fed,ss,med,other,net,estimated:true}}
function update(){try{let r=calculate(),y=projectedYtd(r);for(let [k,v] of Object.entries({gross:r.gross,federal:r.fed,ss:r.ss,medicare:r.med,otherD:r.other,net:r.net}))$(k).textContent=money(v);$('payday').textContent=fmt(r.payday);$('processing').textContent=fmt(r.process);for(let [k,v] of Object.entries({ytdGross:y.gross,ytdNet:y.net,ytdFed:y.fed,ytdFica:cents(y.ss+y.med)}))$(k).textContent=money(v);$('status').textContent=''}catch(e){$('status').textContent=e.message}}
function ascii(s){return String(s).normalize('NFKD').replace(/[^\x20-\x7e]/g,'-')};function esc(s){return ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function makePdf(items,title){
 const ops=['0 0 0 rg','0 0 0 RG'];
 for(const it of items){
  if(it.kind==='line'){ops.push(`${it.dash?'[4 4] 0 d':'[] 0 d'}`,`${it.width||.65} w`,`${it.x} ${it.y} m ${it.x2} ${it.y2} l S`);continue}
  if(it.kind==='rect'){ops.push('0.8 w',`${it.x} ${it.y} ${it.w} ${it.h} re S`);continue}
  if(it.kind==='fill'){ops.push(`${it.gray||.91} g`,`${it.x} ${it.y} ${it.w} ${it.h} re f`,'0 0 0 rg');continue}
  const font=it.italic?'F3':(it.bold?'F2':'F1');ops.push(`BT /${font} ${it.size||8} Tf 1 0 0 1 ${it.x} ${it.y} Tm (${esc(it.text)}) Tj ET`)
 }
 const stream=ops.join('\n')+'\n';const date=new Date();const offset=-date.getTimezoneOffset(),sgn=offset>=0?'+':'-',tz=`${sgn}${String(Math.floor(Math.abs(offset)/60)).padStart(2,'0')}'${String(Math.abs(offset)%60).padStart(2,'0')}'`;
 const stamp=`D:${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}${String(date.getSeconds()).padStart(2,'0')}${tz}`;
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 7 0 R /F3 8 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`,`<< /Title (${esc(title)}) /Creator (${esc(val('pdfCreator')||'Payroll Desk iPhone web app')}) /Producer (${esc((val('pdfProducer')||'Payroll Desk')+' | Payroll Desk built-in JavaScript PDF engine')}) /CreationDate (${stamp}) >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>'];
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}let xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'})
}
function documentPdf(){
 const r=calculate(),y=projectedYtd(r),final=val('mode')==='final';
 if(!val('employee').trim()||!val('employer').trim())throw Error('Employer and employee names are required.');
 if(final){if(!val('paymentRef').trim()||!val('actualPaid')||!$('verified').checked)throw Error('Finalized statements require verified payment details.');if(val('actualPaid')>iso(new Date()))throw Error('Payment date cannot be in the future.');if(val('actualPaid')!==(val('manualPayDate')||r.payday))throw Error('Reconcile actual and scheduled payment dates.');}
 const I=[],T=(text,x,y,size=8,bold=false,italic=false)=>I.push({kind:'text',text:String(text),x,y,size,bold,italic}),R=(text,right,y,size=8,bold=false)=>{const c=document.createElement('canvas').getContext('2d');c.font=`${bold?'bold ':''}${size}px Helvetica`;T(text,right-c.measureText(String(text)).width,y,size,bold)},L=(x,y,x2,width=.65,dash=false)=>I.push({kind:'line',x,y,x2,y2:y,width,dash}),V=(x,y,y2,width=.65)=>I.push({kind:'line',x,y,x2:x,y2,width}),F=(x,y,w,h,gray=.93)=>I.push({kind:'fill',x,y,w,h,gray}),B=(x,y,w,h)=>I.push({kind:'rect',x,y,w,h});
 const short=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',timeZone:'UTC'}):'—';
 const pay=val('manualPayDate')||r.payday, employer=val('employer').trim(),employee=val('employee').trim().toUpperCase(),ssn=val('ssn')?'XXX-XX-'+val('ssn'):'NOT PROVIDED';
 const ea=String(val('employerAddress')||'').split(',').map(s=>s.trim()).filter(Boolean),pa=String(val('address')||'').split(',').map(s=>s.trim()).filter(Boolean);
 const comment=val('comments').trim(),commentLines=(comment.match(/.{1,72}(?:\s|$)/g)||[]).map(s=>s.trim()).slice(0,4);
 const head=(title)=>{T(title,36,756,15,true);R(`PERIOD ${y.n} OF ${effectivePeriods()}`,574,758,8,true);L(36,747,576,1);if(!final){F(36,723,540,17,.92);T('DRAFT / PRACTICE - NOT ISSUED',43,728,8,true)}};
 const advice=(top)=>{const yy=top?670:159;L(36,yy+8,576,.75,true);T('PAYMENT ADVICE',38,yy-9,9,true);R('NON-NEGOTIABLE',575,yy-9,8,true);T(employer,38,yy-29,8.5,true);T(employee,38,yy-46,8.5);T('Advice / payment reference',310,yy-29,7);T(final?val('paymentRef'):'DRAFT - NOT ISSUED',310,yy-42,8);T('Pay date',310,yy-55,7);T(short(pay),365,yy-55,8);L(36,yy-65,576,.5);T('Deposited to the account of',38,yy-79,7);T('Payment method',310,yy-79,7);R('Amount',574,yy-79,7);T(employee,38,yy-95,8,true);T('Direct deposit / checking',310,yy-95,8);R(money(r.net),574,yy-95,9,true)};
 const footer=()=>{if(!final){T('SAMPLE / DRAFT - not evidence of wages paid',36,25,7)};};
 const template=val('template');
 if(template==='classic'){
  F(36,743,265,30,.91);T('CO.      FILE      DEPT      CLOCK      VCHR. NO',42,761,7.5,true);T('—          —          —          —          —',42,750,8);
  T('Earnings Statement',338,758,16,true);if(!final)T('DRAFT / PRACTICE',338,745,8,true);
  T(employer,40,714,10,true,true);if(val('employerPhone'))T(val('employerPhone'),40,700,9,true,true);ea.slice(0,3).forEach((s,i)=>T(s,40,685-13*i,9,true,true));
  T('Period Beginning:',340,710,8);R(short(val('start')),572,710,8);T('Period Ending:',340,694,8);R(short(val('end')),572,694,8);T('Pay Date:',340,678,8);R(short(pay),572,678,8);
  T('Social Security Number:',40,620,8);T(ssn,175,620,8);T('Taxable Marital Status:',40,605,8);T(val('filing'),175,605,8);T('Employee ID:',40,590,8);T(val('employeeId')||'—',175,590,8);
  T(employee,340,630,10,true,true);pa.slice(0,3).forEach((s,i)=>T(s,340,614-i*14,9,true,true));
  T('Earnings',36,545,9,true);T('Rate',126,545,8,true);T('Hours',205,545,8,true);T('Amount',264,545,8,true);T('Year to Date',333,545,8,true);L(36,538,395,.65);
  T('Salary',36,520,8);R(money(num('salary')),191,520,8);R('—',240,520,8);R(money(r.gross),313,520,8);R(money(y.gross),395,520,8);
  F(113,488,200,19,.91);T('Gross Pay',119,494,8,true);R(money(r.gross),309,494,8,true);L(113,488,313,.5);
  T('Other benefits and information',416,545,8,true);L(413,538,575,.65);T('No other benefits entered',419,510,7.5);
  T('Deduction',36,455,9,true);T('Statutory',119,455,8,true);T('Amount',264,455,8,true);T('Year to Date',333,455,8,true);L(36,449,395,.65);
  [['FICA - Medicare',r.med,y.med],['FICA - Social Security',r.ss,y.ss],['Federal Tax',r.fed,y.fed],['Other deductions',r.other,y.other]].forEach(([n,c,z],i)=>{let h=429-22*i;T(n,119,h,8);R('-'+money(c),313,h,8);R(money(z),395,h,8)});
  F(113,317,200,20,.91);T('Net Pay',119,324,8,true);R(money(r.net),309,324,9,true);T('Checking',119,304,8);R('-'+money(r.net),309,304,8);
  T('Important Notes',416,455,8,true);L(413,449,575,.65);(commentLines.length?commentLines:['No important notes entered']).forEach((s,i)=>T(s.slice(0,34),416,429-i*14,7.5));
  T(`Pay period ${y.n} of ${effectivePeriods()}`,36,281,7.5);T('Statement date: '+short(val('statementDate')),36,267,7.5);
  advice(false);footer();
 }else if(template==='summary'){
  head('Payroll Summary');advice(true);
  T('EMPLOYEE INFORMATION',36,525,9,true);L(36,519,576,.8);
  const cols=[36,142,248,370,479];[['Employee',employee],['Employee ID',val('employeeId')||'—'],['Period start',short(val('start'))],['Period end',short(val('end'))],['Pay date',short(pay)]].forEach(([k,v],i)=>{T(k,cols[i]+3,503,7,true);T(String(v).slice(0,18),cols[i]+3,486,7.3)});
  F(36,441,540,17,.9);T('IMPORTANT NOTES',42,447,8,true);(commentLines.length?commentLines:['No important notes entered']).forEach((s,i)=>T(s.slice(0,90),42,428-i*13,7.5));
  F(36,353,540,19,.9);['','GROSS PAY','PRE-TAX','TAXES','OTHER','NET PAY'].forEach((s,i)=>T(s,40+i*89,359,7,true));
  [['CURRENT',r.gross,0,r.fed+r.ss+r.med,r.other,r.net],['YTD',y.gross,0,y.fed+y.ss+y.med,y.other,y.net]].forEach((row,i)=>{let h=338-i*21;row.forEach((v,j)=>T(j?money(v):v,40+j*89,h,7.5));L(36,h-7,576,.3)});
  T('EARNINGS',36,267,9,true);T('ASSOCIATED TAXES',313,267,9,true);L(36,260,576,.8);V(302,94,260,.6);
  T('Description',42,246,7,true);T('Current',175,246,7,true);T('YTD',247,246,7,true);T('Regular salary',42,228,8);R(money(r.gross),227,228,8);R(money(y.gross),295,228,8);
  T('Description',314,246,7,true);T('Current',448,246,7,true);T('YTD',526,246,7,true);
  [['Federal tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med]].forEach(([n,c,z],i)=>{let h=228-i*20;T(n,314,h,8);R(money(c),482,h,8);R(money(z),575,h,8)});
  L(36,95,576,.65);T('NET PAY',42,79,9,true);R(money(r.net),482,79,9,true);R(money(y.net),575,79,9,true);footer();
 }else{
  head('Deposit Advice Statement');
  F(36,556,540,148,.88);T('DIRECT DEPOSIT ADVICE',48,680,10,true);T(employer,48,655,9,true);ea.slice(0,3).forEach((s,i)=>T(s,48,641-i*12,8));T('Pay Date',419,660,8);R(short(pay),563,660,10,true);T('Deposited to',48,592,8);T(employee,48,576,9,true);T('NET PAY',418,593,8,true);R(money(r.net),561,576,12,true);
  L(36,540,576,1);V(229,97,529,.8);
  T('PERSONAL & DEPOSIT INFORMATION',42,522,8,true);T('EARNINGS',242,522,9,true);
  T(employee,42,501,8,true);pa.slice(0,3).forEach((s,i)=>T(s,42,486-i*13,8));T('SSN: '+ssn,42,441,7.5);T('Employee ID: '+(val('employeeId')||'—'),42,427,7.5);T('Period: '+short(val('start'))+' - '+short(val('end')),42,402,7.5);T('Pay date: '+short(pay),42,389,7.5);
  T('Description',242,500,8,true);R('Current',464,500,8,true);R('YTD',568,500,8,true);L(238,493,575,.6);
  T('Regular salary',242,476,8);R(money(r.gross),464,476,8);R(money(y.gross),568,476,8);
  F(239,443,335,18,.93);T('DEDUCTIONS',244,449,8,true);
  [['Federal income tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med],['Other deductions',r.other,y.other]].forEach(([n,c,z],i)=>{let h=425-i*20;T(n,244,h,8);R(money(c),464,h,8);R(money(z),568,h,8)});
  T('NET PAY ALLOCATIONS',42,350,8,true);T('Checking',42,333,8);T(money(r.net),42,319,8,true);T('YTD: '+money(y.net),42,304,8);
  L(238,309,575,.5);T('NET PAY',244,290,9,true);R(money(r.net),464,290,9,true);R(money(y.net),568,290,9,true);
  F(36,164,192,22,.92);T('MESSAGES / COMMENTS',42,172,8,true);(commentLines.length?commentLines:['No messages entered']).forEach((s,i)=>T(s.slice(0,34),42,150-i*13,7.5));
  T('Statement date: '+short(val('statementDate')),242,134,8);T(`Pay period ${y.n} of ${effectivePeriods()}`,242,120,8);L(36,95,576,.65);footer();
 }
 return makePdf(I,val('pdfTitle').trim()||(final?'Earnings Statement':'Draft Earnings Statement'));
}
let activeUrl=null;function generate(download){try{let blob=documentPdf();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);if(download){let a=document.createElement('a');a.href=activeUrl;a.download=`payroll_${val('employee').trim().replace(/[^a-z0-9]+/gi,'_')}_${val('end')}_${val('mode')}.pdf`;document.body.append(a);a.click();a.remove();$('status').textContent='PDF generated. Use Files or Share to save it.'}else{window.open(activeUrl,'_blank');$('status').textContent='PDF preview opened in a new tab. If blocked, use Save PDF.'}}catch(e){$('status').textContent=e.message}}
$('frequency').addEventListener('change',()=>{$('annualPeriods').value=val('frequency');syncPeriod();update()});$('annualPeriods').addEventListener('input',()=>{syncPeriod();update()});$('end').addEventListener('input',()=>{syncPeriod();update()});$('autoPeriod').addEventListener('change',()=>{syncPeriod();update()});$('overrideCurrent').addEventListener('change',()=>{$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);update()});$('mode').addEventListener('change',()=>{$('finalFields').classList.toggle('hidden',val('mode')!=='final');update()});document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',update));$('preview').addEventListener('click',()=>generate(false));$('download').addEventListener('click',()=>generate(true));if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});syncPeriod();update();
