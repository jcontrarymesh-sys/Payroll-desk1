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
 const I=[],T=(text,x,y,size=8,bold=false,italic=false)=>I.push({kind:'text',text:String(text),x,y,size,bold,italic}),R=(text,right,y,size=8,bold=false)=>{const ctx=document.createElement('canvas').getContext('2d');ctx.font=`${bold?'bold ':''}${size}px Helvetica`;T(text,right-ctx.measureText(String(text)).width,y,size,bold)},L=(x,y,x2,width=.65,dash=false)=>I.push({kind:'line',x,y,x2,y2:y,width,dash}),F=(x,y,w,h,gray=.93)=>I.push({kind:'fill',x,y,w,h,gray});
 const short=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',timeZone:'UTC'}):'—';
 const pay=val('manualPayDate')||r.payday, employer=val('employer').trim(),employee=val('employee').trim().toUpperCase(),ssn=val('ssn')?'XXX-XX-'+val('ssn'):'NOT PROVIDED';
 const split=s=>String(s||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);const ea=split(val('employerAddress')),pa=split(val('address'));
 // Neutral, independent payroll design. No other payroll provider's branding or claimed provenance.
 F(35,739,542,2,.22);T('PAYROLL DESK  /  EARNINGS STATEMENT',37,754,8.5,true);R('PAY ADVICE',574,754,8,true);
 T('Earnings Statement',36,706,21,true);R('PAYROLL SUMMARY',574,712,8,true);
 if(!final){F(36,685,540,17,.91);T('DRAFT  -  PRACTICE DOCUMENT  -  NOT ISSUED',43,690,8,true)}
 T('EMPLOYER',36,661,8,true);T('EMPLOYEE',323,661,8,true);L(36,655,575);L(36,647,575,.35);
 T(employer,36,630,11,true);if(val('employerPhone').trim())T(val('employerPhone').trim(),36,615,8.5);
 ea.slice(0,3).forEach((line,i)=>T(line,36,601-i*13,8.5));
 T(employee,323,630,11,true);pa.slice(0,3).forEach((line,i)=>T(line,323,615-i*13,8.5));
 T('Employee ID',323,562,7.5);T(val('employeeId')||'—',393,562,8);
 T('SSN',323,548,7.5);T(ssn,393,548,8);
 F(36,493,540,39,.94);const cols=[36,172,307,442];[['PERIOD START',short(val('start'))],['PERIOD END',short(val('end'))],['PAY DATE',short(pay)],['STATEMENT DATE',short(val('statementDate'))]].forEach(([label,value],i)=>{T(label,cols[i]+9,515,7,true);T(value,cols[i]+9,500,9,true)});
 T('EARNINGS',36,467,10,true);L(36,459,576,1);
 F(36,435,540,18,.92);T('DESCRIPTION',43,441,7.5,true);R('RATE',257,441,7.5,true);R('HOURS',327,441,7.5,true);R('CURRENT',439,441,7.5,true);R('YEAR TO DATE',569,441,7.5,true);
 T('Regular salary',43,417,9);R(money(num('salary')),257,417,9);R('—',327,417,9);R(money(r.gross),439,417,9);R(money(y.gross),569,417,9);
 L(36,406,576,.45);F(36,381,540,23,.87);T('GROSS PAY',43,388,9,true);R(money(r.gross),439,388,10,true);R(money(y.gross),569,388,10,true);
 T('TAXES & DEDUCTIONS',36,358,10,true);L(36,350,576,1);
 F(36,326,540,18,.92);T('DESCRIPTION',43,332,7.5,true);R('CURRENT',439,332,7.5,true);R('YEAR TO DATE',569,332,7.5,true);
 [['Federal income tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med],['Other deductions',r.other,y.other]].forEach(([name,cur,ytd],i)=>{let yy=308-20*i;T(name,43,yy,8.7);R('-'+money(cur),439,yy,8.7);R('-'+money(ytd),569,yy,8.7);L(36,yy-8,576,.25)});
 F(36,188,540,28,.85);T('NET PAY',43,197,11,true);R(money(r.net),439,197,11,true);R(money(y.net),569,197,10,true);
 L(36,171,576,.7,true);T('PAYMENT ADVICE',36,153,9,true);R(final?'VERIFIED PAYMENT RECORD':'DRAFT PAYMENT PREVIEW',575,153,7,true);
 T('Payee',43,130,7);T(employee,43,115,9,true);T('Payment method',298,130,7);T('Direct deposit / checking',298,115,8);T('Amount',466,130,7);R(money(r.net),570,115,10,true);
 L(36,103,576,.55);T('Reference',43,88,7);T(final?val('paymentRef'):'NOT ISSUED',43,75,8);T('Pay date',298,88,7);T(short(pay),298,75,8);R('NON-NEGOTIABLE',574,75,8,true);
 const comment=val('comments').trim().replace(/\s+/g,' ');if(comment){T('COMMENTS: '+comment.slice(0,100),36,52,7.5)}if(!final)T('SAMPLE / DRAFT',36,29,7,true);
 return makePdf(I,val('pdfTitle').trim()||(final?'Earnings Statement':'Draft Earnings Statement'));
}
let activeUrl=null;function generate(download){try{let blob=documentPdf();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);if(download){let a=document.createElement('a');a.href=activeUrl;a.download=`payroll_${val('employee').trim().replace(/[^a-z0-9]+/gi,'_')}_${val('end')}_${val('mode')}.pdf`;document.body.append(a);a.click();a.remove();$('status').textContent='PDF generated. Use Files or Share to save it.'}else{window.open(activeUrl,'_blank');$('status').textContent='PDF preview opened in a new tab. If blocked, use Save PDF.'}}catch(e){$('status').textContent=e.message}}
$('frequency').addEventListener('change',()=>{$('annualPeriods').value=val('frequency');syncPeriod();update()});$('annualPeriods').addEventListener('input',()=>{syncPeriod();update()});$('end').addEventListener('input',()=>{syncPeriod();update()});$('autoPeriod').addEventListener('change',()=>{syncPeriod();update()});$('overrideCurrent').addEventListener('change',()=>{$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);update()});$('mode').addEventListener('change',()=>{$('finalFields').classList.toggle('hidden',val('mode')!=='final');update()});document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',update));$('preview').addEventListener('click',()=>generate(false));$('download').addEventListener('click',()=>generate(true));if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});syncPeriod();update();
