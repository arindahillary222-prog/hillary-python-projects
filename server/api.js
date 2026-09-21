import ownerSeed from './owner-seed.json' with { type: 'json' };
const OWNER_EMAIL = 'owner@example.invalid';
const SESSION_COOKIE = 'work_tracker_session';
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100000;
export class HttpError extends Error { constructor(status, message) { super(message); this.status=status; } }
const fail=(status,message)=>{throw new HttpError(status,message);};
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const encoder=new TextEncoder();
const base64=bytes=>btoa(String.fromCharCode(...bytes));
const fromBase64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
const randomToken=()=>{const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return base64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
async function sha256(value){return crypto.subtle.digest('SHA-256',encoder.encode(value));}
async function passwordHash(password){
  if(typeof password!=='string'||password.length<12||password.length>200)fail(400,'Use a password between 12 and 200 characters.');
  const salt=new Uint8Array(16);crypto.getRandomValues(salt);
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:PASSWORD_ITERATIONS,hash:'SHA-256'},key,256);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${base64(salt)}$${base64(new Uint8Array(bits))}`;
}
async function passwordMatches(password,stored){
  const [scheme,iterationsText,saltText,hashText]=String(stored||'').split('$');
  const iterations=Number(iterationsText);if(scheme!=='pbkdf2'||!Number.isInteger(iterations)||iterations<100000||!saltText||!hashText)return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromBase64(saltText),iterations,hash:'SHA-256'},key,256);
  const actual=new Uint8Array(bits),expected=fromBase64(hashText);let diff=actual.length^expected.length;
  for(let i=0;i<actual.length;i++)diff|=actual[i]^(expected[i]||0);return diff===0;
}
async function tokenHash(token){return base64(new Uint8Array(await sha256(token)));}
function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(part=>part.trim().split('=' ,2)).filter(pair=>pair[0]));}
function sessionCookie(token,maxAge=SESSION_DAYS*86400){return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;}
export const json=(data,status=200,extraHeaders={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extraHeaders}});
function str(value,max=200,required=false) { if(value==null&&!required)return ''; if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(400,'Please complete the required fields.');return value.trim(); }
function date(value,required=false) { if(!value&&!required)return null; if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'Choose a valid date.');return value; }
const manager=m=>{if(m.role!=='manager')fail(403,'This action is available to managers only.');};
const publicMember=m=>({id:m.id,name:m.name,email:m.email,role:m.role,active:Boolean(m.active),owner:Boolean(m.owner),joined:Boolean(m.user_id),teamId:m.team_id||null});
async function rows(db,sql,...args){return (await db.prepare(sql).bind(...args).all()).results;}
async function body(request){if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'Send JSON data.');const value=await request.text();if(value.length>1500000)fail(413,'This update is too large. Export a backup and reduce its size.');try{const data=JSON.parse(value);if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Invalid update.');return data;}catch(e){if(e instanceof HttpError)throw e;fail(400,'Invalid JSON data.');}}

export async function getMember(request,env) {
  if(!env.DB)fail(503,'Account storage is temporarily unavailable. Please try again.');
  let m=null;
  if(env.SITES_AUTH_TRUSTED==='true') {
    const userId=request.headers.get('oai-authenticated-user-id');
    const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
    if(!userId||!email)fail(401,'Please sign in.');
    if(email===OWNER_EMAIL) fail(401,'This reusable edition requires a local account sign-in.');
    m=await env.DB.prepare('SELECT * FROM members WHERE user_id = ? OR email = ? LIMIT 1').bind(userId,email).first();
    if(!m||!m.active)fail(403,'Your account is not active. Ask your manager to add your sign-in email.');
    if(m.user_id&&m.user_id!==userId)fail(403,'This account is linked to a different sign-in.');
    if(!m.user_id){await env.DB.prepare('UPDATE members SET user_id = ? WHERE id = ? AND user_id IS NULL').bind(userId,m.id).run();m=await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(m.id).first();if(m.user_id!==userId)fail(403,'Account sign-in could not be verified.');}
  } else {
    const token=cookies(request)[SESSION_COOKIE];
    if(!token)fail(401,'Please sign in.');
    const hash=await tokenHash(token);
    m=await env.DB.prepare('SELECT m.* FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(hash,now()).first();
    if(!m||!m.active)fail(401,'Your session has expired. Please sign in again.');
  }
  return m;
}

async function createSession(env,member){
  const token=randomToken(),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id,member_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(uid(),member.id,await tokenHash(token),expires,now()).run();
  return token;
}

async function login(request,env){
  const value=await body(request),email=str(value.email,254,true).toLowerCase(),password=str(value.password,200,true);
  const member=await env.DB.prepare('SELECT * FROM members WHERE email = ? LIMIT 1').bind(email).first();
  if(!member||!member.active||!member.password_hash||!(await passwordMatches(password,member.password_hash)))fail(401,'Invalid email or password.');
  return json({member:publicMember(member)},200,{'Set-Cookie':sessionCookie(await createSession(env,member))});
}

async function setup(request,env){
  const value=await body(request),firstMember=await env.DB.prepare('SELECT id,password_hash FROM members LIMIT 1').first();
  if(firstMember && (!env.SETUP_TOKEN||value.setupToken!==env.SETUP_TOKEN))fail(403,'Initial setup is already locked. Sign in with the manager account.');
  const email=str(value.email||'',254,true).toLowerCase(),name=str(value.name||'Team owner',120,true),password=str(value.password,200,true);
  const hash=await passwordHash(password),existing=await env.DB.prepare('SELECT * FROM members WHERE email = ? OR owner = 1 LIMIT 1').bind(email).first();
  let member;
  if(existing?.password_hash)fail(409,'Initial manager setup has already been completed.');
  if(existing){await env.DB.prepare('UPDATE members SET email = ?,name = ?,role = ?,owner = 1,active = 1,password_hash = ? WHERE id = ?').bind(email,name,'manager',hash,existing.id).run();member=await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(existing.id).first();}
  else {const id='owner',teamId=uid(),inviteCode=randomToken().slice(0,10).toUpperCase();await env.DB.prepare('INSERT INTO teams (id,name,invite_code,created_at) VALUES (?,?,?,?)').bind(teamId,`${name}'s team`,inviteCode,now()).run();await env.DB.prepare('INSERT INTO members (id,team_id,email,name,role,owner,active,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,teamId,email,name,'manager',1,1,hash,now()).run();member=await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();}
  return json({member:publicMember(member)},201,{'Set-Cookie':sessionCookie(await createSession(env,member))});
}

