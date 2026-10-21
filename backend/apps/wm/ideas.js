const { mask, maskEmail } = require('./ops');
const codec = require('./state-codec');
const { createHash, randomUUID } = require('node:crypto');

const VISIBLE = new Set(['open', 'planned', 'in_progress', 'shipped']);
const digest = value => createHash('sha256').update(value).digest('hex');
const approvedComments = idea => (idea.discussion ?? []).filter(comment => comment.status === 'approved');
const commentCount = idea => (idea.comments ?? 0) + approvedComments(idea).length;
const { IDEA_CATEGORIES, ideaCategory, ideaTags, classificationErrors, cleanTags, publicTheme } = require('./idea-classification');

function publicIdea(idea) {
  const { id, order, status, theme, title, body, votes, commentPreview, link } = idea;
  return { id, order, status, theme: publicTheme(idea), category: ideaCategory(idea), tags: ideaTags(idea), title, body, votes, sample: idea.sample === true, comments: commentCount(idea),
    ...(commentPreview ? { commentPreview } : {}), ...(link ? { link } : {}),
    discussion: approvedComments(idea).map(({ id, author, body, submittedAt }) => ({ id, author, body, submittedAt })),
  };
}

function submissionErrors(body, comment = false) {
  const errors = {};
  for (const [key, max] of Object.entries({ name: 100, email: 254, message: 5000, ...(!comment ? { topic: 100 } : {}) })) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) errors[key] = 'invalid';
  }
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) errors.email = 'email';
  if (body.consent !== true) errors.consent = 'required';
  if (!comment && 'category' in body && !IDEA_CATEGORIES.includes(body.category)) errors.category = 'invalid';
  return errors;
}

function submitComment(idea, input, key, now) {
  if (!VISIBLE.has(idea.status)) return { status: 404, code: 'not_found' };
  const fieldErrors = submissionErrors(input, true);
  if (key != null && (typeof key !== 'string' || key.length < 1 || key.length > 128)) fieldErrors.requestId = 'invalid';
  if (Object.keys(fieldErrors).length) return { status: 422, code: 'invalid', fieldErrors };
  const data = { author: input.name.trim(), email: input.email.trim().toLowerCase(), body: input.message.trim(), privacyVersion: String(input.privacyVersion ?? '') };
  const fingerprint = digest(JSON.stringify(data)), requestKey = key ? digest(key) : undefined;
  const comments = idea.discussion ?? [];
  const prior = requestKey && comments.find(comment => comment.requestKey === requestKey);
  if (prior && prior.fingerprint !== fingerprint) return { status: 409, code: 'idempotency_conflict' };
  const duplicate = prior || comments.find(comment => comment.fingerprint === fingerprint && Date.parse(now) - Date.parse(comment.submittedAt) < 600000);
  if (duplicate) return { comment: duplicate, duplicate: true };
  if (comments.length >= 1000) return { status: 429, code: 'discussion_full' };
  const comment = { id: `comment_${randomUUID()}`, ...data, status: 'pending', version: 1, submittedAt: now, fingerprint, ...(requestKey ? { requestKey } : {}) };
  (idea.discussion ??= []).push(comment);
  idea.version += 1;
  return { comment };
}

function moderateComment(idea, commentId, version, action, reason, by, now) {
  const comment = idea.discussion?.find(comment => comment.id === commentId);
  if (!comment) return { status: 404, code: 'not_found' };
  if (Number(version) !== comment.version) return { status: 412, code: 'stale' };
  if (!['approve', 'hide', 'delete', 'restore'].includes(action)) return { status: 400, code: 'unknown_action' };
  // A retained deletion must be restored privately before it can be published again.
  if ((comment.status === 'deleted' && action !== 'restore') || (comment.status !== 'deleted' && action === 'restore')) return { status: 409, code: 'wrong_state' };
  if (action === 'hide' && (typeof reason !== 'string' || !reason.trim() || reason.length > 1000)) return { status: 422, code: 'invalid', fieldErrors: { reason: 'required' } };
  const next = action === 'approve' ? 'approved' : action === 'delete' ? 'deleted' : 'hidden';
  if (comment.status === next) return { status: 409, code: 'wrong_state' };
  const from = comment.status;
  (comment.moderationHistory ??= []).unshift({ at: now, by, action, from, to: next, ...(action === 'hide' ? { reason: reason.trim() } : {}) });
  Object.assign(comment, { status: next, version: comment.version + 1, moderatedAt: now, moderatedBy: by, reason: action === 'hide' ? reason.trim() : action === 'approve' ? undefined : comment.reason });
  idea.version += 1;
  idea.history.unshift({ at: now, by, action: `comment_${action}`, commentId, from: idea.status, to: idea.status });
  return { comment };
}

function ideaView(idea, canPii) {
  const submitter = idea.submitter;
  return { ...idea, category: ideaCategory(idea), tags: ideaTags(idea), comments: commentCount(idea), discussion: (idea.discussion ?? []).map(({ fingerprint, requestKey, ...comment }) => ({
    ...comment, ...(!canPii ? { author: mask(comment.author), email: maskEmail(comment.email), masked: true } : {}),
  })), ...(submitter && !canPii && !submitter.erased ? {
    submitter: { ...submitter, name: mask(submitter.name), email: maskEmail(submitter.email), masked: true },
  } : {}) };
}

function eraseSubmitter(idea, who, now, audit) {
  idea.submitter = { erased: true, privacyVersion: idea.submitter?.privacyVersion ?? '' };
  idea.version += 1;
  idea.history.unshift({ at: now, by: who, action: 'erase' });
  audit.unshift({ at: now, by: who, action: 'idea_erase', entry: idea.id, type: 'idea', version: idea.version });
}

// Scoped to a store generation. Compare the full payload for reused idempotency keys.
function ideaSubmissions(ideas, now = Date.now) {
  const seen = new Map();
  const windowMs = 10 * 60 * 1000;
  return {
    duplicate(body, key) {
      const at = now();
      for (const [k, value] of seen) if (at - value.at >= windowMs || !ideas.has(value.id)) seen.delete(k);
      const payload = JSON.stringify(body);
      const emailMessage = `${body.email.toLowerCase()}|${body.message}`;
      const prior = key ? seen.get(`key:${key}`) : null;
      if (prior && prior.payload !== payload) return { conflict: true };
      const found = prior ?? seen.get(`body:${emailMessage}`);
      return found ? { id: found.id } : null;
    },
    remember(body, key, id) {
      const value = { id, at: now(), payload: JSON.stringify(body) };
      seen.set(`body:${body.email.toLowerCase()}|${body.message}`, value);
      if (key) seen.set(`key:${key}`, value);
    },
    exportState: () => ({ seen: codec.copy([...seen]) }),
    validateState(value) {
      const rows = codec.mapRows(value?.seen, { ids: false });
      if (rows.some(([, row]) => typeof row.id !== 'string' || !Number.isFinite(row.at) || typeof row.payload !== 'string')) throw codec.fail('Website idea submission receipts are incomplete.');
      return { seen: rows };
    },
    importState(value) { const incoming = this.validateState(value); codec.replaceMap(seen, incoming.seen); },
  };
}
module.exports = { ideaView, eraseSubmitter, ideaSubmissions, publicIdea, submissionErrors, submitComment, moderateComment, ideaCategory, ideaTags, classificationErrors, cleanTags, IDEA_CATEGORIES };
