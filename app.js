'use strict';
const $=id=>document.getElementById(id), val=id=>$(id).value, num=id=>Number(val(id)), cents=n=>Math.round((n+Number.EPSILON)*100)/100, money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n), iso=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`, dt=s=>new Date(`${s}T12:00:00Z`), add=(d,n)=>new Date(d.getTime()+n*86400000), fmt=s=>s?new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'—';
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
function calculate(){let salary=num('salary'),periods=num('frequency');if(!Number.isFinite(salary)||salary<0||!Number.isInteger(periods)||!val('start')||!val('end')||val('start')>val('end'))throw Error('Enter a valid salary and pay period.');for(let id of ['credits','other','deductions','extra','postTax'])if(!Number.isFinite(num(id))||num(id)<0)throw Error('W-4 and deduction amounts must be nonnegative.');
let gross=cents(salary/periods),step2=$('step2').checked,filing=val('filing');let standard=step2?0:filing==='married'?12900:8600;let adjusted=Math.max(0,gross*periods+num('other')-num('deductions')-standard);let bracket=TABLES[`${filing}:${step2}`].filter(r=>adjusted>=r[0]).at(-1);let fed=cents(Math.max(0,(bracket[1]+(adjusted-bracket[0])*bracket[2])/periods-num('credits')/periods)+num('extra'));let ss=cents(gross*.062),med=cents(gross*.0145),other=num('postTax');if($('overrideCurrent').checked){fed=num('manualFed');ss=num('manualSS');med=num('manualMed');other=num('manualOther');for(let x of [fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid current deductions.')}let net=cents(gross-fed-ss-med-other);if(net<0)throw Error('Deductions exceed gross pay.');let payday=prev(dt(val('end'))),process=prev(prev(payday,false),false);return {gross,fed,ss,med,other,net,payday:iso(payday),process:iso(process)}}
function projectedYtd(r){let n=num('periodNumber'),max=num('frequency');if(!Number.isInteger(n)||n<1||n>max)throw Error(`Pay period number must be between 1 and ${max}.`);if(val('ytdSource')==='manual'){let gross=num('manualYtdGross'),fed=num('manualYtdFed'),ss=num('manualYtdSS'),med=num('manualYtdMed'),other=num('manualYtdOther');for(let x of [gross,fed,ss,med,other])if(!Number.isFinite(x)||x<0)throw Error('Enter valid YTD amounts.');return {n,gross,fed,ss,med,other,net:cents(gross-fed-ss-med-other),estimated:false}}let gross=cents(num('salary')*n/max),fed=cents(r.fed*n),ss=cents(r.ss*n),med=cents(r.med*n),other=cents(r.other*n),net=cents(gross-fed-ss-med-other);return {n,gross,fed,ss,med,other,net,estimated:true}}
function update(){try{let r=calculate(),y=projectedYtd(r);for(let [k,v] of Object.entries({gross:r.gross,federal:r.fed,ss:r.ss,medicare:r.med,otherD:r.other,net:r.net}))$(k).textContent=money(v);$('payday').textContent=fmt(r.payday);$('processing').textContent=fmt(r.process);for(let [k,v] of Object.entries({ytdGross:y.gross,ytdNet:y.net,ytdFed:y.fed,ytdFica:cents(y.ss+y.med)}))$(k).textContent=money(v);$('status').textContent=''}catch(e){$('status').textContent=e.message}}
function ascii(s){return String(s).normalize('NFKD').replace(/[^\x20-\x7e]/g,'?')};function esc(s){return ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function makePdf(lines,title){let ops=['0.09 0.16 0.27 rg'];for(let l of lines){ops.push(`BT /F1 ${l.size||10} Tf 1 0 0 1 ${l.x||45} ${l.y} Tm (${esc(l.text)}) Tj ET`)}let stream=ops.join('\n')+'\n',date=new Date,stamp=`D:${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}${String(date.getSeconds()).padStart(2,'0')}`;let objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`,`<< /Title (${esc(title)}) /Creator (${esc(val('pdfCreator')||'Payroll Desk iPhone web app')}) /Producer (${esc((val('pdfProducer')||'Payroll Desk')+' | Payroll Desk built-in JavaScript PDF engine')}) /CreationDate (${stamp}) >>`];let pdf='%PDF-1.4\n',offset=[0];for(let i=1;i<objects.length;i++){offset[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}let xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offset[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'})}
function documentPdf(){
 const r=calculate(), ytd=projectedYtd(r), final=val('mode')==='final';
 if(!val('employee').trim()||!val('employer').trim())throw Error('Employer and employee names are required.');
 if(final){if(!val('paymentRef').trim()||!val('actualPaid')||!$('verified').checked)throw Error('Finalized statements require payment reference, actual payment date, and verification.');if(val('actualPaid')>iso(new Date()))throw Error('Actual payment date cannot be in the future.');if(val('actualPaid')!==(val('manualPayDate')||r.payday))throw Error('Reconcile actual and scheduled payment dates before finalizing.');}
 const L=[];const put=(text,x,y,size=9)=>L.push({text:String(text),x,y,size});
 const cash=n=>money(n), pay=val('manualPayDate')||r.payday;
 const short=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',timeZone:'UTC'}):'—';
 // Letter-sized statement, modeled on the supplied two-column payroll statement.
 put('CO.     FILE      DEPT     CLOCK      VCHR. NO',38,755,7);
 put('Earnings Statement',414,755,15);
 put('----     ------    ------    -----      ------',38,742,7);
 if(!final)put('DRAFT / SAMPLE - NOT ISSUED',416,739,8);
 put(val('employer'),38,709,11);
 const addr=(val('employerAddress')||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);
 addr.slice(0,3).forEach((t,i)=>put(t,38,692-i*13,8));
 put('Period Beginning:',372,708,8);put(short(val('start')),501,708,8);
 put('Period Ending:',372,692,8);put(short(val('end')),501,692,8);
 put('Pay Date:',372,676,8);put(short(pay),501,676,8);
 put(val('employee').toUpperCase(),372,649,10);
 const empAddr=(val('address')||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);
 empAddr.slice(0,2).forEach((t,i)=>put(t.toUpperCase(),372,634-i*13,8));
 put('Social Security Number:',38,634,8);put(val('ssn')?'XXX-XX-'+val('ssn'):'—',180,634,8);
 put('Taxable Marital Status:',38,616,8);put(val('filing').replaceAll('_',' '),180,616,8);
 put('Employee ID:',38,598,8);put(val('employeeId')||'—',180,598,8);
 put('Earnings',38,555,11);put('Rate',137,555,8);put('Hours',196,555,8);put('Amount',255,555,8);put('Year to Date',314,555,8);
 put('Other benefits and',438,571,9);put('Information',438,558,9);
 put('Salary',38,530,9);put(cash(num('salary')),133,530,8);put('—',204,530,8);put(cash(r.gross),251,530,9);put(cash(ytd.gross),314,530,9);
 put('Gross Pay',136,502,10);put(cash(r.gross),251,502,10);
 put('No Other Benefits or Information',423,518,8);put('at this time.',423,504,8);
 put('Deduction',38,449,11);put('Statutory',138,449,8);put('Amount',256,449,8);put('Year to Date',315,449,8);
 put('Important Notes',437,449,10);
 [['FICA - Medicare',r.med,ytd.med],['FICA - Social Security',r.ss,ytd.ss],['Federal Tax',r.fed,ytd.fed],['Other deductions',r.other,ytd.other]].forEach((v,i)=>{let yy=426-i*21;put(v[0],137,yy,8);put('-'+cash(v[1]),251,yy,8);put(cash(v[2]),315,yy,8)});
 put('No Important Notes',438,420,8);put('at this time.',438,405,8);
 put('Net Pay',137,325,11);put(cash(r.net),252,325,11);
 put('Checking',137,305,9);put('-'+cash(r.net),252,305,9);
 put('PAYMENT ADVICE',38,250,10);put(val('employer'),38,231,9);
 put('Advice Number:',365,231,8);put(final?val('paymentRef'):'SAMPLE',474,231,8);
 put('Pay date:',365,216,8);put(short(pay),474,216,8);
 put('Social Security Number:',365,201,8);put(val('ssn')?'XXX-XX-'+val('ssn'):'—',474,201,8);
 put('Deposited to the account of',38,157,8);put('Account Number',257,157,8);put('Amount',485,157,8);
 put(val('employee').toUpperCase(),38,138,9);put('NOT PROVIDED',257,138,8);put(cash(r.net),482,138,9);
 put('NON-NEGOTIABLE',465,86,9);
 put('Statement date: '+short(val('statementDate')),38,75,7);
 if(!final)put('DRAFT ONLY - Not evidence of wages paid.',38,60,8);
 if(ytd.estimated)put('YTD projected from assumed constant wages.',38,46,7);
 return makePdf(L,val('pdfTitle').trim()||(final?'Earnings Statement':'Draft Earnings Statement'));
}
let activeUrl=null;function generate(download){try{let blob=documentPdf();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);if(download){let a=document.createElement('a');a.href=activeUrl;a.download=`payroll_${val('employee').trim().replace(/[^a-z0-9]+/gi,'_')}_${val('end')}_${val('mode')}.pdf`;document.body.append(a);a.click();a.remove();$('status').textContent='PDF generated. Use Files or Share to save it.'}else{window.open(activeUrl,'_blank');$('status').textContent='PDF preview opened in a new tab. If blocked, use Save PDF.'}}catch(e){$('status').textContent=e.message}}
$('overrideCurrent').addEventListener('change',()=>{$('manualCurrent').classList.toggle('hidden',!$('overrideCurrent').checked);update()});$('mode').addEventListener('change',()=>{$('finalFields').classList.toggle('hidden',val('mode')!=='final');update()});document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',update));$('preview').addEventListener('click',()=>generate(false));$('download').addEventListener('click',()=>generate(true));if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});update();
