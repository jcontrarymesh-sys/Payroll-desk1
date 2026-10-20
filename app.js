'use strict';
const $=id=>document.getElementById(id), val=id=>$(id).value, num=id=>Number(val(id)), cents=n=>Math.round((n+Number.EPSILON)*100)/100, money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents(n)===0?0:n), iso=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`, dt=s=>new Date(`${s}T12:00:00Z`), add=(d,n)=>new Date(d.getTime()+n*86400000), fmt=s=>s?new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'—';
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
function calendarOptions(){return {schedule:effectivePeriods()===24?val('paySchedule'):'period-end',adjust:$('autoBankDates').checked,observeSaturday:$('saturdayObserved').checked,closuresText:val('companyClosures'),leadDays:num('processingLeadDays'),override:val('manualPayDate')};}
function payrollDates(end){return PayrollCalendar.plan(end,calendarOptions());}
function calendarRows(){if(effectivePeriods()!==24)return [];return PayrollCalendar.annual(num('calendarYear'),calendarOptions());}
function renderPayCalendar(){
 const host=$('payCalendarRows');host.replaceChildren();const rows=calendarRows();
 if(!rows.length){$('calendarMessage').textContent='The annual table is available for a twice-monthly schedule. The selected payment still receives automatic business-day adjustment.';return;}
 $('calendarMessage').textContent='Full-year twice-monthly schedule. Individual pay-date overrides apply only to the current statement.';
 for(const row of rows){const tr=document.createElement('tr');for(const text of [row.period,fmt(row.start)+' – '+fmt(row.end),fmt(row.scheduled),fmt(row.payday),fmt(row.processing),row.skipped.map(x=>x.reason).filter((x,i,a)=>a.indexOf(x)===i).join(', ')||'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}host.append(tr);}
}
function exportPayCalendar(){try{
 const rows=calendarRows();if(!rows.length)throw Error('Select a twice-monthly schedule to export the annual calendar.');
 const cell=value=>'"'+String(value).replace(/"/g,'""')+'"';
 const header=['Period','Period start','Period end','Scheduled payday','Adjusted payday','Processing deadline','Adjustment reason'];
 const records=rows.map(r=>[r.period,r.start,r.end,r.scheduled,r.payday,r.processing,r.skipped.map(x=>x.reason).join('; ')]);
 const csv=[header,...records].map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='payroll_calendar_'+num('calendarYear')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }catch(e){$('status').textContent=e.message;}}
function calculate(){let salary=num('salary'),periods=effectivePeriods();if(!Number.isFinite(salary)||salary<0||!Number.isInteger(periods)||!val('start')||!val('end')||val('start')>val('end'))throw Error('Enter a valid salary and pay period.');for(let id of ['credits','other','deductions','extra','postTax'])if(!Number.isFinite(num(id))||num(id)<0)throw Error('W-4 and deduction amounts must be nonnegative.');
let gross=cents(salary/periods),step2=$('step2').checked,filing=val('filing');let standard=step2?0:filing==='married'?12900:8600;let adjusted=Math.max(0,gross*periods+num('other')-num('deductions')-standard);let bracket=TABLES[`${filing}:${step2}`].filter(r=>adjusted>=r[0]).at(-1);let fed=cents(Math.max(0,(bracket[1]+(adjusted-bracket[0])*bracket[2])/periods-num('credits')/periods)+num('extra'));let ss=cents(gross*.062),med=cents(gross*.0145),other=num('postTax');if($('overrideCurrent').checked){fed=num('manualFed');ss=num('manualSS');med=num('manualMed');other=num('manualOther');for(let x of [fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid current deductions.')}let net=cents(gross-fed-ss-med-other);if(net<0)throw Error('Deductions exceed gross pay.');const dates=payrollDates(val('end'));return {gross,fed,ss,med,other,net,payday:dates.payday,process:dates.processing,scheduled:dates.scheduled,automatic:dates.automatic,skipped:dates.skipped,dateOverride:dates.override,nonBusinessDay:dates.nonBusinessDay}}
function projectedYtd(r){let n=num('periodNumber'),max=effectivePeriods();if(!Number.isInteger(n)||n<1||n>max)throw Error(`Pay period number must be between 1 and ${max}.`);if(val('ytdSource')==='manual'){let gross=num('manualYtdGross'),fed=num('manualYtdFed'),ss=num('manualYtdSS'),med=num('manualYtdMed'),other=num('manualYtdOther');for(let x of [gross,fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid YTD amounts.');return {n,gross,fed,ss,med,other,net:cents(gross-fed-ss-med-other),estimated:false}}let gross=cents(r.gross*n),fed=cents(r.fed*n),ss=cents(r.ss*n),med=cents(r.med*n),other=cents(r.other*n),net=cents(gross-fed-ss-med-other);return {n,gross,fed,ss,med,other,net,estimated:true}}
function exportState(){
 const final=val('mode')==='final';
 $('exportState').textContent=final?'FINAL RECORD selected.':'DRAFT PREVIEW - exported PDF will contain draft labels.';
 $('download').textContent=final?'Save final record':'Save draft PDF';
 $('preview').textContent=final?'Preview final record':'Preview draft PDF';
}
function companyBenefitPolicy(){
 if(val('companyProfileType')==='owner-startup')return {enabled:false};
 const probationDays=num('benefitProbationDays'),ptoDays=num('benefitPtoDays'),hoursPerDay=num('benefitWorkdayHours'),companyHolidayDaysApprox=num('benefitCompanyHolidays');
 if(!Number.isInteger(probationDays)||probationDays<0||!Number.isFinite(ptoDays)||ptoDays<0||!Number.isFinite(hoursPerDay)||hoursPerDay<=0||!Number.isInteger(companyHolidayDaysApprox)||companyHolidayDaysApprox<0)throw Error('Enter valid company benefit settings.');
 return {enabled:true,grantMethod:'one-time-after-probation',probationDays,ptoDays,hoursPerDay,ptoGrantHours:cents(ptoDays*hoursPerDay),companyHolidayDaysApprox};
}
function renderCompanyBenefits(){
 const owner=val('companyProfileType')==='owner-startup';
 $('benefitPolicyFields').classList.toggle('hidden',owner);
 for(const id of ['benefitProbationDays','benefitPtoDays','benefitWorkdayHours','benefitCompanyHolidays'])$(id).disabled=owner;
 const policy=companyBenefitPolicy();
 $('benefitPolicySummary').textContent=owner?'Startup / owner-manager only: employee PTO and company-holiday benefit defaults are off.':policy.ptoGrantHours+' PTO hours ('+policy.ptoDays+' days × '+policy.hoursPerDay+' hours) granted once after '+policy.probationDays+' days of probation. Approximately '+policy.companyHolidayDaysApprox+' company holidays per year, separate from PTO.';
}
function update(){exportState();try{renderCompanyBenefits();let r=calculate(),y=projectedYtd(r);for(let [k,v] of Object.entries({gross:r.gross,federal:r.fed,ss:r.ss,medicare:r.med,otherD:r.other,net:r.net}))$(k).textContent=money(v);$('payday').textContent=fmt(r.payday);$('processing').textContent=fmt(r.process);$('scheduledDate').textContent=fmt(r.scheduled);$('dateReason').textContent=r.dateOverride?'Manual pay-date override: '+fmt(r.payday)+(r.nonBusinessDay?' ('+r.nonBusinessDay+')':'')+'. Processing deadline follows this date.':r.skipped.length?'Payday moved from '+fmt(r.scheduled)+' to '+fmt(r.payday)+'. Skipped: '+r.skipped.map(x=>fmt(x.date)+' ('+x.reason+')').join('; ')+'.':'No payday adjustment needed.';$('paySchedule').disabled=effectivePeriods()!==24;renderPayCalendar();for(let [k,v] of Object.entries({ytdGross:y.gross,ytdNet:y.net,ytdFed:y.fed,ytdFica:cents(y.ss+y.med)}))$(k).textContent=money(v);$('status').textContent='';$('dashGross').textContent=money(r.gross);$('dashNet').textContent=money(r.net);$('dashYtd').textContent=money(y.gross)}catch(e){$('status').textContent=e.message}}
function ascii(s){return String(s).normalize('NFKD').replace(/[^\x20-\x7e]/g,'-')};function esc(s){return ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function makePdf(items,title){return PayrollPdf.render(items,{title:title==='Earnings Statement'?`${title} - ${val('employee').trim()} - ${val('end')}`:title,logo:['classic','modern'].includes(val('template'))?companyLogo:'',logoX:36,logoY:val('template')==='classic'?170:138,logoW:42,logoH:42,author:val('employer').trim(),subject:`Earnings statement | ${val('start')} to ${val('end')}`,keywords:['Payroll Desk','Earnings statement',val('employer').trim()]});}
function documentPdf(){
 const r=calculate(),y=projectedYtd(r),final=val('mode')==='final';
  if(!val('employee').trim()||!val('employer').trim())throw Error('Employer and employee names are required.');
 if(final&&val('paymentMethod')==='check')throw Error('Manual check issuance is not enabled. Use draft preview only.');if(final){if(!val('paymentRef').trim()||!val('actualPaid')||!$('verified').checked)throw Error('Finalized statements require verified payment details.');if(val('actualPaid')>iso(new Date()))throw Error('Payment date cannot be in the future.');if(val('actualPaid')!==(val('manualPayDate')||r.payday))throw Error('Reconcile actual and scheduled payment dates.');}
 const I=[],T=(text,x,y,size=8,bold=false,italic=false)=>I.push({kind:'text',text:String(text),x,y,size,bold,italic}),R=(text,right,y,size=8,bold=false)=>I.push({kind:'text',text:String(text),right,y,size,bold}),L=(x,y,x2,width=.65,dash=false)=>I.push({kind:'line',x,y,x2,y2:y,width,dash}),V=(x,y,y2,width=.65)=>I.push({kind:'line',x,y,x2:x,y2,width}),F=(x,y,w,h,gray=.93)=>I.push({kind:'fill',x,y,w,h,gray}),B=(x,y,w,h)=>I.push({kind:'rect',x,y,w,h}),C=(x,y,w,h,rgb)=>I.push({kind:'colorfill',x,y,w,h,rgb});
 const short=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',timeZone:'UTC'}):'—';
 const pay=val('manualPayDate')||r.payday, employer=val('employer').trim(),employee=val('employee').trim().toUpperCase(),ssn=val('ssn')?'XXX-XX-'+val('ssn'):'NOT PROVIDED';
 const addressParts=text=>{
  const original=String(text||'').trim();if(!original)return [];
  const postal=original.match(/\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  const states=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI AA AE AP'.split(' '));
  if(!postal||!states.has(postal[1].toUpperCase()))return original.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);
  const end=postal[1].toUpperCase()+' '+postal[2],body=original.slice(0,postal.index).replace(/[,\s]+$/,'');
  const parts=body.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);if(!parts.length)return [end];
  const unit='((?:apt\\.?|apartment|suite|ste\\.?|unit)\\s*#?\\s*[A-Za-z0-9-]+|#\\s*[A-Za-z0-9-]+)';
  if(parts.length>1){let city=parts.pop();const extra=city.match(new RegExp('^'+unit+'\\s+([A-Za-z].*)$','i'));if(extra){parts[parts.length-1]+=' '+extra[1];city=extra[2];}return [...parts,city+', '+end];}
  const line=parts[0];
  const withUnit=line.match(new RegExp('^(.+?\\s+'+unit+')\\s+([A-Za-z].*)$','i'));
  if(withUnit)return [withUnit[1],withUnit[3]+', '+end];
  const box=line.match(/^(P\.?\s*O\.?\s*Box\s+\S+)\s+([A-Za-z].*)$/i);if(box)return [box[1],box[2]+', '+end];
  const street=line.match(/^(.+\b(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|way|place|pl|circle|cir|terrace|ter|trail|trl|parkway|pkwy|loop|pike|pass|square|sq|run)\.?(?:\s+(?:N|S|E|W|NE|NW|SE|SW))?)\s+([A-Za-z].*)$/i);
  if(street)return [street[1],street[2]+', '+end];
  return [line+', '+end];
 };
 const ea=addressParts(val('employerAddress')),pa=addressParts(val('address'));
 const measure=(text,size=8,bold=false,italic=false)=>{const c=document.createElement('canvas').getContext('2d');c.font=`${italic?'italic ':''}${bold?'bold ':''}${size}px Helvetica`;return c.measureText(ascii(text)).width;};
 const fit=(text,x,yy,width,size=8,bold=false,italic=false)=>{let fs=size;while(measure(text,fs,bold,italic)>width&&fs>6)fs-=.25;if(measure(text,fs,bold,italic)>width)throw Error('Text is too long for this layout: '+String(text).slice(0,28));T(text,x,yy,fs,bold,italic);};
 const wrap=(text,width,size=8,bold=false)=>{const lines=[];let line='';for(const word of String(text||'').split(/\s+/)){if(!word)continue;if(line&&measure(line+' '+word,size,bold)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
 const lines=(parts,x,yy,width,size=8,leading=11,max=4,bold=false,italic=false)=>{const rows=parts.flatMap(part=>wrap(part,width,size,bold));if(rows.length>max)throw Error('Address or notes are too long for this layout. Use shorter address lines or another template.');rows.forEach((text,i)=>fit(text,x,yy-leading*i,width,size,bold,italic));};
 const comment=val('comments').trim(),commentLines=(comment.match(/.{1,72}(?:\s|$)/g)||[]).map(s=>s.trim()).slice(0,4);
 const head=(title)=>{T(title,36,756,15,true);R(`PERIOD ${y.n} OF ${effectivePeriods()}`,574,758,8,true);L(36,747,576,1);if(!final){F(36,723,540,17,.92);T('DRAFT / PRACTICE - NOT ISSUED',43,728,8,true)}};
 const advice=()=>{
  L(36,238,576,.8,true);
  const brandX=companyLogo?86:54;fit(employer,brandX,207,304-brandX,9);lines(ea,brandX,193,304-brandX,8,11,4);
  T('Advice number:',344,207,8,true);fit(final?(val('adviceNumber')||val('paymentRef')):'DRAFT - NOT ISSUED',456,207,115,8);
  T('Pay date:',344,191,8);T(short(pay),456,191,8);
  T('Social Security Number:',344,175,8);T(ssn,456,175,8);
  const cols=[54,230,370,441,576];
  T('Deposited to the account of',cols[0],108,8,true);T('Account number',cols[1],108,8,true);T('Method',cols[2],108,8,true);R('Amount',570,108,8,true);L(54,101,576,.75);
  fit(employee,54,87,170,8,true);T(val('accountLast4')?'********'+val('accountLast4'):'Not supplied',230,87,8);T(val('paymentMethod')==='check'?'Check preparation':'Direct deposit',370,87,7.5);B(497,79,79,22);R(money(r.net),570,87,9,true);
  R('NON-NEGOTIABLE',576,48,12,true);
 };
 const footer=()=>{if(!final){T('SAMPLE / DRAFT - not evidence of wages paid',36,25,7)};};
 const adviceStyle=val('adviceStyle')||'blue';
 const securityHeader=(x,top,w)=>{T('EMPLOYER-ISSUED PAYROLL DOCUMENT  |  PAYMENT DETAILS SUBJECT TO EMPLOYER VERIFICATION',x,top,6.1,true);L(x,top-7,x+w,.5)};
 const amountWords=amount=>{
  const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const say=n=>n<20?small[n]:n<100?tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:''):n<1000?small[Math.floor(n/100)]+' hundred'+(n%100?' '+say(n%100):''):n<1000000?say(Math.floor(n/1000))+' thousand'+(n%1000?' '+say(n%1000):''):say(Math.floor(n/1000000))+' million'+(n%1000000?' '+say(n%1000000):'');
  const total=Math.round(amount*100);return (say(Math.floor(total/100))+' and '+String(total%100).padStart(2,'0')+'/100 dollars').toUpperCase();
 };
 const styledAdvice=(x,bottom,w,h)=>{
  const cream=adviceStyle==='cream',top=bottom+h,right=x+w;
  C(x,bottom,w,h,cream?[.986,.978,.946]:[.88,.95,.99]);B(x,bottom,w,h);
  fit(employer,x+14,top-23,w-206,9,true);lines(ea,x+14,top-37,w-206,7.5,10,4);
  T('NON-NEGOTIABLE',x+220,top-21,7);
  const bx=right-152,bw=138;
  B(bx,top-66,bw,48);F(bx,top-66,bw,13,.86);T('PAY DATE',bx+48,top-62,7,true);R(short(pay),right-24,top-40,11,true);
  B(bx,bottom+40,bw,48);F(bx,bottom+40,bw,13,.86);T('NET AMOUNT',bx+36,bottom+44,7,true);R(money(r.net),right-24,bottom+66,13,true);
  T('PAY TO',x+14,bottom+72,7);T('THE ORDER OF',x+14,bottom+62,7);
  fit(employee,x+106,bottom+68,w-278,9,true);lines(pa,x+106,bottom+54,w-278,7.5,10,2);
  fit(amountWords(r.net),x+14,bottom+17,w-28,7);L(x+14,bottom+11,right-14,.45);
 };
 const template=val('template');
 if(template==='classic'){
  F(36,744,250,29,.91);
  const codes=[['CO.',val('companyCode')],['FILE',val('fileCode')],['DEPT',val('deptCode')],['CLOCK',val('clockCode')],['VCHR. NO.',val('voucherCode')]];
  codes.forEach(([label,value],i)=>{const x=41+i*49;T(label,x,761,7);fit(value||'-',x,749,46,7.5);});
  fit('Earnings Statement',326,755,250,17,true);if(!final)T('DRAFT / PRACTICE',326,740,8,true);
  fit(employer,40,718,266,10,true,true);if(val('employerPhone'))T(val('employerPhone'),40,702,9,true,true);lines(ea,40,686,266,9,14,4,true,true);
  [['Period Beginning:',val('start')],['Period Ending:',val('end')],['Pay Date:',pay]].forEach(([label,value],i)=>{T(label,326,695-i*17,9);R(short(value),574,695-i*17,9);});
  [['Social Security Number:',ssn],['Taxable Marital Status:',val('filing')],['Employee ID:',val('employeeId')||'-']].forEach(([label,value],i)=>{T(label,40,616-i*16,8.5);fit(value,176,616-i*16,128,8.5);});
  fit(employee,326,616,248,10,true,true);lines(pa,326,598,248,9,14,4,true,true);
  // Two balanced statement columns with a fixed gap.
  T('Earnings',36,525,8.5,true);T('Annual pay',110,525,7.5,true);T('Hours',169,525,7.5,true);R('Amount',238,525,7.5,true);R('Year to Date',305,525,7.5,true);L(36,518,306,.65);
  T('Salary',36,501,8);R(money(num('salary')),157,501,8);R('-',188,501,8);R(money(r.gross),238,501,8);R(money(y.gross),305,501,8);
  F(103,468,139,22,.92);T('Gross Pay',108,476,8,true);R(money(r.gross),237,476,9,true);L(103,468,242,.5);
  T('Benefits / information',326,525,8.5,true);R('This period',494,525,7.5,true);R('Year to date',576,525,7.5,true);L(326,518,576,.65);
  const benefit=val('contribLabel').trim();if(benefit){fit(benefit,326,501,114,8);R(money(num('contribCurrent')),494,501,8);R(money(num('contribYtd')),576,501,8);}else{T('No other benefits or information',366,478,8);T('at this time.',413,463,8);}
  T('Deductions',36,411,8.5,true);R('Amount',238,411,8,true);R('Year to Date',305,411,8,true);L(36,404,306,.65);
  [['FICA - Medicare',r.med,y.med],['FICA - Social Security',r.ss,y.ss],['Federal Tax',r.fed,y.fed],['Other deductions',r.other,y.other]].forEach(([name,c,z],i)=>{const yy=386-i*19;T(name,40,yy,8);R(money(c===0?0:-c),238,yy,8);R(money(z),305,yy,8);});
  F(103,286,139,22,.92);T('Net Pay',108,294,8,true);R(money(r.net),237,294,9,true);T(val('accountType')+' deposit',108,272,8);R(money(r.net),238,272,8);
  T('Important Notes',326,411,9,true);L(326,404,576,.65);lines([comment||'No important notes at this time.'],326,382,244,8,13,6);
  T('Statement date: '+short(val('statementDate')),36,251,7);R(`Pay period ${y.n} of ${effectivePeriods()}`,576,251,7);advice();footer();
 }else if(template==='summary'){
  head('Payroll Summary');styledAdvice(36,550,540,165);
  const meta=[['Employee name',employee,85],['SSN',ssn,58],['Employee address',pa.join(', ')||'Not supplied',83],['Company',employer,91],['Company address',ea.join(', '),92],['Period begin',short(val('start')),44],['Period end',short(val('end')),44],['Pay date',short(pay),43]];
  B(36,442,540,96);F(36,505,540,33,.92);L(36,505,576,.5);let xx=36;
  meta.forEach(([label,value,width],i)=>{if(i)V(xx,442,538,.4);lines([label],xx+4,526,width-8,6.7,9,3,true);lines([value],xx+4,491,width-8,6.7,9,5);xx+=width;});
  B(36,370,540,63);F(36,416,540,17,.9);T('IMPORTANT NOTES',42,422,8,true);lines([comment||'No important notes entered'],42,403,526,7.5,11,3);
  B(36,296,540,62);[125,214,303,392,481].forEach(x=>V(x,296,358,.35));F(36,339,540,19,.9);['','GROSS PAY','PRE-TAX','TAXES','OTHER','NET PAY'].forEach((s,i)=>T(s,40+i*89,345,7,true));
  [['CURRENT',r.gross,0,r.fed+r.ss+r.med,r.other,r.net],['YTD',y.gross,0,y.fed+y.ss+y.med,y.other,y.net]].forEach((row,i)=>{let h=324-i*21;row.forEach((v,j)=>T(j?money(v):v,40+j*89,h,7.5));L(36,h-7,576,.3)});
  B(36,64,261,218);B(307,64,269,218);F(36,260,261,22,.93);F(307,260,269,22,.93);T('EARNINGS',42,267,9,true);T('ASSOCIATED TAXES',314,267,9,true);L(36,260,297,.6);L(307,260,576,.6);
  T('Description',42,246,7,true);R('Current',227,246,7,true);R('YTD',291,246,7,true);T('Regular salary',42,228,8);R(money(r.gross),227,228,8);R(money(y.gross),291,228,8);
  T('Description',314,246,7,true);R('Current',482,246,7,true);R('YTD',570,246,7,true);
  [['Federal tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med]].forEach(([n,c,z],i)=>{let h=228-i*20;T(n,314,h,8);R(money(c),482,h,8);R(money(z),570,h,8)});
  L(36,87,297,.65);L(307,87,576,.65);T('Earnings',42,72,7,true);R(money(r.gross),227,72,8,true);R(money(y.gross),291,72,8,true);T('Taxes',314,72,7,true);R(money(r.fed+r.ss+r.med),482,72,8,true);R(money(y.fed+y.ss+y.med),570,72,8,true);footer();
 }else if(template==='modern'){
  const rule=(yy)=>{C(36,yy,540,1.3,[.12,.49,.78]);};
  T('Earnings Statement',36,757,16,true);T('Pay period: '+short(val('start'))+' - '+short(val('end')),36,739,8);T('Pay date: '+short(pay),36,725,8);
  T('Company',270,757,8,true);const companyRows=wrap(employer,140,8);lines([employer],270,742,140,8,11,3);const addressTop=742-companyRows.length*11;lines(ea,270,addressTop,140,8,11,5);if(val('employerPhone'))T(val('employerPhone'),270,addressTop-ea.flatMap(v=>wrap(v,140,8)).length*11-3,8);
  T('Employee',436,757,8,true);fit(employee,436,742,140,8,true);T(ssn,436,728,8);lines(pa,436,714,140,8,11,4);
  if(!final)T('DRAFT / PRACTICE - NOT ISSUED',36,692,8,true);
  T('Employee earnings',36,633,9,true);rule(624);T('Description',40,610,8,true);R('Annual pay',250,610,8,true);R('Hours',320,610,8,true);R('Current',435,610,8,true);R('Year to date',572,610,8,true);
  T('Salary',40,590,8);R(money(num('salary')),250,590,8);R('-',320,590,8);R(money(r.gross),435,590,8);R(money(y.gross),572,590,8);L(36,581,576,.3);T('Gross earnings',40,566,8,true);R(money(r.gross),435,566,8,true);R(money(y.gross),572,566,8,true);
  T('Employee deductions',36,530,9,true);C(36,521,258,1.3,[.12,.49,.78]);T('Tax / deduction',40,507,7.5,true);R('Current',217,507,7.5,true);R('Year to date',290,507,7.5,true);
  [['Federal tax',r.fed,y.fed],['Social Security',r.ss,y.ss],['Medicare',r.med,y.med],['Other deductions',r.other,y.other]].forEach(([name,c,z],i)=>{T(name,40,489-i*17,8);R(money(c),217,489-i*17,8);R(money(z),290,489-i*17,8);});
  T('Employee payment information',318,530,9,true);C(318,521,258,1.3,[.12,.49,.78]);
  [['Net pay',money(r.net)],['Method',val('paymentMethod')==='check'?'Check preparation':'Direct deposit'],['Account',val('accountLast4')?'****'+val('accountLast4'):'Not supplied'],['Employee ID',val('employeeId')||'-'],['Filing status',val('filing')]].forEach(([label,value],i)=>{T(label,322,502-i*17,8);R(value,572,502-i*17,8);});
  T('Important notes',36,390,9,true);rule(382);lines([comment||'No important notes entered'],40,366,530,8,12,4);L(36,316,576,.3);
  T('Summary',36,295,9,true);rule(286);T('Description',40,272,8,true);R('Current',435,272,8,true);R('Year to date',572,272,8,true);
  [['Gross earnings',r.gross,y.gross],['Taxes and deductions',r.gross-r.net,y.gross-y.net],['Net pay',r.net,y.net]].forEach(([name,c,z],i)=>{T(name,40,253-i*17,8);R(money(c),435,253-i*17,8);R(money(z),572,253-i*17,8);});
  L(36,201,576,.3);const brandX=companyLogo?86:40;fit(employer,brandX,180,310-brandX,8);lines(ea,brandX,166,310-brandX,8,11,4);
  T('Advice number:',352,180,8,true);fit(final?(val('adviceNumber')||val('paymentRef')):'DRAFT - NOT ISSUED',448,180,124,8);T('Pay date:',352,164,8);T(short(pay),448,164,8);
  T('Deposited to the account of',40,101,8,true);T('Account number',258,101,8,true);R('Amount',572,101,8,true);rule(94);fit(employee,40,78,210,8,true);T(val('accountLast4')?'********'+val('accountLast4'):'Not supplied',258,78,8);R(money(r.net),572,78,9,true);R('NON-NEGOTIABLE',576,48,11,true);footer();
 }else if(template==='voucher'){
  // Traditional payroll voucher: compact monochrome tables and employer benefits.
  const textFit=(value,max=55)=>String(value||'').slice(0,max);
  const companyLine=[employer,'- MAIN -',val('companyCode')||''].filter(Boolean).join(' ');
  T(textFit(employer,65),36,766,9,true);
  fit(ea.join(', '),36,751,440,7.5);
  R(textFit(val('voucherCode')||val('paymentRef')||'—',20),575,766,8,true);
  R(short(pay),575,751,8);
  L(36,735,576,.8);
  T('NON-NEGOTIABLE',36,721,8,true);R('Payment reference: '+(final?(val('adviceNumber')||val('paymentRef')):'DRAFT - NOT ISSUED'),575,721,7.5);
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
  styledAdvice(36,550,540,165);
  B(36,64,540,476);V(229,64,540,.8);L(36,516,576,.6);
  T('PERSONAL & DEPOSIT INFORMATION',42,524,7.5,true);T('EARNINGS',242,522,9,true);
  fit(employee,42,501,180,8,true);lines(pa,42,486,180,8,12,3);T('SSN: '+ssn,42,441,7.5);T('Employee ID: '+(val('employeeId')||'—'),42,427,7.5);T('Period: '+short(val('start'))+' - '+short(val('end')),42,402,7);T('Pay date: '+short(pay),42,389,7.5);
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
let activeUrl=null;async function generate(download){const previewWindow=download?null:window.open('','_blank');try{let blob=await documentPdf();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);if(download){let a=document.createElement('a');a.href=activeUrl;a.download=`payroll_${val('employee').trim().replace(/[^a-z0-9]+/gi,'_')}_${val('end')}_${val('mode')}.pdf`;document.body.append(a);a.click();a.remove();$('status').textContent='PDF generated. Use Files or Share to save it.'}else{if(previewWindow)previewWindow.location.href=activeUrl;$('status').textContent=previewWindow?'PDF preview opened in a new tab.':'Preview was blocked by the browser. Use Save PDF.'}}catch(e){if(previewWindow)previewWindow.close();$('status').textContent=e.message}}
$('frequency').addEventListener('change',()=>{if(val('frequency')!=='custom')$('annualPeriods').value=val('frequency');syncPeriod();update()});$('annualPeriods').addEventListener('input',()=>{syncPeriod();update()});$('end').addEventListener('input',()=>{syncPeriod();update()});$('autoPeriod').addEventListener('change',()=>{syncPeriod();update()});$('overrideCurrent').addEventListener('change',()=>{$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);update()});$('mode').addEventListener('change',()=>{$('finalFields').classList.toggle('hidden',val('mode')!=='final');update()});document.querySelectorAll('input,select,textarea').forEach(e=>e.addEventListener('input',update));$('exportCalendar').addEventListener('click',exportPayCalendar);$('preview').addEventListener('click',()=>generate(false));$('download').addEventListener('click',()=>generate(true));if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});syncPeriod();update();

// V9 company profiles: browser-only nonsensitive development records.
const companyFields=[...CompanyProfiles.identityFields,'mode','paymentRef','actualPaid','verified','adviceNumber','companyProfileType','benefitProbationDays','benefitPtoDays','benefitWorkdayHours','benefitCompanyHolidays','paySchedule','autoBankDates','saturdayObserved','processingLeadDays','companyClosures','calendarYear','employer','employerPhone','employerAddress','companyCode','fileCode','deptCode','clockCode','voucherCode','extraCode','employee','employeeId','ssn','address','salary','frequency','annualPeriods','start','end','filing','credits','other','deductions','extra','step2','postTax','periodNumber','autoPeriod','ytdSource','overrideCurrent','manualFed','manualSS','manualMed','manualOther','manualYtdGross','manualYtdFed','manualYtdSS','manualYtdMed','manualYtdOther','comments','statementDate','manualPayDate','pdfTitle','pdfCreator','pdfProducer','template','accountType','accountLast4','bankName','ptoBalance','sickBalance','contribLabel','contribCurrent','contribYtd','paymentMethod','adviceStyle'];
let companyLogo='';
$('companyLogoFile').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)||f.size>1000000)throw Error('Choose a PNG or JPEG logo under 1 MB.');const selected=activeCompany;const reader=new FileReader();reader.onload=()=>{if(activeCompany!==selected)return;companyLogo=String(reader.result);if(persistActiveCompany())$('status').textContent='Logo loaded and saved on this device.';};reader.readAsDataURL(f);}catch(error){$('status').textContent=error.message}});
$('clearCompanyLogo').addEventListener('click',()=>{companyLogo='';$('companyLogoFile').value='';if(persistActiveCompany())$('status').textContent='Logo removed and saved on this device.';});
const storageKey='payrollDeskV9Companies';let activeCompany=CompanyProfiles.selected();
const readProfiles=()=>CompanyProfiles.read();
function captureCompany(){const obj={};for(const id of companyFields){const e=$(id);if(e)obj[id]=e.type==='checkbox'?e.checked:e.value}obj.companyLogo=companyLogo;obj.benefitsPolicy=companyBenefitPolicy();obj.recordIdentifiers=readProfiles()[activeCompany]?.recordIdentifiers||{files:{},advice:{},days:{},nextFile:1};rememberEnteredIdentifiers(obj);return obj}
function persistActiveCompany(){try{const all=readProfiles();all[activeCompany]=captureCompany();localStorage.setItem(storageKey,JSON.stringify(all));localStorage.setItem(CompanyProfiles.ACTIVE,activeCompany);refreshCompanies();return true}catch(error){$('status').textContent='Changes could not be saved on this device: '+error.message;return false}}
function saveProfile(){if(persistActiveCompany())$('status').textContent='Company profile saved on this device.'}
function refreshCompanies(){const all=readProfiles();const sel=$('companySwitch');const keys=[...new Set(['company1','company2',...Object.keys(all)])];sel.replaceChildren();for(const key of keys){const opt=document.createElement('option');opt.value=key;opt.textContent=(all[key]?.employer|| (key==='company1'?'Company 1':key==='company2'?'Company 2':'New company')).slice(0,70);sel.append(opt)}sel.value=activeCompany;$('dashCompany').textContent=(all[activeCompany]?.employer||$('employer').value||'Company').slice(0,18)}
function loadProfile(key){clearTimeout(autoSaveTimer);autoSaveTimer=null;const all=readProfiles();const d=all[key]||{};companyLogo=d.companyLogo||'';for(const id of companyFields){const e=$(id);if(!e)continue;if(CompanyProfiles.identityFields.includes(id)){e.value=d[id]??'';continue;}if(e.type==='checkbox')e.checked=typeof d[id]==='boolean'?d[id]:e.defaultChecked;else e.value=d[id]??(e.tagName==='SELECT'?(Array.from(e.options).find(o=>o.defaultSelected)||e.options[0]).value:e.defaultValue)}if(!all[key]||!Object.prototype.hasOwnProperty.call(d,'employee')){for(const id of ['employee','address','employeeId','ssn','accountLast4','bankName','ptoBalance','sickBalance','contribLabel','contribCurrent','contribYtd'])$(id).value='';$('salary').value='0';$('manualYtdGross').value='0';}$('pdfCreator').value='Payroll Desk 9.11.1';$('pdfProducer').value='Payroll Desk 9.11.1 | pdf-lib 1.17.1';activeCompany=key;localStorage.setItem(CompanyProfiles.ACTIVE,key);$('companySwitch').value=key;$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);$('finalFields').classList.toggle('hidden',val('mode')!=='final');refreshCompanies();syncPeriod();update()}
$('companySwitch').addEventListener('change',e=>{const next=e.target.value;if(persistActiveCompany())loadProfile(next);else $('companySwitch').value=activeCompany});
function addCompanyProfile(type='employer'){
 const name=prompt(type==='owner-startup'?'Name of startup / owner-manager company:':'Name of new company:');if(!name||!name.trim())return;
 const all=readProfiles();all[activeCompany]=captureCompany();const key='company_'+Date.now().toString(36);all[key]={employer:name.trim(),companyProfileType:type};localStorage.setItem(storageKey,JSON.stringify(all));loadProfile(key);saveProfile();$('status').textContent=type==='owner-startup'?'Startup profile created with employee benefit defaults off.':'Company profile created with the standard employee benefit defaults.';
}
$('addCompany').addEventListener('click',()=>addCompanyProfile('employer'));
$('addOwnerCompany').addEventListener('click',()=>addCompanyProfile('owner-startup'));
$('removeCompany').addEventListener('click',()=>{if(['company1','company2'].includes(activeCompany)){alert('The original two company slots cannot be removed. You can edit their details.');return}if(!confirm('Remove this company profile from local storage? Export a backup first if needed.'))return;const all=readProfiles();delete all[activeCompany];localStorage.setItem(storageKey,JSON.stringify(all));loadProfile('company1');$('status').textContent='Company profile removed.'});
$('saveCompany').addEventListener('click',saveProfile);
$('exportBackup').addEventListener('click',()=>{saveProfile();const data=JSON.stringify({format:'PayrollDeskV9LocalBackup',created:new Date().toISOString(),companies:readProfiles()},null,2);const u=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='payroll_desk_v9_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
$('importBackup').addEventListener('click',()=>$('backupFile').click());$('backupFile').addEventListener('change',async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(obj.format!=='PayrollDeskV9LocalBackup'||!obj.companies||typeof obj.companies!=='object')throw Error('Not a valid V9 backup');if(!confirm('Replace locally saved company profiles with this backup?'))return;localStorage.setItem(storageKey,JSON.stringify(obj.companies));loadProfile('company1');$('status').textContent='Backup imported.'}catch(err){$('status').textContent=err.message}});

let autoSaveTimer=null;
function scheduleAutoSave(){clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(()=>{autoSaveTimer=null;persistActiveCompany()},300);}
function flushAutoSave(){clearTimeout(autoSaveTimer);autoSaveTimer=null;persistActiveCompany();}
function employeeRecordKey(){const id=val('employeeId').trim().toUpperCase();return id?'employee:'+id:'';}
function statementRecordKey(){const id=employeeRecordKey();return id&&val('start')&&val('end')?JSON.stringify([id,val('start'),val('end')]):'';}
function identifierStore(c){const s=c.recordIdentifiers||{};s.files=s.files||{};s.advice=s.advice||{};s.days=s.days||{};s.nextFile=Number.isSafeInteger(s.nextFile)&&s.nextFile>0?s.nextFile:1;return s;}
function rememberEnteredIdentifiers(c){const s=identifierStore(c),employee=employeeRecordKey(),statement=statementRecordKey();if(employee&&val('fileCode').trim())s.files[employee]=val('fileCode').trim();if(statement&&val('adviceNumber').trim())s.advice[statement]={...(s.advice[statement]||{}),number:val('adviceNumber').trim()};c.recordIdentifiers=s;}
function restoreLinkedIdentifiers(){const saved=readProfiles()[activeCompany]||{},s=identifierStore(saved),employee=employeeRecordKey(),statement=statementRecordKey();const savedEmployee=saved.employeeId?'employee:'+String(saved.employeeId).trim().toUpperCase():'';const savedStatement=savedEmployee&&saved.start&&saved.end?JSON.stringify([savedEmployee,saved.start,saved.end]):'';$('fileCode').value=s.files[employee]||(employee===savedEmployee?saved.fileCode||'':'');$('adviceNumber').value=s.advice[statement]?.number||(statement===savedStatement?saved.adviceNumber||'':'');}
async function lockedIdentifier(action){const company=activeCompany;const execute=()=>{if(activeCompany!==company)return;action()};if(navigator.locks?.request)return navigator.locks.request('payroll-desk-record-identifiers',execute);return execute();}
async function generateFileNumber(){try{await lockedIdentifier(()=>{const employee=employeeRecordKey();if(!employee)throw Error('Enter the employee ID before generating a file number.');const c=captureCompany(),s=identifierStore(c);let number=s.files[employee];if(!number){const used=new Set(Object.values(s.files));let n=s.nextFile;do{number=String(n++).padStart(6,'0')}while(used.has(number));s.nextFile=n;s.files[employee]=number;}$('fileCode').value=number;c.fileCode=number;c.recordIdentifiers=s;const all=readProfiles();all[activeCompany]=c;localStorage.setItem(storageKey,JSON.stringify(all));persistActiveCompany();$('status').textContent='Employee file number saved: '+number;});}catch(error){$('status').textContent=error.message}}
async function generateAdviceNumber(){try{await lockedIdentifier(()=>{const statement=statementRecordKey();if(!statement)throw Error('Enter an employee ID and pay period before generating an advice number.');const c=captureCompany(),s=identifierStore(c);let number=s.advice[statement]?.number;if(!number){const now=new Date(),day=String(now.getFullYear())+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');let n=(Number(s.days[day])||0)+1;const used=new Set(Object.values(s.advice).map(x=>x.number));do{number=day+'-'+String(n++).padStart(4,'0')}while(used.has(number));s.days[day]=n-1;s.advice[statement]={number,createdAt:now.toISOString()};}$('adviceNumber').value=number;c.adviceNumber=number;c.recordIdentifiers=s;const all=readProfiles();all[activeCompany]=c;localStorage.setItem(storageKey,JSON.stringify(all));persistActiveCompany();$('status').textContent='Statement advice number saved: '+number;});}catch(error){$('status').textContent=error.message}}
for(const id of new Set(companyFields)){const input=$(id);if(input){input.addEventListener('input',scheduleAutoSave);input.addEventListener('change',scheduleAutoSave);}}
for(const id of ['employeeId','start','end'])for(const event of ['input','change'])$(id).addEventListener(event,()=>{restoreLinkedIdentifiers();scheduleAutoSave()});
$('generateFileNumber').addEventListener('click',generateFileNumber);$('generateAdviceNumber').addEventListener('click',generateAdviceNumber);
window.addEventListener('pagehide',flushAutoSave);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushAutoSave()});

CompanyProfiles.migrate();loadProfile(activeCompany);
