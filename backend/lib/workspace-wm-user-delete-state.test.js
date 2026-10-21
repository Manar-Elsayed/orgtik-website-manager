// Only isolated local account/journal fixtures; no saved suite accounts are deleted.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawn} = require('node:child_process');

async function child(phase) {
  const journal=require('./journal'),backend=journal.fileStore(process.env.WM_USER_DELETE_JOURNAL),commit=backend.commit.bind(backend);
  let rejectDelete=false;
  backend.commit=async(entry,expected)=>{
    if(rejectDelete&&entry.method==='DELETE'&&(entry.app==='wm'&&entry.url.startsWith('/v2/admin/users/')||entry.app==='sos'&&entry.url.startsWith('/api/users/')))throw Object.assign(new Error('Isolated account deletion commit outage'),{status:503});
    return commit(entry,expected);
  };
  journal.pickStore=()=>({sandbox:'wm-account-delete-state',store:backend});
  const http=require('node:http'),server=http.createServer(require('../api/index'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port,password='PrivateFixture2026!';
  const call=async(route,token,method='GET',body,version)=>{
    const response=await fetch(origin+route,{method,headers:{connection:'close',...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{}),...(version?{'if-match':version}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const text=await response.text();return{status:response.status,body:text?JSON.parse(text):null};
  };
  const good=response=>{assert.ok(response.status<300,JSON.stringify(response.body));return response.body?.data;};
  const login=(email,secret=password,target)=>call('/sos/api/auth/login',null,'POST',{email,password:secret,...(target?{mode:'staff',target}:{})});
  const users='/wm/v2/admin/users',identity=()=>require('./identity'),S=()=>require('../apps/admin').getStore();
  const financial=()=>JSON.stringify({invoices:S().db.invoices,workspaces:S().db.workspaces.map(row=>({id:row.id,state:row.state,lines:row.lines}))});
  try {
    const wm=good(await login('mona.adel@orgtik.test','Local@2026','wm')),central=good(await login('mona.adel@orgtik.test','Local@2026','admin'));
    const list=async()=>good(await call(users+'?pageSize=100',wm.tokens.accessToken));
    const directory=async()=>good(await call('/sos/api/users?limit=100',central.tokens.accessToken));
    if(phase==='write') {
      const target=good(await call(users,wm.tokens.accessToken,'POST',{firstName:'Retained',lastName:'WM deletion',email:'wm-delete-state@fixture.test',password,roles:['wm_viewer']}));
      const legacy=good(await call(users,wm.tokens.accessToken,'POST',{firstName:'Retained',lastName:'SOS deletion',email:'sos-delete-state@fixture.test',password,roles:['wm_viewer']}));
      const staff=good(await login(target.email,password,'wm')),workspace=good(await login(target.email));
      const legacyStaff=good(await login(legacy.email,password,'wm'));
      const cleanupCalls=[];
      const spyCleanup=()=>{const sos=require('../apps/sos'),cleanup=sos.cleanupDeletedUser;assert.equal(typeof cleanup,'function');sos.cleanupDeletedUser=id=>{cleanupCalls.push(id);cleanup(id);};};
      spyCleanup();
      const before=JSON.stringify({person:identity().findUser(target.id),grants:identity().grants,platform:S().exportState?.()??S().db});
      rejectDelete=true;
      assert.equal((await call(users+'/'+target.id,wm.tokens.accessToken,'DELETE',undefined,target.version)).status,503);
      assert.deepEqual(cleanupCalls,[],'a failed domain commit cannot disconnect the still-active account');
      rejectDelete=false;
      assert.ok((await list()).some(row=>row.id===target.id));assert.ok((await directory()).some(row=>row.id===target.id));
      assert.equal(JSON.stringify({person:identity().findUser(target.id),grants:identity().grants,platform:S().exportState?.()??S().db}),before,'a failed commit restores account, scopes, memberships and all platform data');
      assert.equal((await call('/wm/v2/admin/me',staff.tokens.accessToken)).status,200);
      const refreshed=good(await call('/sos/api/auth/refresh',null,'POST',{refreshToken:staff.tokens.refreshToken}));
      assert.equal(typeof refreshed.accessToken,'string');
      spyCleanup(); // Failed-commit recovery rebuilds the module graph.
      const money=financial();
      assert.equal((await call(users+'/'+target.id,wm.tokens.accessToken,'DELETE',undefined,target.version)).status,204);
      assert.deepEqual(cleanupCalls,[target.id],'only the committed deletion disconnects live SOS sockets');
      const beforeSos=JSON.stringify({person:identity().findUser(legacy.id),grants:identity().grants,platform:S().db});
      rejectDelete=true;
      assert.equal((await call('/sos/api/users/'+legacy.id,central.tokens.accessToken,'DELETE')).status,503);
      rejectDelete=false;
      assert.deepEqual(cleanupCalls,[target.id],'failed SOS deletion must not clean live CMS membership or sockets');
      assert.ok((await list()).some(row=>row.id===legacy.id));assert.ok((await directory()).some(row=>row.id===legacy.id));
      assert.equal(JSON.stringify({person:identity().findUser(legacy.id),grants:identity().grants,platform:S().db}),beforeSos);
      assert.equal((await call('/wm/v2/admin/me',legacyStaff.tokens.accessToken)).status,200);
      spyCleanup();
      assert.equal((await call('/sos/api/users/'+legacy.id,central.tokens.accessToken,'DELETE')).status,200,'the SOS central directory uses the same canonical soft deletion');
      assert.deepEqual(cleanupCalls,[target.id,legacy.id]);
      assert.equal(financial(),money);
      assert.ok(!(await list()).some(row=>[target.id,legacy.id].includes(row.id)));assert.ok(!(await directory()).some(row=>[target.id,legacy.id].includes(row.id)));
      fs.writeFileSync(process.env.WM_USER_DELETE_FACTS,JSON.stringify({target,legacy,staff:{tokens:refreshed},workspace,money}));
    } else {
      const facts=JSON.parse(fs.readFileSync(process.env.WM_USER_DELETE_FACTS,'utf8'));
      assert.ok(!(await list()).some(row=>[facts.target.id,facts.legacy.id].includes(row.id)));assert.ok(!(await directory()).some(row=>[facts.target.id,facts.legacy.id].includes(row.id)));
      for(const account of [facts.target,facts.legacy]){
        const person=identity().findUser(account.id);assert.ok(person.deletedAt);assert.equal(person.isActive,false);assert.equal(person.firstName,'Retained');assert.equal(person.authVersion,1);
        assert.ok(Object.values(identity().grants).every(scope=>!scope[account.key]));
        assert.ok(S().db.workspaces.flatMap(row=>row.members).filter(member=>member.userKey===account.key).every(member=>member.status==='removed'&&Object.values(member.toolGrants||{}).every(grant=>!grant.assigned)));
        assert.equal((await login(account.email,password,'wm')).status,401);
      }
      assert.equal(financial(),facts.money);
      assert.equal((await call('/wm/v2/admin/me',facts.staff.tokens.accessToken)).status,401);
      assert.equal((await call('/sos/api/auth/me',facts.workspace.tokens.accessToken)).status,401);
      assert.equal((await call('/sos/api/auth/refresh',null,'POST',{refreshToken:facts.staff.tokens.refreshToken})).status,401);
      assert.equal((await call('/sos/api/auth/refresh',null,'POST',{refreshToken:facts.workspace.tokens.refreshToken})).status,401);
    }
  } finally {await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}

if(process.env.WM_USER_DELETE_PHASE) child(process.env.WM_USER_DELETE_PHASE).catch(error=>{console.error(error.stack);process.exitCode=1;});
else require('node:test').test('WM account deletion rolls back failed commits and persists canonical WM/SOS soft deletion across restart',{timeout:90000},async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'wm-account-delete-state-'));
  const env={...process.env,MOCK_AUTH_FILE:path.join(folder,'accounts.json'),MOCK_AUTH_STORE:'file',MOCK_SANDBOX:'wm-account-delete-state',MOCK_PUBLIC_URL:'',VERCEL:'',KV_REST_API_URL:'',KV_REST_API_TOKEN:'',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',MOCK_CLOCK:'frozen',MOCK_NOW:'2026-10-15T10:00:00Z',WM_USER_DELETE_JOURNAL:path.join(folder,'journal.json'),WM_USER_DELETE_FACTS:path.join(folder,'facts.json')};
  const run=phase=>new Promise((resolve,reject)=>{
    const process_=spawn(process.execPath,[__filename,'--only=sos,admin,wm'],{env:{...env,WM_USER_DELETE_PHASE:phase},stdio:['ignore','pipe','pipe']});
    let output='';process_.stdout.on('data',chunk=>{output+=chunk;});process_.stderr.on('data',chunk=>{output+=chunk;});process_.on('error',reject);process_.on('exit',code=>code===0?resolve():reject(new Error('Account deletion '+phase+' failed\n'+output.slice(-9000))));
  });
  try {await run('write');await run('restart');}
  finally {const resolved=fs.realpathSync(folder),parent=fs.realpathSync(os.tmpdir())+path.sep;assert.ok(resolved.startsWith(parent)&&path.basename(resolved).startsWith('wm-account-delete-state-'));fs.rmSync(resolved,{recursive:true,force:true});}
});
