(function(root){
'use strict';
const T=(text,x,y,size=9,bold=false)=>({kind:'text',text:String(text??''),x,y,size,bold});
const L=(x,y,x2,y2=y)=>({kind:'line',x,y,x2,y2});
const B=(x,y,w,h)=>({kind:'rect',x,y,w,h});
async function offer(company,data){
 if(!company.employer)throw Error('Save the employer legal name in its company profile first.');
 if(!data.candidate||!data.jobTitle)throw Error('Candidate name and job title are required.');
 const pdf=await PayrollPdf.create({title:`Employment offer - ${data.candidate}`,author:company.employer,subject:`Employment offer | ${data.letterDate||'Undated'}`,keywords:['Employment offer','Payroll Desk',company.employer]});
 let page=pdf.page,y=745,pageNo=1;
 const header=async()=>{pdf.draw([T(company.employer,40,749,13,true),L(40,734,572),T('EMPLOYMENT OFFER',40,712,11,true),T(data.status||'Draft',485,712,9)],page);y=684;};
 const footer=()=>pdf.draw([L(40,44,572),T('Payroll Desk | '+(data.status||'Draft'),40,30,8),T('Page '+pageNo,530,30,8)],page);
 const newline=async()=>{footer();page=pdf.doc.addPage([612,792]);pageNo++;await header();};
 const paragraph=async(text,{bold=false,size=10,gap=10}={})=>{const rows=pdf.wrap(text,532,size,bold);for(const row of rows){if(y<75)await newline();pdf.draw([T(row,40,y,size,bold)],page);y-=14;}y-=gap;};
 await header();
 if(company.companyLogo){await pdf.logo(company.companyLogo,510,639,60,60,page);}
 await paragraph(CompanyProfiles.formatAddress(company.employerAddress),{size:9});
 await paragraph('Letter date: '+(CompanyProfiles.formatDate(data.letterDate)||'Not specified'),{size:9});
 await paragraph([data.candidate,data.candidateAddress].filter(Boolean).join('\n'),{bold:true});
 await paragraph('Dear '+data.candidate+',');
 await paragraph(`On behalf of ${company.employer}, we are pleased to offer you the position of ${data.jobTitle}${data.department?' in our '+data.department+' department':''}.`);
 await paragraph('Position details',{bold:true,gap:3});
 for(const [key,label]of [['startDate','Start date'],['manager','Reports to'],['workplace','Work arrangement'],['schedule','Work schedule']])if(data[key])await paragraph(label+': '+(key==='startDate'?CompanyProfiles.formatDate(data[key]):data[key]),{gap:3});
 await paragraph('Compensation and benefits',{bold:true,gap:3});
 for(const [key,label]of [['compensation',data.compType||'Compensation'],['frequency','Pay frequency'],['benefits','Benefits']])if(data[key])await paragraph(label+': '+(key==='startDate'?CompanyProfiles.formatDate(data[key]):data[key]),{gap:3});
 if(data.conditions)await paragraph(data.conditions);
 await paragraph('Please indicate acceptance by signing below'+(data.deadline?' and returning this offer by '+CompanyProfiles.formatDate(data.deadline):'')+'.');
 await paragraph('For questions, contact '+([data.email,data.phone].filter(Boolean).join(' or ')||'the hiring team')+'.');
 if(y<155)await newline();y-=15;
 pdf.draw([L(40,y,280),L(320,y,572),T(data.signatory||'Employer signature',40,y-15,9,true),T(data.candidate,320,y-15,9,true),T(data.signTitle||company.employer,40,y-29,8),T('Candidate acceptance / date',320,y-29,8)],page);footer();return pdf.blob();
}
// Employee-copy worksheet: values always come from entered year-end records.
async function w2(company,data,preview=true){
 if(!data.employer||!data.ein)throw Error('Employer name/address and EIN are required.');
 if(!/^\d{4}$/.test(data.year))throw Error('Enter a four-digit tax year.');
 const pdf=await PayrollPdf.create({title:`W-2 employee copies - ${data.year}`,author:company.employer||data.employer.split('\n')[0],subject:`Wage and Tax Statement | Tax year ${data.year}`,keywords:['W-2','Employee copies','Payroll Desk',company.employer||'']});
 const I=[];
 function cell(x,top,w,h,label,value,size=6.4){I.push(B(x,top-h,w,h));const labels=pdf.wrap(label,w-8,4.8,true);let yy=top-7;for(const row of labels){I.push(T(row,x+4,yy,4.8,true));yy-=5.5;}yy-=2;const rows=pdf.wrap(value||'',w-8,size,true);if(yy-(rows.length-1)*8<top-h+4)throw Error('W-2 field exceeds its box: '+label);for(const row of rows){I.push(T(row,x+4,yy,size,true));yy-=8;}}
 const amountFields=[['b1','1 Wages, tips, other comp.'],['b2','2 Federal income tax withheld'],['b3','3 Social security wages'],['b4','4 Social security tax withheld'],['b5','5 Medicare wages and tips'],['b6','6 Medicare tax withheld'],['b7','7 Social security tips'],['b8','8 Allocated tips'],['b10','10 Dependent care benefits'],['b11','11 Nonqualified plans']];
 function card(x,top,w,copy){
 const half=w/2;let yy=top;I.push(T('W-2  '+data.year+'  |  Copy '+copy,x,yy+7,8,true));
 for(let i=0;i<amountFields.length;i+=2){for(let j=0;j<2;j++){const[key,label]=amountFields[i+j];cell(x+j*half,yy,half,25,label,data[key],6.5);}yy-=25;}
 cell(x,yy,w,20,'d Control number',data.controlnum);yy-=20;
 cell(x,yy,w,44,"c Employer's name, address, ZIP code",data.employer,6.3);yy-=44;
 cell(x,yy,half,24,'b Employer EIN',data.ein);cell(x+half,yy,half,24,'a Employee SSN',data.ssn);yy-=24;
 const codes=[['b12a','12a Code / amount'],['b12b','12b Code / amount'],['b12cd','12c / 12d'],['b14','14 Other']];
 for(let i=0;i<4;i+=2){for(let j=0;j<2;j++)cell(x+j*half,yy,half,24,codes[i+j][1],data[codes[i+j][0]],6);yy-=24;}
 cell(x,yy,w,24,'13 Status',[[data.statutory,'Statutory employee'],[data.retirement,'Retirement plan'],[data.sick,'Third-party sick pay']].filter(a=>a[0]).map(a=>a[1]).join('; '),5.5);yy-=24;
 cell(x,yy,w,44,"e/f Employee name, address, ZIP",[data.employee,data.address].filter(Boolean).join('\n'),6.4);yy-=44;
 const stateLabels=['15 State / ID','16 State wages','17 State tax','18 Local wages','19 Local tax','20 Locality'];
 for(let row=0;row<2;row++){for(let col=0;col<3;col++){const n=row*3+col;cell(x+col*w/3,yy,w/3,25,stateLabels[n],data['b'+(15+n)],5.5);}yy-=25;}
 I.push(T(copy==='B'?'Federal return':copy==='C'?'Employee records':'State / local return',x,yy-10,6,true));
 return yy;
 }
 // One employer summary copy at top left, three employee copies beneath.
 const top=758,left=24,small=184,summaryX=225;
 // Top reference panel contains identity and selected wage fields, not a full fifth copy.
 I.push(T('W-2  '+data.year+'  |  Employer summary',left,770,9,true));
 cell(left,top,small,53,"c Employer's name, address, ZIP code",data.employer);let yy=top-53;
 cell(left,yy,small,48,"e/f Employee's name and address",[data.employee,data.address].filter(Boolean).join('\n'));yy-=48;
 cell(left,yy,92,24,'b Employer EIN',data.ein);cell(left+92,yy,92,24,'a Employee SSN',data.ssn);yy-=24;
 for(let i=0;i<6;i+=2){for(let j=0;j<2;j++){const [key,label]=amountFields[i+j];cell(left+j*92,yy,92,26,label,data[key]);}yy-=26;}
 I.push(T('Recorded annual wage totals',summaryX,750,12,true),L(summaryX,738,588),T('Wages / compensation (box 1)',summaryX,718,8),T(data.b1||'',475,718,9,true),T('Social security wages (box 3)',summaryX,696,8),T(data.b3||'',475,696,9,true),T('Medicare wages and tips (box 5)',summaryX,674,8),T(data.b5||'',475,674,9,true));
 I.push(T('Employee name and address',summaryX,636,10,true),L(summaryX,625,588));let ay=608;for(const row of pdf.wrap([data.employee,data.address].filter(Boolean).join('\n'),350,10,true)){I.push(T(row,summaryX,ay,10,true));ay-=13;}
 I.push(T('Employer-issued employee copies | Payroll Desk',summaryX,548,7),L(24,530,588));
 // Fits 483 points, with final baseline at 28 points.
 card(24,510,184,'B');card(212,510,184,'C');card(400,510,184,'2');
 if(preview)I.push(T('PREVIEW - NOT ISSUED',230,775,10,true));
 pdf.draw(I);return pdf.blob();
}
root.DocumentBuilders={offer,w2};
})(globalThis);
