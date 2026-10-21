(function(root){
'use strict';
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function create(options={}){
 const {PDFDocument,rgb}=PDFLib,doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const fonts={};for(const [key,data]of Object.entries(PayrollFonts))fonts[key]=await doc.embedFont(bytes(data),{subset:true});

 // === PASTE THE BULLETPROOF FALLBACK LOGIC HERE ===
 const rawDate = options.date || options.statementDate || options.statement_date || options.dateTime;
 let now = new Date();
 if (rawDate) {
   const parsed = new Date(rawDate);
   if (!isNaN(parsed.getTime())) { now = parsed; }
 }
 // ================================================

 doc.setTitle(options.title||'Payroll document');doc.setAuthor(options.author||'');doc.setSubject(options.subject||'');doc.setKeywords(Array.from(options.keywords||['Payroll Desk']));doc.setCreator('Payroll Desk 9.12.0');doc.setProducer('Payroll Desk 9.12.0 | QuestPDF');doc.setCreationDate(now);doc.setModificationDate(now);
 const page=doc.addPage([612,792]);
