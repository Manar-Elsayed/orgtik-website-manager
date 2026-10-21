// Uses only an isolated presentation namespace in the already configured store.
// Existing accounts, journals, invoices and the shared clock are never accessed.
function presentationStorage(env=process.env) {
  if(env.MOCK_PERSISTENCE==='supabase') {
    const client=require('./supabase-client').supabaseClient({env});
    const rpc=async(action,payload)=>{const reply=await client.rpc(action,payload);if(reply.status!=='ok')throw Error('Presentation store unavailable.');return reply;};
    return {load:async workspace=>(await rpc('presentation_load',{workspace})).value,save:async(workspace,data)=>{await rpc('presentation_save',{workspace,value:data});}};
  }
  if(env.MOCK_PERSISTENCE==='file') {
    // Self-hosted volume; workspace ids are hashed so they never form a path.
    const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
    const dir=path.join(require('../config').dataDir,'presentation',String(env.MOCK_SANDBOX||'demo').replace(/[^\w-]/g,''));
    const file=workspace=>path.join(dir,`${crypto.createHash('sha256').update(String(workspace)).digest('hex')}.json`);
    return {
      load:async workspace=>{try{return JSON.parse(fs.readFileSync(file(workspace),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw Error('Presentation store unavailable.');}},
      save:async(workspace,data)=>{const target=file(workspace),temp=`${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600});fs.renameSync(temp,target);},
    };
  }
  if(env.MOCK_PERSISTENCE&&env.MOCK_PERSISTENCE!=='redis')throw Error('Presentation store unavailable.');
  const url=env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL,token=env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token)return undefined;
  const key=workspace=>`orgtik:ui-presentation:v1:${env.MOCK_SANDBOX||'demo'}:${workspace}`;
  async function command(args){const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});const value=await response.json();if(!response.ok||value.error)throw Error('Presentation store unavailable.');return value.result;}
  return {load:async workspace=>{const value=await command(['GET',key(workspace)]);return value?JSON.parse(value):null},save:async(workspace,data)=>{await command(['SET',key(workspace),JSON.stringify(data)])}};
}
module.exports={presentationStorage};
