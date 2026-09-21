const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const dist = path.resolve(__dirname, '../web');
const {database,call,team,OWNER,ALICE,BOB}=require('./db.cjs');

async function app({saved, standalone = false, db = database(), identity=OWNER} = {}) {
  const errors = [], downloads = [], revoked = [], urls = new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), { url: 'https://tracker.example/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  // jsdom postMessage has no browser Window source; use the host scheduler for JSZip.
  w.setImmediate = setImmediate;
  w.clearImmediate = clearImmediate;
  let instant = '2026-09-09T10:00:00.000Z';
  const RealDate = w.Date;
  w.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [instant])); } static now() { return new RealDate(instant).getTime(); } };
  w.matchMedia = () => ({ matches: standalone });
  w.scrollTo = () => {};
  w.fetch = async (url, options={}) => {
    const result=await call(db,identity,new URL(url,'https://tracker.example').pathname+new URL(url,'https://tracker.example').search,options.method||'GET',options.body?JSON.parse(options.body):undefined);
    return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json'}});
  };
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, href: this.href }); };
  w.URL.createObjectURL = blob => { const url = 'blob:test-' + urls.size; urls.set(url, blob); return url; };
  w.URL.revokeObjectURL = url => revoked.push(url);
  w.alert = message => { throw new Error(message); };
  w.open = () => { throw new Error('Exports must not depend on popup windows'); };
  w.localStorage.setItem('work_tracker_hillary_21_install_id_v1', 'test-install');
  if (saved) w.localStorage.setItem(`work_tracker_hillary_21_data_v1:${standalone ? 'installed' : 'browser'}:test-install`, JSON.stringify(saved));
  const ready = new Promise(resolve => w.document.addEventListener('DOMContentLoaded', () => setImmediate(resolve), {once:true}));
  for (const filename of ['work-core.js','vendor/pdf-lib.min.js','vendor/jszip.min.js','reporting.js','payslip-parser.js','payslip-import.js','team.js','app.js']) w.eval(fs.readFileSync(path.join(dist,filename),'utf8') + (filename === 'app.js' ? '\nwindow.__testRun = code => eval(code);' : ''));
  await ready;
  await w.trackerReady;
  assert.ok(w.document.documentElement.classList.contains("account-ready"),w.document.querySelector("#accountLoadingText").textContent);
  assert.deepEqual(errors.map(e => e.message), [], 'App initializes without runtime errors');
  const result = { w, db, errors, downloads, urls, revoked, q: selector => w.document.querySelector(selector), run: script => w.__testRun(script), setNow: value => instant = value, close: async () => { await w.TeamWorkspace.flush(); dom.window.close(); } };
  return result;
}
const input = (a, name, value) => { a.q(`[name="${name}"]`).value = value; };
function saveDialog(a) {
  a.q('#entryForm').dispatchEvent(new a.w.SubmitEvent('submit', {bubbles:true,cancelable:true, submitter:a.q('#dialogSaveButton')}));
}

 test('all months use full seven-column weeks; selecting a recorded day opens its actual shift', async () => {
  const a = await app();
  try {
    assert.equal(a.q('#workCalendarGrid').children.length, 35);
    a.q('[data-calendar-date="2026-09-02"]').click();
    assert.match(a.q('#calendarDayDetails').textContent, /09:30–14:45/);
    assert.equal(a.q('#entryDialog').open, false);
    for(let i=0;i<24;i++) {
      const count = a.q('#workCalendarGrid').children.length;
      assert.ok([28,35,42].includes(count));
      assert.equal(count / 7, Number(a.q('#workCalendarGrid').style.getPropertyValue('--calendar-rows')));
      a.q('#calendarNext').click();
    }
    a.q('#calendarToday').click();
    assert.match(a.q('#workCalendarTitle').textContent, /September 2026/);
    const css = fs.readFileSync(path.join(dist,'styles.css'),'utf8');
    assert.doesNotMatch(css,/min-width:\s*700px/);
    assert.match(css,/aspect-ratio:\s*1/);
    assert.match(css,/\.shift-table td\[data-label="Actions"\]/);
  } finally { await a.close(); }
});

