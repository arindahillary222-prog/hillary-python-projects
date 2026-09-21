const test=require('node:test');const assert=require('node:assert/strict');
const {database,call,team,OWNER,ALICE,BOB}=require('./db.cjs');
test('sign-in allowlist, roles and disabled accounts are enforced by the server',async()=>{
 const db=database();try{
  assert.equal((await call(db,null,'/api/session')).status,401);
  assert.equal((await call(db,ALICE,'/api/session')).status,403);
  const members=await team(db),alice=members.find(m=>m.email===ALICE.email);
  assert.equal((await call(db,ALICE,'/api/session')).body.member.role,'employee');
  for(const route of ['/api/members','/api/team/logs','/api/progress?scope=team'])assert.equal((await call(db,ALICE,route)).status,403);
  assert.equal((await call(db,ALICE,'/api/members','POST',{email:'rogue@example.test',name:'Rogue',role:'manager'})).status,403);
  assert.equal((await call(db,ALICE,'/api/members/'+alice.id,'PATCH',{role:'manager',active:true})).status,403);
  assert.equal((await call(db,OWNER,'/api/members/'+alice.id,'PATCH',{role:'employee',active:false})).status,200);
  assert.equal((await call(db,ALICE,'/api/tasks')).status,403);
  assert.equal((await call(db,OWNER,'/api/members/owner','PATCH',{role:'employee',active:false})).status,403);
 }finally{db.close();}
});
test('task assignments, employee progress and overall logs stay within role and ownership',async()=>{
 const db=database();try{
  const members=await team(db),alice=members.find(m=>m.email===ALICE.email);
  const payload={title:'Paint the doors',description:'Ground floor',assigneeId:alice.id,dueDate:'2026-09-20'};
  assert.equal((await call(db,ALICE,'/api/tasks','POST',payload)).status,403);
  assert.equal((await call(db,OWNER,'/api/tasks','POST',payload,'https://evil.example')).status,403);
  const assigned=await call(db,OWNER,'/api/tasks','POST',payload);assert.equal(assigned.status,201);const id=assigned.body.id;
  assert.equal((await call(db,ALICE,'/api/tasks')).body.tasks.length,1);
  assert.equal((await call(db,BOB,'/api/tasks')).body.tasks.length,0);
  const progress={date:'2026-09-11',note:'Two doors finished.',taskId:id,percent:50};
  assert.equal((await call(db,BOB,'/api/progress','POST',progress)).status,403);
  assert.equal((await call(db,ALICE,'/api/tasks/'+id,'PATCH',payload)).status,403);
  assert.equal((await call(db,ALICE,'/api/progress','POST',progress)).status,201);
  assert.equal((await call(db,OWNER,'/api/tasks')).body.tasks[0].progress,50);
  assert.equal((await call(db,BOB,'/api/progress')).body.entries.length,0);
  assert.equal((await call(db,OWNER,'/api/progress?scope=team')).body.entries[0].member_name,'Alice');
  assert.equal((await call(db,OWNER,'/api/tasks/'+id,'DELETE')).status,200);
  assert.equal((await call(db,ALICE,'/api/progress')).body.entries[0].note,progress.note);
 }finally{db.close();}
});
test('personal time and payslips persist privately; pay tampering and stale saves are prevented',async()=>{
 const db=database();try{
  await team(db);
  const a=(await call(db,ALICE,'/api/data')).body,b=(await call(db,BOB,'/api/data')).body;
  assert.equal(a.data.shifts.length,0);assert.equal(a.data.payslips.length,0);
  const job=a.data.jobs[0];
  a.data.shifts.push({id:'alice-shift',jobId:job.id,date:'2026-09-10',start:'08:30',end:'17:00',breakMinutes:30,workStatus:'completed',paidStatus:'paid',wage:999,workedMinutes:9999,grossPayExpected:999999});
  a.data.payslips.push({id:'alice-payslip',jobId:job.id,payrollMonth:'2026-08',grossPaid:1800,netPaid:1400,currency:'EUR',sourceFile:'August.pdf',paymentDate:'2026-09-01'});
  const saved=await call(db,ALICE,'/api/data','PUT',a);assert.equal(saved.status,200,JSON.stringify(saved.body));
  const stored=(await call(db,ALICE,'/api/data?memberId=owner')).body;
  assert.equal(stored.data.shifts[0].workedMinutes,480);assert.equal(stored.data.shifts[0].wage,job.hourlyWageGross);assert.equal(stored.data.shifts[0].paidStatus,'unpaid');
  assert.equal((await call(db,ALICE,'/api/data','PUT',a)).status,409);
  assert.equal((await call(db,BOB,'/api/data')).body.data.shifts.length,b.data.shifts.length);
  assert.equal((await call(db,BOB,'/api/data')).body.data.payslips.length,0);
  stored.data.jobs[0].hourlyWageGross=999;assert.equal((await call(db,ALICE,'/api/data','PUT',stored)).status,403);
  const logs=(await call(db,OWNER,'/api/team/logs')).body.people.find(p=>p.email===ALICE.email);assert.equal(logs.shifts.length,1);assert.equal('payslips' in logs,false);
 }finally{db.close();}
});

test('clock timestamps preserve rounded elapsed minutes across minute boundaries and overnight',async()=>{
 const db=database();try{
  await team(db);let data=(await call(db,ALICE,'/api/data')).body;
  const shift={id:'clock-minute-boundary',jobId:data.data.jobs[0].id,date:'2026-09-11',start:'10:00',end:'10:02',startedAt:'2026-09-11T10:00:59.000Z',endedAt:'2026-09-11T10:02:00.000Z',source:{type:'clock',verified:true},breakMinutes:0,workedMinutes:1,workStatus:'completed',paidStatus:'unpaid'};
  data.data.shifts.push(shift);let saved=await call(db,ALICE,'/api/data','PUT',data);assert.equal(saved.status,200);assert.equal(saved.body.data.shifts[0].workedMinutes,1);
  data=saved.body;data.data.shifts[0]={...shift,start:'23:30',end:'00:30',startedAt:'2026-09-11T23:30:00.000Z',endedAt:'2026-09-13T00:30:00.000Z'};
  saved=await call(db,ALICE,'/api/data','PUT',data);assert.equal(saved.status,200);assert.equal(saved.body.data.shifts[0].workedMinutes,1500);
 }finally{db.close();}
});
