// One handler for every mock API, each under its app key (/sos/api/..., /tasks/..., /files/...);
// mock/index.js serves it (DEPLOYMENT.md). Sockets (live updates) aren't available here.
// With a journal store configured (lib/journal.js, D-053) the data survives restarts and is the
// same on every instance; without one it lives in memory and resets on a restart.
process.env.ORGTIK_MOCK_NO_LISTEN = "1";
// Framework discovery and artifact verification import this module without
// runtime-only sensitive variables. Initialize storage only for an HTTP request.
let runtime;
function loadRuntime() {
  if (!runtime) {
    const {createPresentationHandler}=require('../lib/presentation');
    const {presentationStorage}=require('../lib/presentation-storage');
    const presentation=createPresentationHandler(presentationStorage());
    runtime = { ...require("../server"), presentation };
  }
  return runtime;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-allow-headers": req.headers["access-control-request-headers"] || "content-type,authorization", "access-control-allow-credentials": "true", vary: "Origin" });
    return res.end();
  }
  let slots, handle;
  try {
    const current = loadRuntime();
    ({slots, handle} = current);
    if (/^\/presentation(?:\/|\?|$)/.test(req.url||'')) {
      req.url=req.url.replace(/^\/presentation/,'')||'/';
      return await current.presentation(req,res);
    }
    await current.ready();
  } catch (e) {
    console.error("[journal] start failed:", e);
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    return res.end(JSON.stringify({ success: false, statusCode: 503, message: "[mock] data store unavailable" }));
  }
  const m = /^\/([a-z_]+)(\/[^?]*)?(\?.*)?$/.exec(req.url || "/");
  const key = m && m[1];
  if (!key || !slots.has(key)) {
    res.statusCode = key ? 404 : 200;
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    return res.end(JSON.stringify({ ok: !key, service: "OrgTik suite mock API", apps: [...slots.keys()].map((k) => `/${k}`) }));
  }
  req.url = (m[2] || "/") + (m[3] || "");
  return handle(key, req, res);
};
