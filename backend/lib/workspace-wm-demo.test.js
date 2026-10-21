const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');

test('the explicit mock installer uses canonical account/role/intake APIs, preserves existing access, and is repeatable', {timeout:90000}, async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'wm-workflow-demo-'));
  Object.assign(process.env,{MOCK_AUTH_FILE:path.join(folder,'accounts.json'),MOCK_AUTH_STORE:'file',MOCK_JOURNAL:'memory',MOCK_SANDBOX:'wm-workflow-demo-'+process.pid,MOCK_PUBLIC_URL:'',VERCEL:'',KV_REST_API_URL:'',KV_REST_API_TOKEN:'',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',MOCK_CLOCK:'frozen',MOCK_NOW:'2026-10-15T08:00:00Z'});
  process.argv.push('--only=sos,admin,sales,wm');
  const server=http.createServer(require('../api/index'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const {installDemo,validateOrigin,DEMO_LEAD_KEY}=await import('../../tools/services/seed-wm-demo.mjs');
  const requests=[];let loseLeadResponse=true,loseCreateResponse=true,rejectPausedSetup=true;
  const fetcher=async(url,options={})=>{
    const target=url.replace('/wm/api/backend/','/'),route=new URL(target).pathname;
    requests.push({path:route,method:options.method??'GET'});
    const creating=route==='/wm/v2/admin/users'&&options.method==='POST';
    if(creating&&rejectPausedSetup&&JSON.parse(options.body).email==='wm.demo.paused@orgtik.test'){
      rejectPausedSetup=false;
      return new Response(JSON.stringify({error:{code:'temporarily_unavailable'}}),{status:503,headers:{'content-type':'application/json'}});
    }
    const response=await fetch(target,options);
    if(creating&&loseCreateResponse&&response.ok){loseCreateResponse=false;await response.text();throw Error('Simulated lost account creation reply');}
    if(loseLeadResponse&&route==='/wm/v2/public/leads'&&response.ok){loseLeadResponse=false;await response.text();throw Error('Simulated lost fixture reply');}
    return response;
  };
  const json=async(route,token,method='GET',body,version)=>{
    const response=await fetch(origin+route,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{}),...(version?{'if-match':version}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const value=await response.json();assert.ok(response.ok,route+': '+response.status+' '+(value.error?.code??''));return value.data;
  };
  try {
    const session=await json('/sos/api/auth/login',null,'POST',{email:'mona.adel@orgtik.test',password:'Local@2026',mode:'staff',target:'wm'}),token=session.tokens.accessToken;
    await json('/wm/v2/__mock/forms-live',token,'POST',{});
    const identity=require('./identity'),platform=require('../apps/admin'),before=identity.users.map(user=>({id:user.id,email:user.email,active:user.isActive,grants:structuredClone(identity.grants.website_manager[user.key]??null)}));
    const financial=()=>structuredClone(platform.exportState().db.workspaces.map(row=>({id:row.id,lines:row.lines}))),money=financial();
    // Initial access must validate before creating either the account or its membership.
    const invalidAccount={firstName:'Rejected',lastName:'Atomic setup',email:'rejected-setup@wm-demo.example.test',password:'MockAccount2026!',active:false,roles:['unknown-role'],rolePaused:true};
    const membersBefore=structuredClone(platform.getStore().workspace('ws_orgtik').members);
    for(const fields of [{roles:['unknown-role']},{roles:['wm_viewer','wm_viewer']},{roles:['wm_viewer'],active:'inactive'},{roles:['wm_viewer'],rolePaused:'paused'},{roles:[],rolePaused:true}]){
      const response=await fetch(origin+'/wm/v2/admin/users',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({...invalidAccount,...fields})});
      assert.ok(response.status===422||response.status===409);
      assert.ok(!identity.users.some(user=>user.email===invalidAccount.email),'invalid initial access cannot create an account');
      assert.deepEqual(platform.getStore().workspace('ws_orgtik').members,membersBefore,'invalid initial access cannot create membership');
    }
    const options={origin,password:'Local@2026',accountPassword:'MockAccount2026!',fetcher};
    await assert.rejects(installDemo(options),/temporarily_unavailable/);
    const interrupted=await json('/wm/v2/admin/users?pageSize=100',token),retained=interrupted.find(user=>user.email==='wm.demo.editor@orgtik.test');
    assert.match(retained.roles[0],/^wm_custom_/,'a lost create reply must retain the fully configured account');
    assert.equal(retained.active,true);assert.equal(retained.rolePaused,false);
    assert.ok(!interrupted.some(user=>user.email==='wm.demo.paused@orgtik.test'),'a precommit setup failure cannot leave a partial account');
    const retainedVersion=retained.version;
    const first=await installDemo(options);
    assert.equal(first.createdRoles.length,0);assert.equal(first.createdUsers.length,2);assert.equal(first.preservedUsers.length,1);
    assert.equal((await json('/wm/v2/admin/users?pageSize=100',token)).find(user=>user.id===retained.id).version,retainedVersion,'retry cannot rewrite the recovered account');
    assert.ok(!requests.some(row=>row.method==='PATCH'&&row.path.startsWith('/wm/v2/admin/users/')),'initial account access uses one atomic creation request');
    assert.match(first.lead.crmPath,/^\/customers\/[\w-]+$/);assert.equal(first.lead.workspaceId,'ws_orgtik');
    for(const original of before){const user=identity.findUser(original.id);assert.deepEqual({id:user.id,email:user.email,active:user.isActive,grants:identity.grants.website_manager[user.key]??null},original);}
    assert.deepEqual(financial(),money);
    const users=await json('/wm/v2/admin/users?pageSize=100',token);
    assert.equal(users.find(user=>user.email==='wm.demo.paused@orgtik.test').rolePaused,true);
    assert.equal(users.find(user=>user.email==='wm.demo.inactive@orgtik.test').active,false);
    const active=users.find(user=>user.email==='wm.demo.editor@orgtik.test');assert.match(active.roles[0],/^wm_custom_/);
    for(const email of ['wm.demo.paused@orgtik.test','wm.demo.inactive@orgtik.test']){
      const response=await fetch(origin+'/sos/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'MockAccount2026!',mode:'staff',target:'wm'})});assert.ok(response.status===401||response.status===403);
    }
    const activeSession=await json('/sos/api/auth/login',null,'POST',{email:active.email,password:'MockAccount2026!',mode:'staff',target:'wm'});assert.ok(activeSession.staffAccess.roles.wm.includes(active.roles[0]));
    const paused=users.find(user=>user.email==='wm.demo.paused@orgtik.test');await json('/wm/v2/admin/users/'+paused.id,token,'PATCH',{rolePaused:false},paused.version);
    const resumed=await json('/sos/api/auth/login',null,'POST',{email:paused.email,password:'MockAccount2026!',mode:'staff',target:'wm'});assert.ok(resumed.staffAccess.roles.wm.includes('wm_viewer'));
    const leads=await json('/wm/v2/admin/leads?pageSize=100',token),lead=leads.find(lead=>lead.context?.mockFixture===DEMO_LEAD_KEY);
    assert.equal(lead.handoff.state,'sent');assert.equal(first.lead.crmPath,'/customers/'+lead.handoff.leadId);
    await json('/wm/v2/admin/users/'+active.id,token,'PATCH',{firstName:'Edited demo name'},active.version);
    requests.length=0;const repeat=await installDemo(options);
    assert.deepEqual(repeat.createdRoles,[]);assert.deepEqual(repeat.createdUsers,[]);assert.equal(repeat.preservedUsers.length,3);assert.deepEqual(repeat.lead,first.lead);
    const current=await json('/wm/v2/admin/users?pageSize=100',token);assert.equal(current.find(user=>user.id===active.id).firstName,'Edited demo name');assert.equal(current.find(user=>user.id===paused.id).rolePaused,false);
    assert.ok(!requests.some(row=>row.method!=='GET'&&!row.path.startsWith('/sos/api/auth/')),'repeat must not write business data');
    assert.ok(requests.every(row=>!row.path.includes('reset')));
    requests.length=0;
    const legacyRuntimeFetcher=async(url,options)=>{
      const response=await fetcher(url,options);
      if(new URL(url).pathname.endsWith('/admin/me')){const body=await response.json();delete body.data.identity.atomicAccountSetup;return new Response(JSON.stringify(body),{status:response.status,headers:{'content-type':'application/json'}});}
      return response;
    };
    await assert.rejects(installDemo({...options,fetcher:legacyRuntimeFetcher}),/Update the mock runtime/);
    assert.ok(!requests.some(row=>row.method!=='GET'&&!row.path.startsWith('/sos/api/auth/')),'an older runtime cannot receive unsupported initial account fields');
    requests.length=0;
    const previewFetcher=async(url,options)=>{
      const response=await fetcher(url,options),route=new URL(url).pathname;
      if(route.endsWith('/admin/leads')||route.endsWith('/public/site')){
        const body=await response.json();if(route.endsWith('/admin/leads'))body.data=body.data.filter(lead=>lead.context?.mockFixture!==DEMO_LEAD_KEY);else body.data.forms.mode='preview';
        return new Response(JSON.stringify(body),{status:response.status,headers:{'content-type':'application/json'}});
      }
      return response;
    };
    await assert.rejects(installDemo({...options,fetcher:previewFetcher}),/forms are not ready/);
    assert.ok(!requests.some(row=>row.method!=='GET'&&!row.path.startsWith('/sos/api/auth/')),'paused forms must not trigger fixture writes or be enabled');
    requests.length=0;
    const conflictingRoleFetcher=async(url,options)=>{
      const response=await fetcher(url,options);if(new URL(url).pathname.endsWith('/admin/roles')){const body=await response.json();body.data.find(role=>role.label==='Mock content editor').permissions.push('users:manage');return new Response(JSON.stringify(body),{status:response.status,headers:{'content-type':'application/json'}});}return response;
    };
    await assert.rejects(installDemo({...options,fetcher:conflictingRoleFetcher}),/different permissions/);
    assert.ok(!requests.some(row=>row.method!=='GET'&&!row.path.startsWith('/sos/api/auth/')),'an edited role must not be overwritten or assigned');
    let called=false;await assert.rejects(installDemo({...options,origin:'https://customer.example',fetcher:()=>{called=true;throw Error('must not be called');}}),/restricted/);assert.equal(called,false);
    assert.equal(validateOrigin('https://orgtik-suite-services.vercel.app',true),'https://orgtik-suite-services.vercel.app');
    for(const url of ['https://orgtik-suite-services.vercel.app','http://localhost:3400/path','http://user:pass@localhost:3400','http://localhost:3400?token=x'])assert.throws(()=>validateOrigin(url,false));
  } finally {
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    const resolved=fs.realpathSync(folder),parent=fs.realpathSync(os.tmpdir())+path.sep;assert.ok(resolved.startsWith(parent)&&path.basename(resolved).startsWith('wm-workflow-demo-'));fs.rmSync(resolved,{recursive:true,force:true});
  }
});