async function register(request,env){
  const value=await body(request),email=str(value.email,254,true).toLowerCase(),name=str(value.name,120,true),password=str(value.password,200,true),inviteCode=str(value.inviteCode,40).toUpperCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email address.');
  if(password.length<12)fail(400,'Password must be at least 12 characters.');
  if(await env.DB.prepare('SELECT id FROM members WHERE email = ?').bind(email).first())fail(409,'That email already has an account.');
  let teamId,role='manager',owner=1,teamName=`${name}'s team`,code=inviteCode;
  if(inviteCode){const team=await env.DB.prepare('SELECT id FROM teams WHERE invite_code = ?').bind(inviteCode).first();if(!team)fail(400,'That team invite code is not valid.');teamId=team.id;role='employee';owner=0;}
  else {teamId=uid();code=randomToken().slice(0,10).toUpperCase();await env.DB.prepare('INSERT INTO teams (id,name,invite_code,created_at) VALUES (?,?,?,?)').bind(teamId,teamName,code,now()).run();}
  const id=uid(),hash=await passwordHash(password);await env.DB.prepare('INSERT INTO members (id,team_id,email,name,role,owner,active,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,teamId,email,name,role,owner,1,hash,now()).run();const member=await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();return json({member:publicMember(member),inviteCode:owner?code:null},201,{'Set-Cookie':sessionCookie(await createSession(env,member))});
}
async function logout(request,env){
  const token=cookies(request)[SESSION_COOKIE];if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await tokenHash(token)).run();
  return json({signedOut:true},200,{'Set-Cookie':sessionCookie('',0)});
}

