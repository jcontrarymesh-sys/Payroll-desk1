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
function validateYtd(r,y,final=false){
 if(!final)return;
 if(y.estimated)throw Error('Final records require actual YTD totals. Select Manual entries and enter cumulative payroll totals including this payment.');
 const pairs=[['gross',r.gross],['fed',r.fed],['ss',r.ss],['med',r.med],['other',r.other],['net',r.net]];
 for(const [key,current] of pairs)if(y[key]+.005<current)throw Error('YTD '+({fed:'federal tax',ss:'Social Security',med:'Medicare'}[key]||key)+' cannot be less than this payment. YTD must include the current payment.');
 if(y.net<0)throw Error('YTD deductions exceed YTD gross pay.');
}
function exportState(){
 const final=val('mode')==='final';
 $('exportState').textContent=final?'FINAL RECORD - actual payment and cumulative payroll totals required.':'DRAFT PREVIEW - exported PDF will contain draft labels.';
 $('download').textContent=final?'Save final record':'Save draft PDF';
 $('preview').textContent=final?'Preview final record':'Preview draft PDF';
}
function update(){exportState();try{let r=calculate(),y=projectedYtd(r);for(let [k,v] of Object.entries({gross:r.gross,federal:r.fed,ss:r.ss,medicare:r.med,otherD:r.other,net:r.net}))$(k).textContent=money(v);$('payday').textContent=fmt(r.payday);$('processing').textContent=fmt(r.process);for(let [k,v] of Object.entries({ytdGross:y.gross,ytdNet:y.net,ytdFed:y.fed,ytdFica:cents(y.ss+y.med)}))$(k).textContent=money(v);$('status').textContent='';$('dashGross').textContent=money(r.gross);$('dashNet').textContent=money(r.net);$('dashYtd').textContent=money(y.gross)}catch(e){$('status').textContent=e.message}}
function ascii(s){return String(s).normalize('NFKD').replace(/[^\x20-\x7e]/g,'-')};function esc(s){return ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function makePdf(items,title){
 const ops=['0 0 0 rg','0 0 0 RG'];
 for(const it of items){
  if(it.kind==='line'){ops.push(`${it.dash?'[4 4] 0 d':'[] 0 d'}`,`${it.width||.65} w`,`${it.x} ${it.y} m ${it.x2} ${it.y2} l S`);continue}
  if(it.kind==='rect'){ops.push('[] 0 d','0.8 w',`${it.x} ${it.y} ${it.w} ${it.h} re S`);continue}
  if(it.kind==='colorfill'){ops.push(`${it.rgb.join(' ')} rg`,`${it.x} ${it.y} ${it.w} ${it.h} re f`,'0 0 0 rg');continue}
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
 validateYtd(r,y,final);
 if(!val('employee').trim()||!val('employer').trim())throw Error('Employer and employee names are required.');
 if(final&&val('paymentMethod')==='check')throw Error('Manual check issuance is not enabled. Use draft preview only.');if(final){if(!val('paymentRef').trim()||!val('actualPaid')||!$('verified').checked)throw Error('Finalized statements require verified payment details.');if(val('actualPaid')>iso(new Date()))throw Error('Payment date cannot be in the future.');if(val('actualPaid')!==(val('manualPayDate')||r.payday))throw Error('Reconcile actual and scheduled payment dates.');}
 const I=[],T=(text,x,y,size=8,bold=false,italic=false)=>I.push({kind:'text',text:String(text),x,y,size,bold,italic}),R=(text,right,y,size=8,bold=false)=>{const c=document.createElement('canvas').getContext('2d');c.font=`${bold?'bold ':''}${size}px Helvetica`;T(text,right-c.measureText(String(text)).width,y,size,bold)},L=(x,y,x2,width=.65,dash=false)=>I.push({kind:'line',x,y,x2,y2:y,width,dash}),V=(x,y,y2,width=.65)=>I.push({kind:'line',x,y,x2:x,y2,width}),F=(x,y,w,h,gray=.93)=>I.push({kind:'fill',x,y,w,h,gray}),B=(x,y,w,h)=>I.push({kind:'rect',x,y,w,h}),C=(x,y,w,h,rgb)=>I.push({kind:'colorfill',x,y,w,h,rgb});
 const short=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',timeZone:'UTC'}):'—';
 const pay=val('manualPayDate')||r.payday, employer=val('employer').trim(),employee=val('employee').trim().toUpperCase(),ssn=val('ssn')?'XXX-XX-'+val('ssn'):'NOT PROVIDED';
 const ea=String(val('employerAddress')||'').split(',').map(s=>s.trim()).filter(Boolean),pa=String(val('address')||'').split(',').map(s=>s.trim()).filter(Boolean);
 const comment=val('comments').trim(),commentLines=(comment.match(/.{1,72}(?:\s|$)/g)||[]).map(s=>s.trim()).slice(0,4);
 const head=(title)=>{T(title,36,756,15,true);R(`PERIOD ${y.n} OF ${effectivePeriods()}`,574,758,8,true);L(36,747,576,1);if(!final){F(36,723,540,17,.92);T('DRAFT / PRACTICE - NOT ISSUED',43,728,8,true)}};
 const advice=(top)=>{
  const bottom=42,h=202,topY=bottom+h;
  L(36,topY+8,576,.75,true);B(36,bottom,540,h);
  F(37,topY-30,538,29,.94);T('PAYMENT ADVICE',48,topY-19,10,true);R('NON-NEGOTIABLE',564,topY-19,8,true);
  T(employer.slice(0,65),48,topY-49,9,true);ea.slice(0,3).forEach((v,i)=>T(v.slice(0,62),48,topY-63-i*11,7.5));
  B(420,topY-86,144,45);T('PAY DATE',432,topY-55,7,true);T(short(pay),432,topY-75,11,true);
  L(48,topY-105,564,.5);
  T('EMPLOYEE',48,topY-122,7,true);T(employee.slice(0,52),48,topY-140,10,true);
  T('PAYMENT REFERENCE',48,topY-162,7,true);T((final?val('paymentRef'):'DRAFT - NOT ISSUED').slice(0,52),48,topY-179,8);
  T('DEPOSIT ACCOUNT',300,topY-122,7,true);T((val('accountType')+' '+(val('accountLast4')?'****'+val('accountLast4'):'(not supplied)')).slice(0,31),300,topY-139,8);
  T('NET PAY',432,topY-122,7,true);R(money(r.net),564,topY-143,14,true);
  T(val('paymentMethod')==='check'?'Manual check preparation':'Direct deposit',300,topY-177,8);
 };
 const footer=()=>{if(y.estimated)T('YTD projection - assumes constant pay and deductions each period',36,36,7);if(!final){T('SAMPLE / DRAFT - not evidence of wages paid',36,25,7)};};
 const adviceStyle=val('adviceStyle')||'blue';
 const securityHeader=(x,top,w)=>{T('EMPLOYER-ISSUED PAYROLL DOCUMENT  |  PAYMENT DETAILS SUBJECT TO EMPLOYER VERIFICATION',x,top,6.1,true);L(x,top-7,x+w,.5)};
 const styledAdvice=(x,bottom,w,h)=>{
  const cream=adviceStyle==='cream', top=bottom+h;
  C(x,bottom,w,h,cream?[.984,.974,.933]:[.90,.95,.99]);B(x,bottom,w,h);
  T('DIRECT DEPOSIT ADVICE',x+12,top-19,10,true);T('NON-NEGOTIABLE',x+12,top-32,7,true);
  T(employer.slice(0,58),x+12,top-52,9,true);ea.slice(0,3).forEach((v,i)=>T(v.slice(0,63),x+12,top-65-i*10,7.4));
  const right=x+w-12,boxX=right-142;
  B(boxX,top-63,142,48);T('PAY DATE',boxX+10,top-30,7,true);R(short(pay),right-10,top-49,11,true);
  B(boxX,bottom+12,142,51);T('NET PAY',boxX+10,bottom+47,7,true);R(money(r.net),right-10,bottom+26,14,true);
  L(x+12,bottom+56,boxX-12,.5);T('EMPLOYEE',x+12,bottom+43,7,true);T(employee.slice(0,48),x+12,bottom+28,9,true);
  T(val('accountType')+' '+(val('accountLast4')?'****'+val('accountLast4'):'(account not supplied)'),x+12,bottom+13,7.5);
 };
 const template=val('template');
 if(template==='classic'){
  F(36,743,265,30,.91);T('CO.      FILE      DEPT      CLOCK      VCHR. NO',42,761,7.5,true);T([val('companyCode'),val('fileCode'),val('deptCode'),val('clockCode'),val('voucherCode')].map(x=>(x||'—').slice(0,7).padEnd(10,' ')).join(' ').slice(0,53),42,750,8);if(val('extraCode'))T(val('extraCode').slice(0,8),303,750,7);
  T('Earnings Statement',338,758,16,true);if(!final)T('DRAFT / PRACTICE',338,745,8,true);
  T(employer,40,714,10,true,true);if(val('employerPhone'))T(val('employerPhone'),40,700,9,true,true);ea.slice(0,3).forEach((s,i)=>T(s,40,685-13*i,9,true,true));
  T('Period Beginning:',340,710,8);R(short(val('start')),572,710,8);T('Period Ending:',340,694,8);R(short(val('end')),572,694,8);T('Pay Date:',340,678,8);R(short(pay),572,678,8);
  T('Social Security Number:',40,620,8);T(ssn,175,620,8);T('Taxable Marital Status:',40,605,8);T(val('filing'),175,605,8);T('Employee ID:',40,590,8);T(val('employeeId')||'—',175,590,8);
  T(employee,340,630,10,true,true);pa.slice(0,3).forEach((s,i)=>T(s,340,614-i*14,9,true,true));
  T('Earnings',36,545,9,true);T('Annual pay',126,545,8,true);T('Hours',205,545,8,true);T('Amount',264,545,8,true);T('Year to Date',333,545,8,true);L(36,538,395,.65);
  T('Salary',36,520,8);R(money(num('salary')),191,520,8);R('—',240,520,8);R(money(r.gross),313,520,8);R(money(y.gross),395,520,8);
  F(113,488,200,19,.91);T('Gross Pay',119,494,8,true);R(money(r.gross),309,494,8,true);L(113,488,313,.5);
  T('Other benefits and information',416,545,8,true);L(413,538,575,.65);T('No other benefits entered',419,510,7.5);
  T('Deduction',36,455,9,true);T('Statutory',119,455,8,true);T('Amount',264,455,8,true);T('Year to Date',333,455,8,true);L(36,449,395,.65);
  [['FICA - Medicare',r.med,y.med],['FICA - Social Security',r.ss,y.ss],['Federal Tax',r.fed,y.fed],['Other deductions',r.other,y.other]].forEach(([n,c,z],i)=>{let h=429-22*i;T(n,119,h,8);R('-'+money(c),313,h,8);R(money(z),395,h,8)});
  F(113,317,200,20,.91);T('Net Pay',119,324,8,true);R(money(r.net),309,324,9,true);T(val('paymentMethod')==='check'?'Check':val('accountType')+(val('accountLast4')?' ****'+val('accountLast4'):''),119,304,8);R('-'+money(r.net),309,304,8);
  T('Important Notes',416,455,8,true);L(413,449,575,.65);(commentLines.length?commentLines:['No important notes entered']).forEach((s,i)=>T(s.slice(0,34),416,429-i*14,7.5));
  T(`Pay period ${y.n} of ${effectivePeriods()}`,36,287,7.5);T('Statement date: '+short(val('statementDate')),36,273,7.5);
  advice(false);footer();
 }else if(template==='summary'){
  head('Payroll Summary');styledAdvice(36,550,540,152);
  B(36,476,540,59);T('EMPLOYEE INFORMATION',36,525,9,true);L(36,519,576,.8);
  const cols=[36,210,298,390,482];[204,292,384,476].forEach(x=>V(x,476,519,.4));[['Employee',employee],['Employee ID',val('employeeId')||'—'],['Period start',short(val('start'))],['Period end',short(val('end'))],['Pay date',short(pay)]].forEach(([k,v],i)=>{T(k,cols[i]+3,503,7,true);T(String(v).slice(0,i===0?28:16),cols[i]+3,486,7.3)});
  B(36,381,540,77);F(36,441,540,17,.9);T('IMPORTANT NOTES',42,447,8,true);(commentLines.length?commentLines:['No important notes entered']).forEach((s,i)=>T(s.slice(0,90),42,428-i*13,7.5));
  B(36,310,540,62);[125,214,303,392,481].forEach(x=>V(x,310,372,.35));F(36,353,540,19,.9);['','GROSS PAY','PRE-TAX','TAXES','OTHER','NET PAY'].forEach((s,i)=>T(s,40+i*89,359,7,true));
  [['CURRENT',r.gross,0,r.fed+r.ss+r.med,r.other,r.net],['YTD',y.gross,0,y.fed+y.ss+y.med,y.other,y.net]].forEach((row,i)=>{let h=338-i*21;row.forEach((v,j)=>T(j?money(v):v,40+j*89,h,7.5));L(36,h-7,576,.3)});
  B(36,64,261,218);B(307,64,269,218);F(36,260,261,22,.93);F(307,260,269,22,.93);T('EARNINGS',42,267,9,true);T('ASSOCIATED TAXES',314,267,9,true);L(36,260,297,.6);L(307,260,576,.6);
  T('Description',42,246,7,true);T('Current',175,246,7,true);T('YTD',247,246,7,true);T('Regular salary',42,228,8);R(money(r.gross),227,228,8);R(money(y.gross),295,228,8);
  T('Description',314,246,7,true);T('Current',448,246,7,true);T('YTD',526,246,7,true);
  [['Federal tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med]].forEach(([n,c,z],i)=>{let h=228-i*20;T(n,314,h,8);R(money(c),482,h,8);R(money(z),575,h,8)});
  L(36,87,297,.65);L(307,87,576,.65);T('Earnings',42,72,7,true);R(money(r.gross),227,72,8,true);R(money(y.gross),291,72,8,true);T('Taxes',314,72,7,true);R(money(r.fed+r.ss+r.med),482,72,8,true);R(money(y.fed+y.ss+y.med),570,72,8,true);footer();
 }else if(template==='voucher'){
  // Traditional payroll voucher: compact monochrome tables and employer benefits.
  const textFit=(value,max=55)=>String(value||'').slice(0,max);
  const companyLine=[employer,'- MAIN -',val('companyCode')||''].filter(Boolean).join(' ');
  T(textFit(employer,65),36,766,9,true);
  T(textFit(ea.join(', '),90),36,751,7.5);
  R(textFit(val('voucherCode')||val('paymentRef')||'—',20),575,766,8,true);
  R(short(pay),575,751,8);
  L(36,735,576,.8);
  T('PAYMENT ADVICE',36,721,9,true);R('NON-NEGOTIABLE',575,721,8,true);
  T('Employee:',48,695,8);T(employee,142,695,10,true);
  pa.slice(0,3).forEach((line,i)=>T(textFit(line,66),142,679-13*i,8));
  T('Payment method:',48,625,8);T(val('paymentMethod')==='check'?'Manual check - not issued':`Direct deposit ${val('accountLast4')?'****'+val('accountLast4'):''}`,142,625,8);
  B(420,613,144,52);T('NET PAY',432,649,7,true);R(money(r.net),552,628,13,true);
  L(36,602,576,.8,true);
  T(textFit(companyLine,65),36,588,8,true);
  R('Voucher: '+textFit(val('voucherCode')||'—',16),575,588,7.5);
  F(36,554,540,24,.91);
  T('EMPLOYEE INFORMATION',42,562,8,true);T('PAY DATE',274,562,7,true);T('PERIOD START',367,562,7,true);T('PERIOD END',482,562,7,true);
  T(textFit(employee+' ('+(val('employeeId')||'—')+')',37),42,542,8);
  T(short(pay),270,542,8);T(short(val('start')),365,542,8);T(short(val('end')),479,542,8);
  T('Federal tax status: '+val('filing'),40,525,7.5);T('SSN: '+ssn,352,525,7.5);
  L(36,514,576,.7);
  T('CURRENT EARNINGS DETAIL',42,499,9,true);T('DEDUCTIONS / TAXES',348,499,9,true);
  V(334,322,511,.8);
  F(36,469,298,19,.92);F(335,469,241,19,.92);
  T('Description',42,475,7.5,true);T('Annual pay',177,475,7,true);T('Hours',228,475,7.5,true);T('Amount',277,475,7.5,true);
  T('Description',343,475,7.5,true);T('Amount',466,475,7.5,true);T('YTD',542,475,7.5,true);
  T('Salary',42,451,8);R(money(num('salary')),221,451,7.5);R('—',259,451,8);R(money(r.gross),328,451,8);
  [['Federal tax',r.fed,y.fed],['Medicare',r.med,y.med],['Social Security',r.ss,y.ss],['Other deductions',r.other,y.other]].forEach(([n,c,z],i)=>{let h=451-21*i;T(n,343,h,8);R(money(c),510,h,8);R(money(z),574,h,8)});
  L(36,322,576,.8);T('EARNINGS TOTAL',42,308,8,true);R(money(r.gross),327,308,8,true);T('DEDUCTIONS TOTAL',342,308,8,true);R(money(r.gross-r.net),574,308,8,true);
  F(36,262,540,32,.92);T('DIRECT DEPOSIT / PAYMENT',42,275,8,true);T('NET PAY',347,275,9,true);R(money(r.net),571,272,13,true);
  T('Account: '+(val('accountLast4')?'****'+val('accountLast4'):'not provided'),42,247,8);
  T('YTD GROSS: '+money(y.gross),42,232,8);T('YTD NET: '+money(y.net),345,232,8);
  L(36,219,576,.8);
  T('Y-T-D EARNINGS',42,205,8.5,true);T('PAID TIME OFF',223,205,8.5,true);T('EMPLOYER CONTRIBUTIONS',394,205,8.5,true);
  V(211,91,217,.6);V(384,91,217,.6);
  T('Salary',42,184,8);R(money(y.gross),201,184,8);
  T('PTO hours',220,184,8);R(String(num('ptoBalance').toFixed(2)),371,184,8);
  T('Sick hours',220,165,8);R(String(num('sickBalance').toFixed(2)),371,165,8);
  T(textFit(val('contribLabel')||'None',19),391,165,8);R(money(num('contribCurrent')),493,165,7.5);R(money(num('contribYtd')),572,165,7.5);
  T('Current',453,187,7);T('YTD',543,187,7);
  L(36,92,576,.65);T('Totals:',42,79,8,true);R(money(y.gross),201,79,8,true);R(money(num('contribCurrent')),493,79,8,true);R(money(num('contribYtd')),572,79,8,true);
  T('Payroll Desk report | Statement date: '+short(val('statementDate')),36,44,7);
  if(!final)T('DRAFT - NOT ISSUED',36,27,8,true);
 }else{
  head('Deposit Advice Statement');
  styledAdvice(36,556,540,148);
  B(36,64,540,476);V(229,64,540,.8);L(36,516,576,.6);
  T('PERSONAL & DEPOSIT INFORMATION',42,524,7.5,true);T('EARNINGS',242,522,9,true);
  T(employee,42,501,8,true);pa.slice(0,3).forEach((s,i)=>T(s,42,486-i*13,8));T('SSN: '+ssn,42,441,7.5);T('Employee ID: '+(val('employeeId')||'—'),42,427,7.5);T('Period: '+short(val('start'))+' - '+short(val('end')),42,402,7.5);T('Pay date: '+short(pay),42,389,7.5);
  T('Description',242,500,8,true);R('Current',464,500,8,true);R('YTD',568,500,8,true);L(238,493,575,.6);
  T('Regular salary',242,476,8);R(money(r.gross),464,476,8);R(money(y.gross),568,476,8);
  F(239,443,335,18,.93);T('DEDUCTIONS',244,449,8,true);
  [['Federal income tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med],['Other deductions',r.other,y.other]].forEach(([n,c,z],i)=>{let h=425-i*20;T(n,244,h,8);R(money(c),464,h,8);R(money(z),568,h,8)});
  T('NET PAY ALLOCATIONS',42,350,8,true);T(val('paymentMethod')==='check'?'Manual check':val('accountType')+(val('accountLast4')?' ****'+val('accountLast4'):''),42,333,8);T(money(r.net),42,319,8,true);T('YTD: '+money(y.net),42,304,8);
  L(229,96,576,.6);V(408,64,96,.4);V(494,64,96,.4);T('NET PAY',240,76,8,true);R(money(r.net),482,76,8,true);R(money(y.net),568,76,8,true);
  L(36,186,229,.6);F(37,164,191,22,.92);T('MESSAGES / COMMENTS',42,172,8,true);(commentLines.length?commentLines:['No messages entered']).forEach((s,i)=>T(s.slice(0,34),42,150-i*13,7.5));
  T('Statement date: '+short(val('statementDate')),242,134,8);T(`Pay period ${y.n} of ${effectivePeriods()}`,242,120,8);footer();
 }
 return makePdf(I,val('pdfTitle').trim()||(final?'Earnings Statement':'Draft Earnings Statement'));
}
let activeUrl=null;function generate(download){try{let blob=documentPdf();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);if(download){let a=document.createElement('a');a.href=activeUrl;a.download=`payroll_${val('employee').trim().replace(/[^a-z0-9]+/gi,'_')}_${val('end')}_${val('mode')}.pdf`;document.body.append(a);a.click();a.remove();$('status').textContent='PDF generated. Use Files or Share to save it.'}else{window.open(activeUrl,'_blank');$('status').textContent='PDF preview opened in a new tab. If blocked, use Save PDF.'}}catch(e){$('status').textContent=e.message}}
$('frequency').addEventListener('change',()=>{if(val('frequency')!=='custom')$('annualPeriods').value=val('frequency');syncPeriod();update()});$('annualPeriods').addEventListener('input',()=>{syncPeriod();update()});$('end').addEventListener('input',()=>{syncPeriod();update()});$('autoPeriod').addEventListener('change',()=>{syncPeriod();update()});$('overrideCurrent').addEventListener('change',()=>{$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);update()});$('mode').addEventListener('change',()=>{$('finalFields').classList.toggle('hidden',val('mode')!=='final');update()});document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',update));$('preview').addEventListener('click',()=>generate(false));$('download').addEventListener('click',()=>generate(true));if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});syncPeriod();update();

// V9 company profiles: browser-only nonsensitive development records.
const companyFields=['employer','employerPhone','employerAddress','companyCode','fileCode','deptCode','clockCode','voucherCode','extraCode','employee','employeeId','ssn','address','salary','frequency','annualPeriods','start','end','filing','credits','other','deductions','extra','step2','postTax','periodNumber','autoPeriod','ytdSource','overrideCurrent','manualFed','manualSS','manualMed','manualOther','manualYtdGross','manualYtdFed','manualYtdSS','manualYtdMed','manualYtdOther','comments','statementDate','manualPayDate','pdfTitle','pdfCreator','pdfProducer','template','accountType','accountLast4','bankName','ptoBalance','sickBalance','contribLabel','contribCurrent','contribYtd','paymentMethod','adviceStyle'];
const storageKey='payrollDeskV9Companies';let activeCompany='company1';
const readProfiles=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return {}}};
function captureCompany(){const obj={};for(const id of companyFields){const e=$(id);if(e)obj[id]=e.type==='checkbox'?e.checked:e.value}return obj}
function saveProfile(){const all=readProfiles();all[activeCompany]=captureCompany();localStorage.setItem(storageKey,JSON.stringify(all));refreshCompanies();$('status').textContent='Company profile saved on this device.'}
function refreshCompanies(){const all=readProfiles();const sel=$('companySwitch');const keys=[...new Set(['company1','company2',...Object.keys(all)])];sel.replaceChildren();for(const key of keys){const opt=document.createElement('option');opt.value=key;opt.textContent=(all[key]?.employer|| (key==='company1'?'Company 1':key==='company2'?'Company 2':'New company')).slice(0,70);sel.append(opt)}sel.value=activeCompany;$('dashCompany').textContent=(all[activeCompany]?.employer||$('employer').value||'Company').slice(0,18)}
function loadProfile(key){const all=readProfiles();const d=all[key]||{};for(const id of companyFields){const e=$(id);if(!e)continue;if(e.type==='checkbox')e.checked=Boolean(d[id]);else e.value=d[id]??e.defaultValue}if(!all[key]&&key!=='company1'){for(const id of ['employer','employerPhone','employerAddress','employee','address','employeeId','ssn','accountLast4','bankName','ptoBalance','sickBalance','contribLabel','contribCurrent','contribYtd'])$(id).value='';$('salary').value='0';$('manualYtdGross').value='0';}activeCompany=key;$('companySwitch').value=key;$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);$('finalFields').classList.toggle('hidden',val('mode')!=='final');refreshCompanies();syncPeriod();update()}
$('companySwitch').addEventListener('change',e=>{const next=e.target.value;const all=readProfiles();all[activeCompany]=captureCompany();localStorage.setItem(storageKey,JSON.stringify(all));loadProfile(next)});
$('addCompany').addEventListener('click',()=>{const name=prompt('Name of new company:');if(!name||!name.trim())return;const all=readProfiles();all[activeCompany]=captureCompany();const key='company_'+Date.now().toString(36);all[key]={employer:name.trim()};localStorage.setItem(storageKey,JSON.stringify(all));loadProfile(key);$('status').textContent='New company profile created. Fill in its information and save.'});
$('removeCompany').addEventListener('click',()=>{if(['company1','company2'].includes(activeCompany)){alert('The original two company slots cannot be removed. You can edit their details.');return}if(!confirm('Remove this company profile from local storage? Export a backup first if needed.'))return;const all=readProfiles();delete all[activeCompany];localStorage.setItem(storageKey,JSON.stringify(all));loadProfile('company1');$('status').textContent='Company profile removed.'});
$('saveCompany').addEventListener('click',saveProfile);
$('exportBackup').addEventListener('click',()=>{saveProfile();const data=JSON.stringify({format:'PayrollDeskV9LocalBackup',created:new Date().toISOString(),companies:readProfiles()},null,2);const u=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='payroll_desk_v9_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
$('importBackup').addEventListener('click',()=>$('backupFile').click());$('backupFile').addEventListener('change',async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(obj.format!=='PayrollDeskV9LocalBackup'||!obj.companies||typeof obj.companies!=='object')throw Error('Not a valid V9 backup');if(!confirm('Replace locally saved company profiles with this backup?'))return;localStorage.setItem(storageKey,JSON.stringify(obj.companies));loadProfile('company1');$('status').textContent='Backup imported.'}catch(err){$('status').textContent=err.message}});
if(Object.keys(readProfiles()).length)loadProfile('company1');else refreshCompanies();
