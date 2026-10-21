const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
test('local roadmap preserves role, workspace, validation and pinned-file contracts', { timeout: 90000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orgtik-roadmap-'));
  Object.assign(process.env, { MOCK_AUTH_FILE:path.join(directory,'accounts.json'), MOCK_AUTH_STORE:'file', MOCK_JOURNAL:'memory', MOCK_SANDBOX:`roadmap-${process.pid}`, MOCK_CLOCK:'frozen', MOCK_NOW:'2026-10-07T09:00:00Z', ORGTIK_SERVICES_DEV:'1', VERCEL:'', MOCK_PUBLIC_URL:'', KV_REST_API_URL:'', KV_REST_API_TOKEN:'', UPSTASH_REDIS_REST_URL:'', UPSTASH_REDIS_REST_TOKEN:'' });
  require('../config').dataDir=directory;
  process.argv.push('--only=sos,admin,tasks,files,hr,sales,marketing,chats,wm');
  const server=http.createServer(require('../api/index'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(app, route, token, method='GET', body, headers={}) {
    const response=await fetch(base+'/'+app+route,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:Buffer.isBuffer(body)?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const raw=await response.json();return {status:response.status,data:raw.data??raw,raw};
  }
  const good=row=>{assert.ok(row.status<300,JSON.stringify(row.raw));return row.data;};
  try {
    const mona=good(await call('sos','/api/auth/login',null,'POST',{email:'mona.adel@orgtik.test',password:'Local@2026'}));
    const token=mona.tokens.accessToken;
    const select=async app=>good(await call('sos','/api/auth/workspace',token,'POST',{workspaceId:'ws_orgtik',target:app})).tokens.accessToken;
    const filesToken=await select('files'), hrToken=await select('hr'), crmToken=await select('sales');
    const approvals=good(await call('sos','/api/suite/approvals',token));assert.ok(Array.isArray(approvals));assert.ok(approvals.every(row=>row.tool&&row.path?.startsWith('/')));
    assert.equal((await call('sos','/api/suite/account/workspace',token,'PATCH',{name:'Invalid zone',defaultLanguage:'en',timeZone:'invalid',logo:null})).status,422);
    const branding=good(await call('sos','/api/suite/account/workspace',token,'PATCH',{name:'Roadmap workspace',defaultLanguage:'ar',timeZone:'Europe/Zurich',logo:null}));assert.equal(branding.defaultLanguage,'ar');assert.equal(branding.timeZone,'Europe/Zurich');
    const field=good(await call('hr','/api/hr/custom-fields',hrToken));assert.ok(field.employees.length);
    good(await call('hr','/api/hr/custom-fields',hrToken,'PUT',{definitions:[{id:'skill',name:'Specialty',type:'select',options:['Design','Engineering']},{id:'start',name:'Certification date',type:'date'}]}));
    const employee=field.employees[0];
    assert.equal((await call('hr',`/api/hr/employees/${employee.id}/custom-fields`,hrToken,'PATCH',{values:{skill:'Unknown'}})).status,400);
    assert.equal((await call('hr',`/api/hr/employees/${employee.id}/custom-fields`,hrToken,'PATCH',{values:{start:'2026-02-31'}})).status,400);
    good(await call('hr',`/api/hr/employees/${employee.id}/custom-fields`,hrToken,'PATCH',{values:{skill:'Design',start:'2026-02-28'}}));
    const fieldsAfter=good(await call('hr','/api/hr/custom-fields',hrToken));assert.equal(fieldsAfter.employees.find(row=>row.id===employee.id).values.skill,'Design');
    const bytes=Buffer.from('Local prototype file\n=literal text');
    const headers={'content-type':'application/vnd.orgtik.local-upload','x-file-name':'roadmap.txt','x-file-type':'text/plain','idempotency-key':'roadmap-local-upload'};
    assert.equal((await call('files','/api/v1/files/local-upload',filesToken,'POST',bytes,{...headers,'idempotency-key':''})).status,422);
    const file=good(await call('files','/api/v1/files/local-upload',filesToken,'POST',bytes,headers));
    const repeat=good(await call('files','/api/v1/files/local-upload',filesToken,'POST',bytes,headers));assert.equal(repeat.fileId,file.fileId);
    const response=await fetch(`${base}/files/api/v1/files/${file.fileId}/versions/${file.versionId}/download`,{headers:{authorization:'Bearer '+filesToken}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
    const other=good(await call('sos','/api/auth/register',null,'POST',{email:'other@roadmap.test',name:'Other owner',password:'StrongFixture!'}));
    assert.equal((await call('sos',`/api/suite/files/${file.fileId}/versions/${file.versionId}/content`,other.tokens.accessToken)).status,403);
    assert.equal((await call('sos','/api/suite/crm/recipes',token,'PUT',{recipes:[{id:'invalid',title:'Invalid target',enabled:true,pipelineId:'none',stageId:'none',projectId:1,sectionId:1}]})).status,422);
    const recipes=good(await call('sales','/api/suite/crm/recipes',crmToken));assert.ok(recipes.canConfigure);assert.deepEqual(recipes.recipes,[]);
    const crm=good(await call('sales','/api/crm/v3',crmToken));
    const targets=good(await call('sos','/api/suite/tasks/projects?source=crm',token));
    const contact=crm.contacts[0],pipeline=crm.pipelines.find(row=>row.id===contact.pipelineId),stage=pipeline.stages.find(row=>row.id!==contact.stageId&&row.status==='contacted');
    const destination=targets.find(row=>row.sections.some(section=>section.flag==='todo')),section=destination.sections.find(row=>row.flag==='todo');
    good(await call('sos','/api/suite/crm/recipes',token,'PUT',{recipes:[{id:'review-contact',title:'Review changed deal',enabled:true,pipelineId:pipeline.id,stageId:stage.id,projectId:destination.id,sectionId:section.id}]}));
    good(await call('sales',`/api/crm/v3/contacts/${contact.id}`,crmToken,'PATCH',{stageId:stage.id}));
    const delivered=good(await call('sos','/api/suite/crm/recipes/run',token,'POST',{}));assert.equal(delivered.runs[0].state,'created');assert.ok(delivered.runs[0].taskId);
    const again=good(await call('sos','/api/suite/crm/recipes/run',token,'POST',{}));assert.equal(again.runs.length,1);assert.equal(again.runs[0].taskId,delivered.runs[0].taskId);
  } finally { await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}); }
});