export function initialData(member) {
  const data=structuredClone(ownerSeed);
  data.version='2.0.0';
  if(!member.owner) {
    for(const key of ['shifts','payslips','bonuses','workingTimeAccounts','transactions','scholarships','academicEvents','permitItems'])data[key]=[];
    data.activeShift=null;
    data.settings={...data.settings,appName:'WORK TRACKER'};
  }
  return data;
}
async function readData(env,m){const row=await env.DB.prepare('SELECT data,revision FROM tracker_data WHERE member_id = ?').bind(m.id).first();return row?{data:JSON.parse(row.data),revision:row.revision}:{data:initialData(m),revision:0};}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validateData(data,previous,m) {
  if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Invalid tracker data.');
  const collections=['jobs','shifts','payslips','bonuses','workingTimeAccounts','transactions','scholarships','academicEvents','permitItems'];
  for(const key of Object.keys(data))if(![...collections,'version','activeShift','settings'].includes(key))fail(400,'Unsupported tracker field.');
  for(const key of collections){if(!Array.isArray(data[key])||data[key].length>10000)fail(400,'Invalid tracker records.');for(const item of data[key])if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[\w-]{1,160}$/.test(item.id))fail(400,'A record has an invalid ID.');}
  if(!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings))fail(400,'Invalid settings.');
  if(m.role==='employee') {
    for(const key of collections.filter(k=>!['shifts','payslips'].includes(k)))if(!same(data[key],previous[key]))fail(403,'Employees can change their own hours, payslips and progress only.');
    const {locale:oldLocale,...oldSettings}=previous.settings;
    const {locale:newLocale,...newSettings}=data.settings;
    if(!same(oldSettings,newSettings))fail(403,'Only managers can change work settings.');
  }
  const jobs=new Map(data.jobs.map(j=>[j.id,j]));
  const oldShifts=new Map(previous.shifts.map(s=>[s.id,s]));
  for(const payslip of data.payslips){
    if(!jobs.has(payslip.jobId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(payslip.payrollMonth)||!['grossPaid','netPaid'].every(key=>typeof payslip[key]==='number'&&Number.isFinite(payslip[key])&&payslip[key]>=0)||!/^[A-Z]{3}$/.test(payslip.currency))fail(400,'Complete the payslip job, month, gross pay, net pay and currency.');
    if(payslip.hoursPaid!=null&&(!Number.isFinite(payslip.hoursPaid)||payslip.hoursPaid<0))fail(400,'Paid hours must be zero or greater.');
    date(payslip.paymentDate);
    str(payslip.sourceFile,255);str(payslip.notes,5000);
  }
  for(const shift of data.shifts){
    date(shift.date,true);
    if(!jobs.has(shift.jobId)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.end))fail(400,'Every shift needs a job and valid start and end times.');
    if(!['confirmed','completed','needs_review','cancelled'].includes(shift.workStatus))fail(400,'Invalid shift status.');
    const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
    let duration=minutes(shift.end)-minutes(shift.start);if(duration<0)duration+=1440;
    if(shift.source?.type==='clock'&&(shift.startedAt||shift.endedAt)){
      const started=Date.parse(shift.startedAt),ended=Date.parse(shift.endedAt);
      if(!Number.isFinite(started)||!Number.isFinite(ended)||ended<started)fail(400,'The recorded shift timestamps are invalid.');
      duration=Math.round((ended-started)/60000);
    }
    const pause=Number(shift.breakMinutes||0);
    if(!Number.isFinite(pause)||pause<0||pause>duration)fail(400,'The break must fit inside the shift.');
    shift.workedMinutes=duration-pause;
    const old=oldShifts.get(shift.id);
    const wage=m.role==='employee'?(old?.jobId===shift.jobId?old.wage:jobs.get(shift.jobId).hourlyWageGross):(shift.wage??jobs.get(shift.jobId).hourlyWageGross);
    if(!Number.isFinite(Number(wage))||Number(wage)<0)fail(400,'Invalid hourly wage.');
    shift.wage=Number(wage);shift.grossPayExpected=shift.workedMinutes/60*shift.wage;
    if(m.role==='employee')shift.paidStatus=old?.paidStatus||'unpaid';
    if(!['unpaid','partially_paid','paid','unknown'].includes(shift.paidStatus))fail(400,'Invalid payment status.');
  }
  if(data.activeShift&&(!jobs.has(data.activeShift.jobId)||!Number.isFinite(Date.parse(data.activeShift.startedAt))))fail(400,'Invalid active shift.');
  return data;
}

