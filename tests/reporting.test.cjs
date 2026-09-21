const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const reports = require('../web/reporting.js');
const JSZip = require('../web/vendor/jszip.min.js');
const PDF = require('../web/vendor/pdf-lib.min.js');
const jobs = [{ id: 'painting', name: 'Painting', employerName: 'Özhan', hourlyWageGross: 14 }];
const data = {
  shifts: [
    { jobId:'painting',date:'2026-09-07',start:'08:30',end:'17:00',breakMinutes:0,workedMinutes:510,wage:14,grossPayExpected:119,workStatus:'completed',paidStatus:'unpaid',location:'Lichtenreuth',notes:'Walls & doors' },
    { jobId:'painting',date:'2026-09-14',start:'08:30',end:'16:30',breakMinutes:0,workedMinutes:480,wage:14,grossPayExpected:112,workStatus:'confirmed',paidStatus:'unpaid',notes:'' },
    { jobId:'painting',date:'2026-09-15',start:'08:30',end:'16:30',breakMinutes:0,workedMinutes:480,wage:14,grossPayExpected:112,workStatus:'needs_review',paidStatus:'unknown',notes:'Unverified' },
    { jobId:'painting',date:'2026-09-16',start:'08:30',end:'16:30',breakMinutes:0,workedMinutes:480,wage:14,grossPayExpected:112,workStatus:'cancelled',paidStatus:'unpaid',notes:'Cancelled' }
  ],
  bonuses: [{jobId:'painting',date:'2026-09-07',task:'Sanding doors',quantity:'4 doors',amount:56,paidStatus:'unpaid',notes:''}]
};
const monthly = reports.filterData(data,{scope:'month',referenceDate:'2026-09-07',jobId:'painting'});

test('day, week, month, year and custom periods include exact boundaries', () => {
  assert.deepEqual(reports.periodBounds('day','2026-09-07'),{from:'2026-09-07',to:'2026-09-07'});
  assert.deepEqual(reports.periodBounds('week','2026-09-09'),{from:'2026-09-07',to:'2026-09-13'});
  assert.deepEqual(reports.periodBounds('month','2026-09-09'),{from:'2026-09-01',to:'2026-09-30'});
  assert.deepEqual(reports.periodBounds('year','2026-09-09'),{from:'2026-01-01',to:'2026-12-31'});
  assert.deepEqual(reports.periodBounds('custom','2026-09-09','2026-09-03','2026-09-18'),{from:'2026-09-03',to:'2026-09-18'});
  assert.deepEqual(reports.periodBounds('month','2028-02-09'),{from:'2028-02-01',to:'2028-02-29'});
  assert.deepEqual(reports.periodBounds('week','2027-01-01'),{from:'2026-12-28',to:'2027-01-03'});
  assert.equal(reports.filterData(data,{scope:'day',referenceDate:'2026-09-07',jobId:'all'}).shifts.length,1);
  assert.equal(reports.filterData(data,{scope:'year',referenceDate:'2026-09-07',jobId:'missing'}).shifts.length,0);
});

test('scheduled, disputed and cancelled shifts cannot inflate worked totals', () => {
  const t=reports.summary(monthly);
  assert.equal(t.hours,8.5);assert.equal(t.shiftGross,119);assert.equal(t.totalGross,175);
  assert.equal(t.scheduledHours,8);assert.equal(t.scheduledGross,112);
  assert.equal(t.reviewCount,1);assert.equal(t.cancelledCount,1);
});

test('Excel is a real XLSX archive with numeric values, separate sheets, and escaped user text', async () => {
  const bytes=await reports.buildExcel(monthly,jobs,'EUR');
  assert.equal(Buffer.from(bytes).subarray(0,2).toString(),'PK');
  const zip=await JSZip.loadAsync(bytes);
  const workbook=await zip.file('xl/workbook.xml').async('string');
  for(const sheet of ['Summary','Shifts','Bonus Payments'])assert.ok(workbook.includes(sheet));
  const sheet=await zip.file('xl/worksheets/sheet2.xml').async('string');
  assert.ok(sheet.includes('Özhan'));assert.ok(sheet.includes('Walls &amp; doors'));assert.ok(sheet.includes('<v>119</v>'));
  assert.ok((await zip.file('xl/worksheets/sheet1.xml').async('string')).includes('<v>175</v>'));
});

test('CSV carries readable statuses, bonuses, accents and quoted line breaks', () => {
  const csv=reports.buildCsv(monthly,jobs);
  for(const text of ['Özhan','Sanding doors','Completed','Scheduled','Needs review','Cancelled'])assert.ok(csv.includes(text));
  const special={...monthly,shifts:[{...data.shifts[0],notes:'=SUM(A1:A2)\r\n"test"'}]};
  assert.ok(reports.buildCsv(special,jobs).includes('"\'=SUM(A1:A2)\r\n""test"""'));
});

test('PDF exports valid paginated bytes for long yearly reports and empty periods', async () => {
  const report={...monthly,shifts:Array.from({length:200},(_,i)=>({...data.shifts[i%4],notes:i===0?'Very long notes '.repeat(500):data.shifts[i%4].notes}))};
  const bytes=await reports.buildPdf(report,jobs,'EUR');
  assert.match(Buffer.from(bytes).subarray(0,8).toString(),/^%PDF-/);
  assert.ok((await PDF.PDFDocument.load(bytes)).getPageCount()>5);
  const empty=await reports.buildPdf({...monthly,shifts:[],bonuses:[]},jobs,'EUR');
  assert.equal((await PDF.PDFDocument.load(empty)).getPageCount(),1);
  const output=process.env.WORK_TRACKER_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(),'work-tracker-reports-'));
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'report.pdf'),await reports.buildPdf(monthly,jobs,'EUR'));
  fs.writeFileSync(path.join(output,'year-report.pdf'),bytes);
  fs.writeFileSync(path.join(output,'report.xlsx'),await reports.buildExcel(monthly,jobs,'EUR'));
});
