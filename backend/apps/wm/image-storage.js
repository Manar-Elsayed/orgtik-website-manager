// Image bytes live outside the business journal's bounded JSON checkpoint. In
// hosted previews, use durable realm-scoped storage so cold starts retain them.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CHUNK = 128 * 1024;
const MAX_BYTES = 15 * 1024 * 1024;
const BUCKET = 'orgtik-media';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const unavailable = () => Object.assign(new Error('media_content_unavailable'), {status:503, code:'media_content_unavailable'});

function supabaseConfig(env, realm) {
  try {
    const url = new URL(env.SUPABASE_URL);
    const credential = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        !/^[\w-]{1,100}$/.test(realm) || typeof credential !== 'string' || /\s/.test(credential)) return null;
    if (!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(credential)) {
      const parts = credential.split('.');
      if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part)) || JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role !== 'service_role') return null;
    }
    return {url:url.origin, credential};
  } catch { return null; }
}

function imageStorage({uploadsDir, realm = process.env.MOCK_SANDBOX || 'demo', hosted = false, env = process.env, fetcher = (...args) => fetch(...args)}) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const credential = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  const supabase = env.MOCK_PERSISTENCE === 'supabase';
  // Self-hosted volumes keep uploads under MOCK_DATA_DIR, which already survives restarts.
  const local = env.MOCK_PERSISTENCE === 'file';
  const storage = supabase ? supabaseConfig(env, realm) : null;
  const durable = supabase ? Boolean(storage) : Boolean(url && credential);
  const prefix = `orgtik:wm-images:${realm}:`;
  async function command(args) {
    if (!durable) throw unavailable();
    try {
      const response = await fetcher(url.replace(/\/$/, ''), {method:'POST', headers:{authorization:`Bearer ${credential}`, 'content-type':'application/json'}, body:JSON.stringify(args), signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw unavailable();
      const body = await response.json();
      if (body.error) throw unavailable();
      return body.result;
    } catch { throw unavailable(); }
  }
  async function objectRequest(digest, method = 'GET', body) {
    if (!storage) throw unavailable();
    try {
      const object = `${encodeURIComponent(realm)}/${digest}`;
      const route = method === 'GET' ? 'object/authenticated' : 'object';
      return await fetcher(`${storage.url}/storage/v1/${route}/${BUCKET}/${object}`, {
        method,
        headers:{apikey:storage.credential, ...(!storage.credential.startsWith('sb_secret_') ? {authorization:`Bearer ${storage.credential}`} : {}), ...(body ? {'content-type':'application/octet-stream', 'x-upsert':'false'} : {})},
        ...(body ? {body} : {}),
        redirect:'error',
        signal:AbortSignal.timeout(15000),
      });
    } catch { throw unavailable(); }
  }
  async function readObject(digest, length) {
    try {
      const response = await objectRequest(digest);
      if (!response.ok || Number(response.headers.get('content-length') || 0) > length || !response.body) {
        await response.body?.cancel?.();
        throw unavailable();
      }
      // Bound untrusted response bytes before buffering, even without Content-Length.
      const reader = response.body.getReader(), parts = [];
      let size = 0;
      try {
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > length) { await reader.cancel(); throw unavailable(); }
          parts.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const bytes = Buffer.concat(parts, size);
      if (bytes.length !== length || hash(bytes) !== digest) throw unavailable();
      return bytes;
    } catch { throw unavailable(); }
  }
  async function writeObject(bytes) {
    try {
      const digest = hash(bytes), response = await objectRequest(digest, 'POST', bytes);
      await response.body?.cancel?.();
      if (response.ok) return;
      // Storage reports existing objects as 409, or 400 on older deployments.
      // Never overwrite: identical bytes must already exist before treating it as saved.
      if (response.status === 400 || response.status === 409) {
        await readObject(digest, bytes.length);
        return;
      }
      throw unavailable();
    } catch { throw unavailable(); }
  }
  async function batches(count, action) {
    const result = [];
    for (let i = 0; i < count; i += 4) result.push(...await Promise.all(Array.from({length:Math.min(4, count-i)}, (_, n) => action(i+n))));
    return result;
  }
  function filename(file) {
    if (!/^md_\d+-[\w.-]+$/.test(file)) throw unavailable();
    return path.join(uploadsDir, file);
  }
  return {
    async write(file, bytes) {
      const target = filename(file);
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES) throw unavailable();
      if ((hosted || supabase) && !durable && !local) throw unavailable();
      if (supabase) await writeObject(bytes);
      else if (durable) {
        const digest = hash(bytes);
        const saved = await batches(Math.ceil(bytes.length/CHUNK), i => command(['SET', `${prefix}${digest}:${i}`, bytes.subarray(i*CHUNK, (i+1)*CHUNK).toString('base64')]));
        if (saved.some(result => result !== 'OK')) throw unavailable();
      }
      fs.mkdirSync(uploadsDir, {recursive:true});
      fs.writeFileSync(target, bytes);
    },
    async read(row) {
      const target = filename(row.file);
      if (!/^[a-f0-9]{64}$/.test(row.hash) || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > MAX_BYTES || supabase && !durable) throw unavailable();
      if (fs.existsSync(target)) {
        const bytes = fs.readFileSync(target);
        if (bytes.length === row.bytes && hash(bytes) === row.hash) return bytes;
      }
      if (supabase) return readObject(row.hash, row.bytes);
      const parts = await batches(Math.ceil(row.bytes/CHUNK), i => command(['GET', `${prefix}${row.hash}:${i}`]));
      if (parts.some(part => typeof part !== 'string')) throw unavailable();
      const bytes = Buffer.concat(parts.map(part => Buffer.from(part, 'base64')));
      if (bytes.length !== row.bytes || hash(bytes) !== row.hash) throw unavailable();
      return bytes;
    },
  };
}
module.exports = {imageStorage};
