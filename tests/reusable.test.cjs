const assert=require('node:assert/strict');
const test=require('node:test');
const {database}=require('./db.cjs');
async function request(env,path,method='GET',data,cookie=''){
  const {handleApi}=await import('../server/api.js');
  const headers={Origin:'https://tracker.example'};
  if(data!==undefined)headers['Content-Type']='application/json';
  if(cookie)headers.Cookie=cookie.split(';')[0];
  const response=await handleApi(new Request('https://tracker.example'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),env);
  const body=await response.json();
  return {response,body,cookie:response.headers.get('set-cookie')||cookie};
}
const reg=(env,name,email,password='A sufficiently long password!')=>request(env,'/api/auth/register','POST',{name,email,password,inviteCode:''});

test('reusable edition creates isolated manager teams and employee accounts',async()=>{
  const env=database();env.SITES_AUTH_TRUSTED='false';
  try{
    const a=await reg(env,'Manager A','manager-a@example.test');assert.equal(a.response.status,201);assert.ok(a.body.inviteCode);
    const b=await reg(env,'Manager B','manager-b@example.test');assert.equal(b.response.status,201);assert.ok(b.body.inviteCode);assert.notEqual(a.body.inviteCode,b.body.inviteCode);
    const employee=await request(env,'/api/auth/register','POST',{name:'Employee A',email:'employee-a@example.test',password:'A sufficiently long password!',inviteCode:a.body.inviteCode});assert.equal(employee.response.status,201);assert.equal(employee.body.member.role,'employee');
    const aMembers=await request(env,'/api/members','GET',undefined,a.cookie);assert.equal(aMembers.response.status,200);assert.deepEqual(aMembers.body.members.map(x=>x.email).sort(),['employee-a@example.test','manager-a@example.test']);
    const bMembers=await request(env,'/api/members','GET',undefined,b.cookie);assert.equal(bMembers.response.status,200);assert.deepEqual(bMembers.body.members.map(x=>x.email),['manager-b@example.test']);
    const denied=await request(env,'/api/members','GET',undefined,employee.cookie);assert.equal(denied.response.status,403);
    const empty=(await request(env,'/api/data','GET',undefined,a.cookie)).body;assert.equal(empty.revision,0);assert.equal(empty.data.jobs.length,0);assert.equal(empty.data.shifts.length,0);
    const save=await request(env,'/api/data','PUT',{revision:0,data:{version:'2.0.0',jobs:[],shifts:[],payslips:[],bonuses:[],activeShift:null,workingTimeAccounts:[],transactions:[],scholarships:[],academicEvents:[],permitItems:[],settings:{weeklyLimitHours:20,yearlyDayLimit:140,monthlyBudget:0,currency:'EUR',appName:'WORK TRACKER',countryMode:'custom',locale:'en'}}},a.cookie);assert.equal(save.response.status,200);
    const bData=await request(env,'/api/data','GET',undefined,b.cookie);assert.equal(bData.body.revision,0);assert.equal(bData.body.data.jobs.length,0);
  }finally{env.close();}
});

test('reusable build keeps generic PWA and export assets',async()=>{
  const fs=require('node:fs');const manifest=fs.readFileSync('web/manifest.webmanifest','utf8');const sw=fs.readFileSync('web/sw.js','utf8');assert.match(manifest,/WORK TRACKER/);assert.doesNotMatch(manifest,/Hillary|Özhan|Lehrieder/);assert.match(sw,/cache/i);
});
