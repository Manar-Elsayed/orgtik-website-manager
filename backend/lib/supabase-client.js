// Server-only transport for the suite's private Supabase persistence RPC.
// Credential-bearing responses are never included in errors or diagnostics.
const unavailable = () => Object.assign(new Error("Persistent storage unavailable. Please retry."), { status: 503, code: "persistence_unavailable" });
const supabaseSelected = (env = process.env) => env.MOCK_PERSISTENCE === "supabase";

function supabaseConfiguration(env = process.env) {
  try {
    const parsed = new URL(env.SUPABASE_URL || "");
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !["", "/"].includes(parsed.pathname)) throw unavailable();
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (typeof key !== "string" || /\s/.test(key)) throw unavailable();
    if (!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(key)) {
      const parts = key.split(".");
      if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part)) || JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role !== "service_role") throw unavailable();
    }
    return { url: parsed.origin, key };
  } catch { throw unavailable(); }
}

function supabaseClient({ env = process.env, fetcher = globalThis.fetch, realm = env.MOCK_SANDBOX || "demo" } = {}) {
  const { url, key } = supabaseConfiguration(env);
  if (!/^[\w-]{1,100}$/.test(realm) || typeof fetcher !== "function") throw unavailable();
  return {
    realm,
    async rpc(action, payload = {}) {
      if (typeof action !== "string" || !/^[a-z_]{1,80}$/.test(action) || !payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Invalid persistence request");
      try {
        const response = await fetcher(`${url}/rest/v1/rpc/orgtik_persistence`, {
          method: "POST", redirect: "error",
          headers: { apikey: key, ...(!key.startsWith("sb_secret_") ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ p_realm: realm, p_action: action, p_payload: payload }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw unavailable();
        const value = await response.json();
        if (!value || typeof value !== "object" || Array.isArray(value) || !["ok", "conflict", "account_conflict", "operation_conflict", "full", "missing", "duplicate"].includes(value.status)) throw unavailable();
        return value;
      } catch { throw unavailable(); }
    },
  };
}

module.exports = { supabaseSelected, supabaseConfiguration, supabaseClient };
