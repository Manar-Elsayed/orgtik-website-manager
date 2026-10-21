const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assets = path.resolve(__dirname, '../../website-assets');
const fail = (status, code) => Object.assign(new Error(code), {status, code});
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Read dimensions from the actual image header, rather than trusting upload metadata.
function imageInfo(bytes, mime) {
  let width, height, ext;
  if (mime === 'image/png' && bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && bytes.toString('ascii', 12, 16) === 'IHDR') {
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); ext = 'png';
  } else if (mime === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') { width = 1 + bytes.readUIntLE(24, 3); height = 1 + bytes.readUIntLE(27, 3); }
    else if (kind === 'VP8 ' && bytes.subarray(23, 26).equals(Buffer.from('9d012a', 'hex'))) { width = bytes.readUInt16LE(26) & 0x3fff; height = bytes.readUInt16LE(28) & 0x3fff; }
    else if (kind === 'VP8L' && bytes[20] === 0x2f) { width = 1 + (bytes.readUInt32LE(21) & 0x3fff); height = 1 + ((bytes.readUInt32LE(21) >>> 14) & 0x3fff); }
    ext = 'webp';
  } else if (mime === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd8) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5); ext = 'jpg'; break;
      }
      offset += length;
    }
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 100000000) throw fail(422, 'invalid_image');
  return {width, height, ext};
}

async function replaceImage({lib, state, store, uploadsDir, imageStore, now, who, key, file, version}) {
  const m = lib.media.get(key);
  if (!m) throw fail(404, 'not_found');
  if (!Number.isSafeInteger(version) || version !== m.version) throw fail(412, 'stale');
  if (m.kind !== 'image') throw fail(422, 'image_required');
  if (!file?.buffer?.length || file.buffer.length > 15 * 1024 * 1024) throw fail(422, 'invalid_image');
  const info = imageInfo(file.buffer, file.mimetype);
  imageStore ||= require('./image-storage').imageStorage({uploadsDir});
  const history = state.mediaVersions[key] || [];
  let previous;
  if (!history.some(row => row.file === m.file)) {
    // Deployed functions contain the bounded seed originals beside this module.
    const packaged = path.join(__dirname, 'assets');
    const root = m.source === 'upload' ? uploadsDir : fs.existsSync(packaged) ? packaged : assets;
    const original = path.resolve(root, m.file);
    if (!original.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(original)) throw fail(503, 'media_content_unavailable');
    const bytes = fs.readFileSync(original), digest = hash(bytes);
    const ext = path.extname(m.file).slice(1).toLowerCase();
    const name = `${m.id}-v${m.version}-original-${digest.slice(0, 16)}.${ext}`;
    previous = {version:m.version, file:name, bytes:bytes.length, hash:digest, at:now(), by:m.updatedBy || m.addedBy || 'seed', mimeType:ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`};
    await imageStore.write(name, bytes);
  }
  const digest = hash(file.buffer), nextVersion = m.version + 1;
  const stem = path.basename(file.originalname || 'image').replace(/\.[^.]*$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
  const name = `${m.id}-v${nextVersion}-${stem}-${digest.slice(0, 16)}.${info.ext}`;
  await imageStore.write(name, file.buffer);
  if (version !== m.version) throw fail(412, 'stale');
  const oldFile = m.file;
  Object.assign(m, {file:name, bytes:file.buffer.length, width:info.width, height:info.height, ext:info.ext, source:'upload', version:nextVersion, updatedAt:now(), updatedBy:who.user.key, retainedFiles:[...new Set([...(m.retainedFiles || []), oldFile])]});
  state.mediaVersions[key] = [...history, ...(previous ? [previous] : []), {version:nextVersion, file:name, bytes:m.bytes, hash:digest, at:now(), by:who.user.key, mimeType:file.mimetype}];
  store.audit.unshift({at:now(), by:who.user.key, action:'media_replaced', entry:key, type:'media'});
  return m;
}
module.exports = {imageInfo, replaceImage};