test('ledger edits fire once after repeated renders, recalculate pay, and persist after reload', async () => {
  const a = await app();
  let saved;
  try {
    const id = 'painting-ozhan-2026-09-02';
    a.run('renderAll(); renderWork(); renderSettings(); renderAll();');
    let opens = 0;
    a.q('#entryDialog').showModal = function () { opens++; this.open = true; };
    a.q('#ledgerMonthFilter').value='2026-09';a.run('renderWork()');
    a.q(`#shiftRows [data-edit-shift="${id}"]`).click();
    assert.equal(opens,1);
    input(a,'start','10:00'); input(a,'end','15:30'); input(a,'breakMinutes','30'); input(a,'workStatus','completed');
    saveDialog(a);
    assert.equal(a.q('#entryDialog').open,false);
    const shift = a.run(`state.shifts.find(s=>s.id==='${id}')`);
    assert.equal(shift.workedMinutes,300);
    assert.equal(shift.grossPayExpected,70);
    assert.ok(shift.userEditedAt);
    assert.equal(a.run('getAnalytics().reviewShiftCount'),3);
    a.q('#ledgerMonthFilter').value='2026-09';a.run('renderWork()');
    a.q(`#shiftRows [data-edit-shift="${id}"]`).click();
    input(a,'end','19:00');
    a.q('#entryForm').dispatchEvent(new a.w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:a.q('#entryForm button[value="cancel"]')}));
    assert.equal(a.run(`state.shifts.find(s=>s.id==='${id}').end`),'15:30');
    a.q('#ledgerMonthFilter').value='2026-09';
    a.q('#ledgerMonthFilter').dispatchEvent(new a.w.Event('input'));
    a.q(`#shiftRows [data-delete-shift="${id}"]`).click();
    assert.equal(a.run(`state.shifts.some(s=>s.id==='${id}')`),false);
    saved = JSON.parse(a.run('JSON.stringify(state)'));
  } finally { await a.close(); }
  saved.version='1.4.0';
  const reloaded = await app({saved});
  try { assert.equal(reloaded.run("state.shifts.some(s=>s.id==='painting-ozhan-2026-09-02')"), false, 'An upgrade must not resurrect a deleted shift'); }
  finally { await reloaded.close(); }
});

test('saved user edits survive review migration, seeded records are excluded, and known Lehrieder history remains paid', async () => {
  const original = await app();
  const saved = JSON.parse(original.run('JSON.stringify(state)'));
  await original.close();
  saved.version='1.4.0';
  saved.shifts.filter(s=>s.jobId==='painting-ozhan').forEach(s=>{s.workStatus='completed';s.source={type:'manual',verified:true};});
  const edited=saved.shifts.find(s=>s.date==='2026-09-03');
  edited.start='11:00'; edited.end='16:00'; edited.workedMinutes=999; edited.grossPayExpected=9999;
  const a=await app({saved});
  try {
    assert.equal(a.run('getAnalytics().reviewShiftCount'),3);
    assert.equal(a.run("state.shifts.find(s=>s.date==='2026-09-03').workStatus"),'completed');
    assert.equal(a.run("state.shifts.find(s=>s.date==='2026-09-03').workedMinutes"),300);
    assert.equal(a.run("state.shifts.find(s=>s.date==='2026-09-03').grossPayExpected"),70);
    assert.equal(a.run('getAnalytics().confirmedHours'),30);
    assert.equal(a.run("state.shifts.filter(s=>s.jobId===LEHRIEDER_JOB_ID && s.date<'2026-09-06').every(s=>s.paidStatus==='paid' && s.workStatus==='completed')"),true);
    assert.equal(a.run("state.shifts.filter(s=>s.date.startsWith('2026-03')).reduce((t,s)=>t+s.workedMinutes,0)"),7310);
    assert.equal(a.run("state.shifts.filter(s=>s.date.startsWith('2026-04')).reduce((t,s)=>t+s.workedMinutes,0)"),1340);
    assert.equal(a.run("state.shifts.filter(s=>s.date.startsWith('2026-05')).reduce((t,s)=>t+s.workedMinutes,0)"),780);
  } finally {await a.close();}
});

