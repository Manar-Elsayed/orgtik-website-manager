const { createHash, randomUUID } = require('node:crypto');

// Give retained, pre-ID lead notes stable identities without replacing their content.
function ensureNotes(record) {
  record.notes ??= [];
  record.notes.forEach((note, index) => {
    note.id ??= 'note_' + createHash('sha256').update(`${record.id}:${note.at}:${index}`).digest('hex').slice(0, 24);
  });
  return record.notes;
}

const validText = text => typeof text === 'string' && text.trim().length > 0 && text.trim().length <= 5000;
function log(record, action, by, at, audit, type, noteId) {
  record.version += 1;
  record.history.unshift({ at, by, action, ...(noteId ? { noteId } : {}) });
  audit.unshift({ at, by, action: `${type}_${action}`, entry: record.id, type, version: record.version, ...(noteId ? { noteId } : {}) });
}

function addNote(record, text, by, at, audit, type) {
  if (!validText(text)) return { status: 422, code: 'invalid', fieldErrors: { text: 'required_or_too_long' } };
  const note = { id: 'note_' + randomUUID(), text: text.trim(), by, at };
  ensureNotes(record).unshift(note);
  log(record, 'note', by, at, audit, type, note.id);
  return { note };
}

function changeNote(record, noteId, action, text, by, at, audit, type) {
  const notes = ensureNotes(record), note = notes.find(row => row.id === noteId);
  if (!note) return { status: 404, code: 'not_found' };
  if (action === 'edit') {
    if (!validText(text)) return { status: 422, code: 'invalid', fieldErrors: { text: 'required_or_too_long' } };
    Object.assign(note, { text: text.trim(), editedAt: at, editedBy: by });
  } else if (action === 'delete') record.notes = notes.filter(row => row.id !== noteId);
  else return { status: 400, code: 'unknown_action' };
  log(record, `note_${action}`, by, at, audit, type, noteId);
  return { note };
}

module.exports = { ensureNotes, addNote, changeNote };
