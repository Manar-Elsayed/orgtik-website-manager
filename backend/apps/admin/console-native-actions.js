// Bounded D-075 adapter: invoke the existing native handlers after current Console authority.
// No pricing, invoice or subscription reducer is duplicated here.
const ALLOWED = new Set([
  'POST /v1/app/checkout/preview',
  'POST /v1/app/checkout/confirm',
  'POST /v1/app/subscriptions/:id/:action(cancel|resume|downgrade|cancel-downgrade|retry)',
  'POST /v1/admin/invoices/:id/:action(void|mark-paid|refund|retry|issue)',
]);
function invoke(S, identity, selection, request) {
  if (!ALLOWED.has(selection)) throw new Error('Unsupported native Console action.');
  let callback;
  const registration = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) registration[method] = (path, ...handlers) => {
    if (`${method.toUpperCase()} ${path}` === selection) callback = handlers.at(-1);
  };
  const helpers = {
    ok: (res, data, meta = {}, status = 200) => res.status(status).json({ data, meta }),
    fail: (res, status, code, message, extra = {}) => res.status(status).json({ error: { code, message, ...extra } }),
    page: () => { throw new Error('Lists are not native Console actions.'); },
  };
  const api = selection.includes('/v1/app/') ? './app-api' : './admin-api';
  require(api)(registration, { identity }, S, helpers);
  if (typeof callback !== 'function') throw new Error('The native action is unavailable.');
  let status = 200, result;
  const response = { status(value) { status = value; return this; }, json(value) { result = value; return this; } };
  callback(request, response);
  if (status >= 400) throw Object.assign(new Error(result.error.message), { status, code: result.error.code });
  if (!result || result.data === undefined) throw new Error('The native action returned an incomplete receipt.');
  return result.data;
}
module.exports = { invoke };