test('clock start and stop saves exactly one worked shift, including after installed-app reload', async () => {
  const a = await app({standalone:true});
  let saved;
  try {
    a.q('#clockActionButton').click();
    assert.equal(a.q('#clockActionButton').textContent,'Stop shift');
    saved=JSON.parse(a.run('JSON.stringify(state)'));
  } finally {await a.close();}
  const b = await app({saved,standalone:true});
  try {
    b.setNow('2026-09-09T18:30:00.000Z');
    b.q('#clockActionButton').click();
    assert.equal(b.q('#clockActionButton').textContent,'Start shift');
    const clocks=b.run("state.shifts.filter(s=>s.source.type==='clock')");
    assert.equal(clocks.length,1); assert.equal(clocks[0].workedMinutes,510); assert.equal(clocks[0].grossPayExpected,119);
    assert.equal(b.run('state.activeShift'),null);
  } finally {await b.close();}
});

test('period planning, duplicate rejection, invalid shifts, and cancellation work through controls', async () => {
  const a=await app();
  try {
    a.q('#planPeriodButton').click();
    input(a,'dateFrom','2026-10-05');input(a,'dateTo','2026-10-09');input(a,'dayPattern','weekdays');
    input(a,'start','08:30');input(a,'end','17:00');saveDialog(a);
    assert.equal(a.run("state.shifts.filter(s=>s.date.startsWith('2026-10')).length"),5);
    a.q('#addShiftButton').click();
    input(a,'date','2026-09-09');input(a,'start','10:00');input(a,'end','11:00');input(a,'breakMinutes','90');saveDialog(a);
    assert.equal(a.q('#entryDialog').open,true);assert.match(a.q('#dialogError').textContent,/break/);
    input(a,'breakMinutes','0');input(a,'workStatus','cancelled');saveDialog(a);
    assert.equal(a.q('#entryDialog').open,false);
    assert.equal(a.run("state.shifts.find(s=>s.date==='2026-09-09').workStatus"),'cancelled');
    assert.equal(a.run("isCompletedShift(state.shifts.find(s=>s.date==='2026-09-09'))"),false);
  } finally {await a.close();}
});

async function clickExport(a, selector) {
  const before = a.downloads.length;
  a.q(selector).click();
  await new Promise((resolve,reject) => {
    const timeout = setTimeout(() => { clearInterval(poll); reject(new Error('Export timed out')); },5000);
    const poll = setInterval(() => {
      if(a.downloads.length > before) { clearInterval(poll); clearTimeout(timeout); resolve(); }
    },10);
  });
}

test('PDF, real Excel, CSV and ledger PDF download without popups, with a retained phone save link', {timeout: 20000}, async () => {
  const a=await app();
  try {
    for(const [format,extension] of [['pdf','pdf'],['excel','xlsx'],['csv','csv']]) {
      a.q('#exportFormat').value=format;
      await clickExport(a, '#exportReportButton');
      assert.equal(a.downloads.at(-1).name.endsWith('.'+extension),true);
      assert.equal(a.q('#exportReady').hidden,false);
      const blob=a.urls.get(a.downloads.at(-1).href);
      assert.ok(blob.size>100);
      assert.equal(a.revoked.includes(a.downloads.at(-1).href),false);
      assert.equal(a.q('#exportReportButton').disabled,false);
    }
    a.q('#ledgerMonthFilter').value='2026-09';
    await clickExport(a, '#exportShiftsPdf');
    assert.equal(a.downloads.at(-1).name.endsWith('.pdf'),true);
    await a.w.TeamWorkspace.flush();
    assert.deepEqual(a.errors.map(e=>e.message),[]);
  } finally {await a.close();}
});

test('multiple completed shifts on one date count as one worked day', async () => {
  const a=await app();
  try {
    a.run("state.shifts = [normalizeShift({id:'one',jobId:STARTER_JOB_ID,date:'2026-09-08',start:'07:00',end:'12:00',workStatus:'completed'},state.jobs),normalizeShift({id:'two',jobId:LEHRIEDER_JOB_ID,date:'2026-09-08',start:'13:00',end:'18:00',workStatus:'completed'},state.jobs)];");
    assert.equal(a.run('getAnalytics().actualShiftDays'),1);
    assert.equal(a.run('getAnalytics().yearlyDayUnits'),1);
  } finally {await a.close();}
});

