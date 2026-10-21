// Binary content for the local prototype only. Snapshots retain references, never file bytes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(['application/pdf','text/plain','text/csv','text/markdown','application/json','image/png','image/jpeg','image/gif','image/webp','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const enabled = () => process.env.MOCK_PERSISTENCE === 'file' || (process.env.ORGTIK_SERVICES_DEV === '1' && process.env.MOCK_AUTH_STORE === 'file');
const validKey = key => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key);
function folder(realm, workspaceId) { if (!enabled()) throw fail(501,'local_files_only'); return path.resolve(require('../config').dataDir, 'local-assets', hash(JSON.stringify([realm,workspaceId]))); }
function metadata({ realm, workspaceId, key }) {
  if (!validKey(key)) throw fail(410,'file_content_unavailable');
  try { const row = JSON.parse(fs.readFileSync(path.join(folder(realm,workspaceId), key+'.json'),'utf8')); if (row.key!==key||row.realm!==realm||row.workspaceId!==workspaceId||!TYPES.has(row.mimetype)||!Number.isSafeInteger(row.size)||row.size<1||row.size>MAX_BYTES||!validKey(row.sha256)) throw fail(410,'file_content_unavailable'); if (hash(JSON.stringify([realm,workspaceId,row.name,row.mimetype,row.sha256])) !== key) throw fail(410,'file_content_unavailable'); return row; }
  catch(error) { if(error.code==='local_files_only')throw error; throw fail(410,'file_content_unavailable'); }
}
function register({ realm, workspaceId, name, mimetype, bytes }) {
  if (!enabled()) throw fail(501,'local_files_only');
  if(typeof name!=='string'||!name.trim()||name.length>240||/[\x00-\x1f\\/]/.test(name)||!TYPES.has(mimetype)||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_BYTES)throw fail(422,'invalid_local_file');
  const signatures={'image/png':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'image/jpeg':bytes[0]===255&&bytes[1]===216,'image/gif':/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()),'image/webp':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','application/pdf':bytes.subarray(0,5).toString()==='%PDF-'};
  if(Object.hasOwn(signatures,mimetype)&&!signatures[mimetype])throw fail(422,'invalid_local_file');
  name=name.trim();
  const sha256=hash(bytes), key=hash(JSON.stringify([realm,workspaceId,name,mimetype,sha256])), directory=folder(realm,workspaceId);
  fs.mkdirSync(directory,{recursive:true});
  const row={key,realm,workspaceId,name:name.trim(),mimetype,size:bytes.length,sha256};
  if(!fs.existsSync(path.join(directory,key+'.bin')))fs.writeFileSync(path.join(directory,key+'.bin'),bytes,{flag:'wx'});
  fs.writeFileSync(path.join(directory,key+'.json'),JSON.stringify(row));
  return row;
}
function content(args) {
  const row=metadata(args), directory=folder(args.realm,args.workspaceId), file=fs.realpathSync(path.join(directory,row.key+'.bin')), relative=path.relative(fs.realpathSync(directory),file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||fs.statSync(file).size!==row.size||hash(fs.readFileSync(file))!==row.sha256)throw fail(410,'file_content_unavailable');
  return {path:file,mimetype:row.mimetype,size:row.size};
}
module.exports={MAX_BYTES,enabled,validKey,register,metadata,content};
