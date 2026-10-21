// Runs the mock API inside the Website Manager's own server, so the CMS needs no separate
// backend deployment. The Next route app/api/backend/[...path] forwards each call to a loopback
// server started here on first use (one per server instance).
//
// Data (demo mode): unless a durable store is configured (Upstash Redis or Supabase, see
// README.md), everything is kept in local files: backend/.data locally, /tmp on Vercel. On Vercel
// that means edits last only while a server instance stays warm and reset on a cold start.
const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");

const env = process.env;
const trimmed = (value) => String(value || "").replace(/\/$/, "");
const origin = (value) => (value ? (/^https?:\/\//.test(value) ? trimmed(value) : `https://${trimmed(value)}`) : "");

// Public addresses: the Website Manager itself and the public website it manages.
const wmUrl = origin(env.WM_PUBLIC_URL || env.VERCEL_PROJECT_PRODUCTION_URL) || `http://localhost:${env.PORT || 3007}`;
const websiteUrl = origin(env.NEXT_PUBLIC_WEBSITE_URL) || "http://localhost:4173";

env.MOCK_PUBLIC_URL ||= `${wmUrl}/api/backend`;
env.SUITE_WEB_URLS ||= JSON.stringify({ wm: wmUrl, website: websiteUrl });
env.MOCK_SANDBOX ||= "wm-standalone";

const durable = env.MOCK_PERSISTENCE === "supabase" || ((env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL) && (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN));
if (!durable) {
  env.MOCK_PERSISTENCE ||= "file";
  env.MOCK_AUTH_STORE ||= "file";
  env.MOCK_JOURNAL ||= "file";
  if (!env.VERCEL) env.MOCK_DATA_DIR ||= path.join(__dirname, ".data");
}
// Sessions are signed with this secret. Without one, each server instance makes its own, so
// signing in again is needed after a restart (which demo mode needs anyway).
if (Buffer.byteLength(env.MOCK_SESSION_SECRET || "") < 32) env.MOCK_SESSION_SECRET = crypto.randomBytes(32).toString("hex");

let listening;
/** The loopback origin of the in-process mock API, e.g. http://127.0.0.1:53121/. */
function backendOrigin() {
  if (!listening) {
    listening = new Promise((resolve, reject) => {
      const handler = require("./api/index.js");
      const server = http.createServer((req, res) => {
        Promise.resolve(handler(req, res)).catch((error) => {
          console.error("[backend]", error);
          if (res.headersSent) return res.destroy();
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ success: false, statusCode: 500, message: "Backend error" }));
        });
      });
      server.on("error", (error) => { listening = null; reject(error); });
      server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}/`));
    });
  }
  return listening;
}

module.exports = { backendOrigin };
