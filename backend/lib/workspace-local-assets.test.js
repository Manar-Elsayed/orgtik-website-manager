const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const { execFileSync }=require('node:child_process');
test('local binary assets survive process restart, remain workspace scoped and reject tampering',()=>{
  process.env.ORGTIK_SERVICES_DEV='1';process.env.MOCK_AUTH_STORE='file';
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'orgtik-local-assets-'));require('../config').dataDir=directory;
  const assets=require('./local-file-assets');const args={realm:'fixture',workspaceId:'workspace',name:'notes.txt',mimetype:'text/plain',bytes:Buffer.from('منـى\nLocal prototype')};
  const row=assets.register(args);assert.equal(assets.register(args).key,row.key);
  assert.throws(()=>assets.metadata({realm:'fixture',workspaceId:'other',key:row.key}),{code:'file_content_unavailable'});
  assert.throws(()=>assets.register({...args,name:'../escape.txt'}),{code:'invalid_local_file'});
  assert.throws(()=>assets.register({...args,mimetype:'image/png'}),{code:'invalid_local_file'});
  assert.throws(()=>assets.register({...args,mimetype:'text/html'}),{code:'invalid_local_file'});
  const script=`require('./mock/config').dataDir=process.argv[1];const a=require('./mock/lib/local-file-assets');process.stdout.write(require('node:fs').readFileSync(a.content({realm:'fixture',workspaceId:'workspace',key:process.argv[2]}).path));`;
  const recovered=execFileSync(process.execPath,['-e',script,directory,row.key],{cwd:path.resolve(__dirname,'../..'),env:process.env,windowsHide:true});assert.deepEqual(recovered,args.bytes);
  const file=assets.content({realm:'fixture',workspaceId:'workspace',key:row.key}).path;fs.writeFileSync(file,'Changed');assert.throws(()=>assets.content({realm:'fixture',workspaceId:'workspace',key:row.key}),{code:'file_content_unavailable'});
  assert.ok(fs.realpathSync(directory).startsWith(fs.realpathSync(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('orgtik-local-assets-'));fs.rmSync(directory,{recursive:true,force:true});
});
