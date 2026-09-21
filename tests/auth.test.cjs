const assert=require('node:assert/strict');
const test=require('node:test');
const {database}=require('./db.cjs');
const {handleApi}=require('../server/api.js');

async function request(env,path,method='GET',body,cookie){
  const headers={Origin:'https://tracker.example'};
  if(body!==undefined){headers['Content-Type']='application/json';}
  if(cookie)headers.Cookie=cookie;
  const response=await handleApi(new Request('https://tracker.example'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);
  return {response,body:await response.json()};
}

test('app-managed setup, login, session and logout use secure cookies',async()=>{
  const env=database();env.SITES_AUTH_TRUSTED='false';env.SETUP_TOKEN='test-only-setup-token';
  try{
    const setup=await request(env,'/api/auth/setup','POST',{setupToken:'test-only-setup-token',name:'Owner',email:'owner@example.test',password:'a sufficiently long password'});
    assert.equal(setup.response.status,201);
    const setupCookie=setup.response.headers.get('set-cookie');
    assert.match(setupCookie,/HttpOnly/);assert.match(setupCookie,/Secure/);assert.match(setupCookie,/SameSite=Lax/);
    const login=await request(env,'/api/auth/login','POST',{email:'owner@example.test',password:'a sufficiently long password'});
    assert.equal(login.response.status,200);
    const cookie=login.response.headers.get('set-cookie');assert.match(cookie,/work_tracker_session=/);
    const session=await request(env,'/api/session','GET',undefined,cookie);
    assert.equal(session.response.status,200);assert.equal(session.body.member.role,'manager');
    const bad=await request(env,'/api/auth/login','POST',{email:'owner@example.test',password:'wrong password'});
    assert.equal(bad.response.status,401);
    const logout=await request(env,'/api/auth/logout','POST',undefined,cookie);
    assert.equal(logout.response.status,200);
    const expired=await request(env,'/api/session','GET',undefined,cookie);
    assert.equal(expired.response.status,401);
  }finally{env.close();}
});

test('empty deployment can initialize its first manager without a setup-token mismatch',async()=>{
  const env=database();env.SITES_AUTH_TRUSTED='false';delete env.SETUP_TOKEN;
  try{
    const setup=await request(env,'/api/auth/setup','POST',{name:'First Owner',email:'first@example.test',password:'another sufficiently long password'});
    assert.equal(setup.response.status,201);assert.match(setup.response.headers.get('set-cookie'),/work_tracker_session=/);
    const session=await request(env,'/api/session','GET',undefined,setup.response.headers.get('set-cookie'));
    assert.equal(session.response.status,200);assert.equal(session.body.member.email,'first@example.test');
  }finally{env.close();}
});
