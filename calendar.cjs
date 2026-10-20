const assert=require('node:assert/strict'),c=require('../payroll-calendar.js');
const check=(end,options,want)=>{const actual=c.plan(end,options);for(const [k,v]of Object.entries(want))assert.equal(actual[k],v,end+' '+k);};
check('2026-11-26',{}, {payday:'2026-11-25',processing:'2026-11-23'});
check('2026-12-25',{}, {payday:'2026-12-24',processing:'2026-12-22'});
check('2026-11-15',{}, {payday:'2026-11-13',processing:'2026-11-10'});
check('2027-07-05',{}, {payday:'2027-07-02',processing:'2027-06-30'});
check('2026-07-04',{}, {payday:'2026-07-03',processing:'2026-07-01'});
check('2026-07-04',{observeSaturday:true}, {payday:'2026-07-02',processing:'2026-06-30'});
check('2022-01-01',{}, {payday:'2021-12-31',processing:'2021-12-29'});
check('2022-01-01',{observeSaturday:true}, {payday:'2021-12-30',processing:'2021-12-28'});
check('2026-12-25',{closuresText:'2026-12-24 Company closure'}, {payday:'2026-12-23',processing:'2026-12-21'});
check('2026-12-31',{schedule:'first-and-fifteenth'}, {scheduled:'2027-01-01',payday:'2026-12-31',processing:'2026-12-29'});
check('2026-02-28',{schedule:'fifteenth-and-end'}, {scheduled:'2026-02-28',payday:'2026-02-27',processing:'2026-02-25'});
check('2026-12-25',{override:'2026-12-23'}, {scheduled:'2026-12-25',automatic:'2026-12-24',payday:'2026-12-23',processing:'2026-12-21',override:true});
check('2026-12-25',{adjust:false,leadDays:0}, {payday:'2026-12-25',processing:'2026-12-24'});
assert.throws(()=>c.companyClosures('2026-02-30'),/Invalid date/);assert.throws(()=>c.plan('2026-12-25',{leadDays:-1}),/lead time/);
for(const schedule of ['period-end','first-and-fifteenth','fifteenth-and-end'])for(const year of [2024,2026,2027,2028,2030]){
 const options={schedule,observeSaturday:true,closuresText:year+'-12-24 Company closure'};const rows=c.annual(year,options);assert.equal(rows.length,24);
 for(const row of rows){assert.ok(row.payday<=row.scheduled);assert.ok(row.processing<row.payday);assert.equal(c.reason(row.payday,{observeSaturday:true,closures:c.companyClosures(options.closuresText)}),'');}
}
assert.equal(c.annual(2024)[3].end,'2024-02-29');assert.equal(c.annual(2026)[3].end,'2026-02-28');
console.log('PASS: holidays, Sunday observance, optional Friday observance, company closures, leap years, year rollover, lead time, manual override, and 360 annual pay periods.');
