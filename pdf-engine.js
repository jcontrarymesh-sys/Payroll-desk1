(function(root){
'use strict';
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function create(options={}){
 const {PDFDocument,rgb}=PDFLib,doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const fonts={};for(const [key,data]of Object.entries(PayrollFonts))fonts[key]=await doc.embedFont(bytes(data),{subset:true});

 // Clean extraction parameters checking the options payload
 const rawDate = options.date || options.statementDate || options.statement_date || options.dateTime;
 let now = new Date();
 if (rawDate) {
   const parsed = new Date(rawDate);
   if (!isNaN(parsed.getTime())) { now = parsed; }
 }

 doc.setTitle(options.title||'Payroll document');doc.setAuthor(options.author||'');doc.setSubject(options.subject||'');doc.setKeywords(Array.from(options.keywords||['Payroll Desk']));doc.setCreator('Payroll Desk 9.12.0');doc.setProducer('Payroll Desk 9.12.0 | QuestPDF');doc.setCreationDate(now);doc.setModificationDate(now);
 const page=doc.addPage([612,792]);
 const fontFor=i=>i.italic?fonts.italic:i.bold?fonts.bold:fonts.regular;
 function draw(items,target=page){for(const i of items){
 if(i.kind==='line'){target.drawLine({start:{x:i.x,y:i.y},end:{x:i.x2,y:i.y2},thickness:i.width||.65,color:rgb(0,0,0),dashArray:i.dash?[4,4]:undefined});continue;}
 if(['rect','fill','colorfill'].includes(i.kind)){const opts={x:i.x,y:i.y,width:i.w,height:i.h};if(i.kind==='rect'){opts.borderWidth=.8;opts.borderColor=rgb(0,0,0);}else{opts.color=i.kind==='colorfill'?rgb(...i.rgb):rgb(i.gray??.91,i.gray??.91,i.gray??.91);}target.drawRectangle(opts);continue;}
 const font=fontFor(i),size=i.size||8,text=String(i.text??'').replace(/\t/g,'    ');const width=font.widthOfTextAtSize(text,size);target.drawText(text,{x:i.right!==undefined?i.right-width:i.x,y:i.y,size,font,color:rgb(0,0,0)});
 }}
 async function logo(data,x,y,w,h,target=page){if(!data)return;const image=data.startsWith('data:image/png')?await doc.embedPng(data):await doc.embedJpg(data);const factor=Math.min(w/image.width,h/image.height);target.drawImage(image,{x,y,width:image.width*factor,height:image.height*factor});}
 function wrap(text,width,size=10,bold=false){const font=bold?fonts.bold:fonts.regular;const rows=[];for(const paragraph of String(text||'').split(/\n/)){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;if(font.widthOfTextAtSize(word,size)>width)throw Error('A word or identifier is too long for the selected layout.');if(line&&font.widthOfTextAtSize(line+' '+word,size)>width){rows.push(line);line=word;}else line+=(line?' ':'')+word;}rows.push(line);}return rows;}
 return {doc,page,fonts,draw,logo,wrap,blob:async()=>new Blob([await doc.save()],{type:'application/pdf'})};
}
async function render(items,options){const pdf=await create(options);pdf.draw(items);if(options?.logo)await pdf.logo(options.logo,options.logoX||36,options.logoY||40,options.logoW||42,options.logoH||42);return pdf.blob();}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
root.PayrollPdf={create,render,download};
})(globalThis);
