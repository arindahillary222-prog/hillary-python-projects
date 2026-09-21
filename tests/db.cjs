const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');const path=require('node:path');
const OWNER={id:'site-owner-123',email:'arindahillary222@gmail.com'};
const ALICE={id:'site-alice-123',email:'alice@example.test'};
const BOB={id:'site-bob-123',email:'bob@example.test'};
function database(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
  for(const filename of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle',filename),'utf8'));
  const statement=(query,args=[])=>({
    bind(...values){return statement(query,values);},
    async first(){return sql.prepare(query).get(...args)||null;},
    async all(){return {results:sql.prepare(query).all(...args)};},
    async run(){const result=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(result.changes)}};}
  });
  const DB={prepare:query=>statement(query),async batch(statements){sql.exec('BEGIN');try{const result=[];for(const item of statements)result.push(await item.run());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  return {DB,SITES_AUTH_TRUSTED:'true',close:()=>sql.close()};
}
async function call(db,identity,path,method='GET',data,origin='https://tracker.example'){
  const {handleApi}=await import('../server/api.js');
  const headers={'Content-Type':'application/json',Origin:origin};
  if(identity){headers['oai-authenticated-user-id']=identity.id;headers['oai-authenticated-user-email']=identity.email;}
  const response=await handleApi(new Request('https://tracker.example'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),db);
  return {status:response.status,body:await response.json()};
}
async function team(db){await call(db,OWNER,'/api/session');for(const person of [ALICE,BOB]){const result=await call(db,OWNER,'/api/members','POST',{name:person===ALICE?'Alice':'Bob',email:person.email,role:'employee'});if(result.status!==201)throw new Error(JSON.stringify(result));}return (await call(db,OWNER,'/api/members')).body.members;}
module.exports={database,call,team,OWNER,ALICE,BOB};
