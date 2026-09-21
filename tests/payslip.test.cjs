const test=require('node:test');const assert=require('node:assert/strict');
const parser=require('../web/payslip-parser.js');
const PDF=require('../web/vendor/pdf-lib.min.js');
const jobs=[{id:'employer',name:'Kitchen',employerName:'Example Catering GmbH'}];
const german='Example Catering GmbH\nEntgeltabrechnung August 2026\nGesamt-Brutto 1.800,50\nSteuer-Brutto 1.750,00\nNettoverdienst 1.405,25\nAuszahlungsbetrag 1.425,25 EUR\nBezahlte Stunden 120,00\nZahlungsdatum 01.09.2026\nJahresbrutto 15.900,00';
test('German and English current payslip fields, decimal separators and missing values',()=>{
 const result=parser.parse(german,jobs);
 assert.deepEqual(result.fields,{grossPaid:1800.5,netPaid:1425.25,hoursPaid:120,payrollMonth:'2026-08',paymentDate:'2026-09-01',currency:'EUR',jobId:'employer'});
 const english=parser.parse('Payroll month: 2026-08\nGross pay: 2,100.00\nNet pay: 1,654.30\nHours paid: 140.5\nPay date: 2026-09-01\nUSD');
 assert.equal(english.fields.grossPaid,2100);assert.equal(english.fields.netPaid,1654.3);assert.equal(english.fields.hoursPaid,140.5);
 const partial=parser.parse('Gross pay YTD: 9,500.00\nNet pay: 900.00\nSocial insurance gross: 1,200.00');
 assert.equal(partial.fields.grossPaid,undefined);assert.equal(partial.fields.payrollMonth,undefined);
 const ambiguous=parser.parse('Gross pay 1,000.00\nGross pay 2,000.00');assert.equal(ambiguous.fields.grossPaid,undefined);assert.equal(ambiguous.warnings.length,1);
});
async function pdfText(){
 const doc=await PDF.PDFDocument.create();const page=doc.addPage([595,842]);const font=await doc.embedFont(PDF.StandardFonts.Helvetica);
 german.split('\n').forEach((line,i)=>page.drawText(line,{font,size:14,x:40,y:790-i*35}));return new Uint8Array(await doc.save());
}
test('real PDF bytes are read by the shipped PDF.js reader and mapped to payroll fields',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=pdfjs.getDocument({data:await pdfText(),isEvalSupported:false,useSystemFonts:true});const doc=await task.promise;
 try{const text=parser.textFromItems((await (await doc.getPage(1)).getTextContent()).items);const result=parser.parse(text,jobs);assert.equal(result.fields.grossPaid,1800.5);assert.equal(result.fields.netPaid,1425.25);assert.equal(result.fields.payrollMonth,'2026-08');}
 finally{await doc.destroy();}
});
test('scanned payslip PDF renders, OCR reads the image, and current pay is extracted', {timeout:60000},async()=>{
 const {createCanvas}=require('@napi-rs/canvas');const {createWorker}=require('tesseract.js');const path=require('node:path');
 const canvas=createCanvas(1400,1200),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1400,1200);ctx.fillStyle='black';ctx.font='32px Arial';
 german.split('\n').forEach((line,i)=>ctx.fillText(line,70,95+i*70));
 const doc=await PDF.PDFDocument.create(),png=await doc.embedPng(canvas.toBuffer('image/png')),page=doc.addPage([700,600]);page.drawImage(png,{x:0,y:0,width:700,height:600});
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const scanned=await pdfjs.getDocument({data:new Uint8Array(await doc.save())}).promise;
 let worker;try{
  const page=await scanned.getPage(1);assert.equal((await page.getTextContent()).items.length,0);
  const viewport=page.getViewport({scale:2}),rendered=createCanvas(viewport.width,viewport.height);await page.render({canvasContext:rendered.getContext('2d'),viewport}).promise;
  // Same engine and language files as the browser; Node uses local package paths.
  worker=await createWorker('eng',1,{langPath:path.resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int'),cacheMethod:'none'});
  const result=parser.parse((await worker.recognize(rendered.toBuffer('image/png'))).data.text,jobs);
  assert.equal(result.fields.grossPaid,1800.5);assert.equal(result.fields.netPaid,1425.25);assert.equal(result.fields.payrollMonth,'2026-08');
 }finally{if(worker)await worker.terminate();await scanned.destroy();}
});
