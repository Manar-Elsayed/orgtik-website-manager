const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

test('the staff boundary permits versioned CMS image replacement and retains the multipart ceiling elsewhere', {timeout:60000}, async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'orgtik-wm-media-boundary-'));
  Object.assign(process.env, {MOCK_AUTH_FILE:path.join(folder,'accounts.json'),MOCK_AUTH_STORE:'file',MOCK_JOURNAL:'memory',MOCK_SANDBOX:`wm-media-${process.pid}`,MOCK_PUBLIC_URL:'',VERCEL:'',KV_REST_API_URL:'',KV_REST_API_TOKEN:'',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',MOCK_CLOCK:'frozen',MOCK_NOW:'2026-10-14T09:00:00Z'});
  process.argv.push('--only=sos,admin,wm');
  require('../config').dataDir = folder;
  const server = http.createServer(require('../api/index'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const bytes = fs.readFileSync(path.resolve(__dirname,'../../apps/website/landing-directions/public/assets/brand-glass.webp'));
  const form = () => {const body=new FormData();body.set('file',new Blob([bytes],{type:'image/webp'}),'replacement.webp');return body;};
  try {
    const login = await fetch(base+'/sos/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'mona.adel@orgtik.test',password:'Local@2026',mode:'staff',target:'wm'})});
    assert.equal(login.status,200);const session=(await login.json()).data;
    const auth={authorization:`Bearer ${session.tokens.accessToken}`};
    const uploaded=await fetch(base+'/wm/v2/admin/media',{method:'POST',headers:auth,body:form()});assert.equal(uploaded.status,201);
    const media=(await uploaded.json()).data, endpoint=base+`/wm/v2/admin/media/${media.id}/replace`;
    const replaced=await fetch(endpoint,{method:'POST',headers:{...auth,'if-match':String(media.version)},body:form()});
    assert.equal(replaced.status,200,await replaced.clone().text());const result=(await replaced.json()).data;assert.equal(result.id,media.id);assert.equal(result.version,media.version+1);
    const stale=await fetch(endpoint,{method:'POST',headers:{...auth,'if-match':String(media.version)},body:form()});assert.equal(stale.status,412);
    const denied=await fetch(endpoint,{method:'PUT',headers:auth,body:form()});assert.equal(denied.status,501);assert.equal((await denied.json()).code,'packaged_assets_only');
    const reopened=await fetch(base+`/wm/v2/admin/media/${media.id}`,{headers:auth});assert.equal((await reopened.json()).data.file,result.file);
    const history=await fetch(base+`/wm/v2/admin/studio/media/${media.id}`,{headers:auth});assert.equal((await history.json()).data.versions.length,2);
  } finally {
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    const resolved=fs.realpathSync(folder);assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('orgtik-wm-media-boundary-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