async function waitFor(check){for(let i=0;i<150;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('The screen did not finish updating.');}
function submitTeam(a){a.q('#teamForm').dispatchEvent(new a.w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:a.q('#teamSave')}));}
test('manager assigns a task, employee posts progress and clocks hours, manager sees both',async()=>{
 const db=database();await team(db);const manager=await app({db});let employee;
 try{
  manager.run("showRoute('tasks')");await waitFor(()=>manager.q('[data-team-action="new-task"]'));
  manager.q('[data-team-action="new-task"]').click();input(manager,'title','Finish room 2');input(manager,'assigneeId',(await call(db,OWNER,'/api/members')).body.members.find(m=>m.email===ALICE.email).id);submitTeam(manager);
  await waitFor(()=>!manager.q('#teamDialog').open);assert.match(manager.q('#tasksContent').textContent,/Finish room 2/);
  employee=await app({db,identity:ALICE});assert.equal(employee.w.TeamWorkspace.member.role,'employee');
  assert.equal(employee.q('[data-team-route="people"]'),null);assert.equal(employee.q('#homeActions').children.length,6);
  employee.run("showRoute('people')");assert.equal(employee.run('currentRoute()'),'home');
  employee.run("showRoute('tasks')");await waitFor(()=>employee.q('#tasksContent [data-team-action="progress"][data-id]'));
  employee.q('#tasksContent [data-team-action="progress"]').click();input(employee,'note','All walls finished');input(employee,'percent','100');submitTeam(employee);await waitFor(()=>!employee.q('#teamDialog').open);
  employee.run("showRoute('work')");employee.q('#clockActionButton').click();await employee.w.TeamWorkspace.flush();
  employee.setNow('2026-09-09T13:00:00.000Z');employee.q('#clockActionButton').click();await employee.w.TeamWorkspace.flush();
  const stored=(await call(db,ALICE,'/api/data')).body;assert.equal(stored.data.shifts.length,1);assert.equal(stored.data.shifts[0].workedMinutes,180);
  manager.run("showRoute('team-progress')");await waitFor(()=>manager.q('#team-progressContent').textContent.includes('All walls finished'));
  manager.run("showRoute('team-logs')");await waitFor(()=>manager.q('#team-logsContent').textContent.includes('3.00 h worked'));
 }finally{if(employee)await employee.close();await manager.close();db.close();}
});

test('payslip form accepts PDF, requires review, rejects duplicates and saves privately',async()=>{
 const db=database();await team(db);const a=await app({db,identity:ALICE});
 try{
  a.run("showRoute('payslips')");a.q('#addPayslipButton').click();assert.equal(a.q('#payslipPdfInput').accept,'application/pdf,.pdf');
  input(a,'payrollMonth','2026-08');input(a,'grossPaid','1800');input(a,'netPaid','1400');input(a,'hoursPaid','120');input(a,'sourceFile','August.pdf');
  a.q('#pdfReview').hidden=false;a.q('#pdfReviewCheck').required=true;saveDialog(a);assert.match(a.q('#dialogError').textContent,/Review/);assert.equal(a.run('state.payslips.length'),0);
  a.q('#pdfReviewCheck').checked=true;saveDialog(a);await a.w.TeamWorkspace.flush();assert.equal(a.q('#entryDialog').open,false);
  assert.equal((await call(db,ALICE,'/api/data')).body.data.payslips[0].sourceFile,'August.pdf');
  assert.equal((await call(db,BOB,'/api/data')).body.data.payslips.length,0);
  a.q('#addPayslipButton').click();input(a,'payrollMonth','2026-08');input(a,'grossPaid','1800');input(a,'netPaid','1400');saveDialog(a);assert.match(a.q('#dialogError').textContent,/already saved/);
 }finally{await a.close();db.close();}
});
