/* Payroll Desk: date-only payroll scheduling. No payment instructions are sent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PayrollCalendar=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DAY=86400000;
 const iso=d=>d.toISOString().slice(0,10);
 function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw Error('Enter a valid date in YYYY-MM-DD format.');const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime())||iso(d)!==value)throw Error('Invalid date: '+value);return d;}
 const add=(d,n)=>new Date(d.getTime()+n*DAY);
 const nth=(y,m,weekday,n)=>{const d=new Date(Date.UTC(y,m-1,1,12));return add(d,(weekday-d.getUTCDay()+7)%7+(n-1)*7);};
 const last=(y,m,weekday)=>{const d=new Date(Date.UTC(y,m,0,12));return add(d,-((d.getUTCDay()-weekday+7)%7));};
 function holidays(year,observeSaturday=false){
  const result=new Map();
  for(const y of [year-1,year,year+1]){
   const fixed=[[1,1,"New Year's Day"],[7,4,'Independence Day'],[11,11,'Veterans Day'],[12,25,'Christmas Day']];
   if(y>=2021)fixed.push([6,19,'Juneteenth']);
   for(const [m,day,name] of fixed){let d=new Date(Date.UTC(y,m-1,day,12));if(d.getUTCDay()===0)d=add(d,1);else if(d.getUTCDay()===6&&observeSaturday)d=add(d,-1);if(d.getUTCFullYear()===year)result.set(iso(d),name);}
  }
  [[nth(year,1,1,3),'Martin Luther King Jr. Day'],[nth(year,2,1,3),"Washington's Birthday"],[last(year,5,1),'Memorial Day'],[nth(year,9,1,1),'Labor Day'],[nth(year,10,1,2),'Columbus Day'],[nth(year,11,4,4),'Thanksgiving Day']].forEach(([d,label])=>result.set(iso(d),label));
  return result;
 }
 function companyClosures(text=''){
  const entries=new Map();
  for(const line of text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
   const match=line.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/);if(!match)throw Error('Company closure: use one YYYY-MM-DD date per line, optionally followed by a label.');date(match[1]);entries.set(match[1],match[2]||'Company closure');
  }
  return entries;
 }
 function reason(value,policy={}){
  const d=date(value),day=d.getUTCDay();
  const closure=(policy.closures||new Map()).get(value);if(closure)return closure;
  const holiday=holidays(d.getUTCFullYear(),!!policy.observeSaturday).get(value);if(holiday)return holiday;
  return day===0?'Sunday':day===6?'Saturday':'';
 }
 function preceding(value,policy={},inclusive=true){let d=date(value);if(!inclusive)d=add(d,-1);for(let count=0;count<3660;count++,d=add(d,-1)){if(!reason(iso(d),policy))return iso(d);}throw Error('No available payroll business day was found. Review company closures.');}
 function deadline(value,leadDays=2,policy={}){if(!Number.isInteger(leadDays)||leadDays<0||leadDays>30)throw Error('Processing lead time must be a whole number from 0 to 30 business days.');let current=value;date(current);if(leadDays===0)return preceding(current,policy,true);for(let i=0;i<leadDays;i++)current=preceding(current,policy,false);return current;}
 function scheduled(periodEnd,schedule='period-end'){
  const end=date(periodEnd),y=end.getUTCFullYear(),m=end.getUTCMonth();
  if(schedule==='first-and-fifteenth')return iso(end.getUTCDate()<=15?new Date(Date.UTC(y,m,15,12)):new Date(Date.UTC(y,m+1,1,12)));
  if(schedule==='fifteenth-and-end')return iso(end.getUTCDate()<=15?new Date(Date.UTC(y,m,15,12)):new Date(Date.UTC(y,m+1,0,12)));
  if(schedule!=='period-end')throw Error('Select a valid pay schedule.');return periodEnd;
 }
 function plan(periodEnd,options={}){
  const policy={closures:companyClosures(options.closuresText||''),observeSaturday:!!options.observeSaturday};
  const regular=scheduled(periodEnd,options.schedule||'period-end');
  const automatic=options.adjust===false?regular:preceding(regular,policy,true);
  const payday=options.override||automatic;date(payday);
  const skipped=[];if(options.adjust!==false){for(let d=date(regular);iso(d)>automatic;d=add(d,-1))skipped.push({date:iso(d),reason:reason(iso(d),policy)});}
  return {scheduled:regular,automatic,payday,processing:deadline(payday,options.leadDays??2,policy),skipped,override:!!options.override,nonBusinessDay:reason(payday,policy)};
 }
 function annual(year,options={}){
  if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Calendar year must be between 2000 and 2100.');
  const rows=[];
  for(let m=0;m<12;m++)for(let half=0;half<2;half++){
   const start=iso(new Date(Date.UTC(year,m,half?16:1,12))),end=iso(new Date(Date.UTC(year,m,half?new Date(Date.UTC(year,m+1,0)).getUTCDate():15,12)));
   rows.push({period:rows.length+1,start,end,...plan(end,{...options,override:''})});
  }
  return rows;
 }
 return {date,holidays,companyClosures,reason,preceding,deadline,scheduled,plan,annual};
});