export async function handleApi(request,env) {
  try {
    const url=new URL(request.url), path=url.pathname, method=request.method;
    if(!['GET','HEAD'].includes(method)&&request.headers.get('origin')!==url.origin)fail(403,'This request must come from the app.');
    if(path==='/api/auth/login'&&method==='POST')return await login(request,env);
    if(path==='/api/auth/register'&&method==='POST')return await register(request,env);
    if(path==='/api/auth/setup'&&method==='POST')return await setup(request,env);
    if(path==='/api/auth/logout'&&method==='POST')return await logout(request,env);
    const m=await getMember(request,env), db=env.DB;
    if(path==='/api/session'&&method==='GET')return json({member:publicMember(m)});
    if(path==='/api/team'&&method==='GET'){const team=await db.prepare('SELECT id,name,invite_code FROM teams WHERE id = ?').bind(m.team_id).first();return json({team:team?{id:team.id,name:team.name,inviteCode:m.role==='manager'?team.invite_code:null}:null});}
    if(path==='/api/data'&&method==='GET')return json(await readData(env,m));
    if(path==='/api/data'&&method==='PUT'){
      const value=await body(request);const previous=await readData(env,m);
      if(!Number.isInteger(value.revision)||value.revision!==previous.revision)fail(409,'Your hours changed in another window. Reload before saving again. Your current changes are still on screen.');
      const data=validateData(value.data,previous.data,m), stamp=now();
      const result=await db.prepare('INSERT INTO tracker_data (member_id,data,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(member_id) DO UPDATE SET data = excluded.data, revision = tracker_data.revision + 1, updated_at = excluded.updated_at WHERE tracker_data.revision = ?').bind(m.id,JSON.stringify(data),stamp,value.revision).run();
      if(!result.meta.changes)fail(409,'Another update was saved first. Reload before saving again.');
      return json({revision:previous.revision+1,data});
    }
    if(path==='/api/members'){
      manager(m);
      if(method==='GET')return json({members:(await rows(db,'SELECT * FROM members WHERE team_id = ? ORDER BY owner DESC,name',m.team_id)).map(publicMember)});
      if(method==='POST'){
        const value=await body(request), email=str(value.email,254,true).toLowerCase(),name=str(value.name,120,true);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid sign-in email.');
        if(!['employee','manager'].includes(value.role))fail(400,'Choose an account role.');
        if(await db.prepare('SELECT id FROM members WHERE email = ?').bind(email).first())fail(409,'That email already has an account.');
        await db.prepare('INSERT INTO members (id,team_id,email,name,role,owner,active,created_at) VALUES (?,?,?,?,?,0,1,?)').bind(uid(),m.team_id,email,name,value.role,now()).run();
        return json({saved:true},201);
      }
    }
    const memberMatch=path.match(/^\/api\/members\/([\w-]+)$/);
    if(memberMatch&&method==='PATCH'){
      manager(m);const value=await body(request);
      const target=await db.prepare('SELECT * FROM members WHERE id = ? AND team_id = ?').bind(memberMatch[1],m.team_id).first();
      if(!target)fail(404,'Account not found.');
      if(target.owner||target.id===m.id)fail(403,'Your own account and the owner account cannot be changed here.');
      if(!['employee','manager'].includes(value.role)||typeof value.active!=='boolean')fail(400,'Choose a valid role and account status.');
      await db.prepare('UPDATE members SET role = ?, active = ? WHERE id = ? AND owner = 0').bind(value.role,value.active?1:0,target.id).run();
      return json({saved:true});
    }
    if(path==='/api/tasks'&&method==='GET'){
      const tasks=await rows(db,`SELECT t.*,m.name AS assignee_name FROM tasks t JOIN members m ON m.id=t.assignee_id WHERE m.team_id = ? ${m.role==='manager'?'':'AND t.assignee_id = ?'} ORDER BY t.due_date IS NULL,t.due_date,t.created_at DESC`,...(m.role==='manager'?[m.team_id]:[m.team_id,m.id]));
      return json({tasks});
    }
    if(path==='/api/tasks'&&method==='POST'){
      manager(m);const value=await body(request),title=str(value.title,160,true),description=str(value.description,2000),due=date(value.dueDate);
      const assignee=await db.prepare('SELECT id FROM members WHERE id = ? AND team_id = ? AND active = 1').bind(str(value.assigneeId,160,true),m.team_id).first();
      if(!assignee)fail(400,'Choose an active team member.');
      const id=uid(),stamp=now();await db.prepare('INSERT INTO tasks (id,title,description,assignee_id,created_by,due_date,status,progress,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,title,description,assignee.id,m.id,due,'not_started',0,stamp,stamp).run();
      return json({id},201);
    }
    const taskMatch=path.match(/^\/api\/tasks\/([\w-]+)$/);
    if(taskMatch&&['PATCH','DELETE'].includes(method)){
      manager(m);const task=await db.prepare('SELECT t.* FROM tasks t JOIN members a ON a.id=t.assignee_id WHERE t.id = ? AND a.team_id = ?').bind(taskMatch[1],m.team_id).first();if(!task)fail(404,'Task not found.');
      if(method==='DELETE'){await db.prepare('DELETE FROM tasks WHERE id = ?').bind(task.id).run();return json({saved:true});}
      const value=await body(request),assigneeId=str(value.assigneeId,160,true);
      if(!await db.prepare('SELECT id FROM members WHERE id = ? AND team_id = ? AND active = 1').bind(assigneeId,m.team_id).first())fail(400,'Choose an active team member.');
      const reassigned=task.assignee_id!==assigneeId;
      await db.prepare('UPDATE tasks SET title = ?,description = ?,assignee_id = ?,due_date = ?,status = ?,progress = ?,updated_at = ? WHERE id = ?').bind(str(value.title,160,true),str(value.description,2000),assigneeId,date(value.dueDate),reassigned?'not_started':task.status,reassigned?0:task.progress,now(),task.id).run();return json({saved:true});
    }
    if(path==='/api/progress'&&method==='GET'){
      const team=url.searchParams.get('scope')==='team';if(team)manager(m);
      return json({entries:await rows(db,`SELECT p.*,m.name AS member_name,t.title AS task_title FROM progress_entries p JOIN members m ON m.id=p.member_id LEFT JOIN tasks t ON t.id=p.task_id WHERE m.team_id = ? ${team?'':'AND p.member_id = ?'} ORDER BY p.date DESC,p.created_at DESC LIMIT 300`,...(team?[m.team_id]:[m.team_id,m.id]))});
    }
    if(path==='/api/progress'&&method==='POST'){
      const value=await body(request),day=date(value.date,true),note=str(value.note,3000,true),taskId=value.taskId||null;
      const percent=value.percent==null||value.percent===''?null:Number(value.percent);
      if(percent!==null&&(!Number.isInteger(percent)||percent<0||percent>100))fail(400,'Progress must be between 0 and 100%.');
      let task=null;if(taskId){task=await db.prepare('SELECT t.* FROM tasks t JOIN members a ON a.id=t.assignee_id WHERE t.id = ? AND t.assignee_id = ? AND a.team_id = ?').bind(taskId,m.id,m.team_id).first();if(!task)fail(403,'You can update only your assigned tasks.');}
      const statements=[db.prepare('INSERT INTO progress_entries (id,member_id,task_id,date,note,percent,created_at) VALUES (?,?,?,?,?,?,?)').bind(uid(),m.id,taskId,day,note,percent,now())];
      if(task&&percent!==null)statements.push(db.prepare('UPDATE tasks SET progress = ?,status = ?,updated_at = ? WHERE id = ? AND assignee_id = ?').bind(percent,percent===100?'completed':percent>0?'in_progress':'not_started',now(),taskId,m.id));
      await db.batch(statements);return json({saved:true},201);
    }
    if(path==='/api/team/logs'&&method==='GET'){
      manager(m);const data=await rows(db,'SELECT m.id,m.name,m.email,m.role,d.data FROM members m LEFT JOIN tracker_data d ON d.member_id=m.id WHERE m.team_id = ? ORDER BY m.name',m.team_id);
      return json({people:data.map(person=>{const saved=person.data?JSON.parse(person.data):initialData({owner:false});return {id:person.id,name:person.name,email:person.email,role:person.role,shifts:saved.shifts,jobs:saved.jobs,activeShift:saved.activeShift};})});
    }
    fail(404,'This action was not found.');
  } catch(error) {
    if(error instanceof HttpError)return json({error:error.message},error.status);
    console.error('Work Tracker API failure',error?.message);
    return json({error:'We could not save or load this information. Please try again.'},503);
  }
}
