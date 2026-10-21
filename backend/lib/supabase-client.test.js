const test = require("node:test");
const assert = require("node:assert/strict");
const { supabaseSelected, supabaseConfiguration, supabaseClient } = require("./supabase-client");
const secret = ["sb", "secret", "test_only_012345678901234567890"].join("_");
const env = { MOCK_PERSISTENCE: "supabase", MOCK_SANDBOX: "contract-test", SUPABASE_URL: "https://project.supabase.co/", SUPABASE_SECRET_KEY: secret };
const jwt = role => [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify({ role })).toString("base64url"), "test_signature"].join(".");

test("Supabase requires an explicit provider and a server credential on a secure origin", () => {
  assert.equal(supabaseSelected({ SUPABASE_URL: env.SUPABASE_URL }), false);
  assert.equal(supabaseSelected(env), true);
  assert.deepEqual(supabaseConfiguration(env), { url: "https://project.supabase.co", key: secret });
  assert.equal(supabaseConfiguration({ ...env, SUPABASE_SECRET_KEY: undefined, SUPABASE_SERVICE_ROLE_KEY: jwt("service_role") }).key, jwt("service_role"));
  for (const invalid of [
    { SUPABASE_URL: "http://project.supabase.co" }, { SUPABASE_URL: "https://user:password@project.supabase.co" },
    { SUPABASE_URL: "https://project.supabase.co/rest/v1" }, { SUPABASE_URL: "https://project.supabase.co/?secret=value" },
    { SUPABASE_URL: "https://project.supabase.co/#fragment" }, { SUPABASE_SECRET_KEY: "sb_publishable_test_only_012345678901234567890" },
    { SUPABASE_SECRET_KEY: jwt("anon") }, { SUPABASE_SECRET_KEY: jwt("authenticated") }, { SUPABASE_SECRET_KEY: "" },
  ]) assert.throws(() => supabaseConfiguration({ ...env, ...invalid }), { status: 503, code: "persistence_unavailable" });
  assert.throws(() => supabaseClient({ env, realm: "invalid:realm" }), { status: 503 });
});

test("Supabase RPC carries only the selected realm and prevents credential-bearing redirects", async () => {
  const calls = [];
  const client = supabaseClient({ env, fetcher: async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ status: "ok", revision: 3 }) }; } });
  assert.deepEqual(await client.rpc("journal_snapshot", { from: 1 }), { status: "ok", revision: 3 });
  assert.equal(calls[0].url, "https://project.supabase.co/rest/v1/rpc/orgtik_persistence");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.headers.apikey, secret);
  assert.equal(calls[0].init.headers.authorization, undefined);
  assert.equal(calls[0].init.signal.aborted, false);
  assert.deepEqual(JSON.parse(calls[0].init.body), { p_realm: "contract-test", p_action: "journal_snapshot", p_payload: { from: 1 } });
  assert.equal(calls[0].init.body.includes(secret), false);
  await assert.rejects(client.rpc("invalid/action"), TypeError);
  await assert.rejects(client.rpc("journal_snapshot", []), TypeError);
});

test("legacy service-role JWT remains supported while new secret keys use only apikey", async () => {
  const legacy = jwt("service_role"); let headers;
  const client = supabaseClient({ env: { ...env, SUPABASE_SECRET_KEY: undefined, SUPABASE_SERVICE_ROLE_KEY: legacy }, fetcher: async (_, init) => { headers = init.headers; return { ok: true, json: async () => ({ status: "missing" }) }; } });
  assert.equal((await client.rpc("journal_lookup")).status, "missing");
  assert.equal(headers.authorization, `Bearer ${legacy}`);
});

test("provider and malformed responses fail closed without disclosing returned credentials", async () => {
  for (const fetcher of [
    async () => { throw new Error(`network ${secret}`); },
    async () => ({ ok: false, status: 401, json: async () => ({ message: secret }) }),
    async () => ({ ok: true, json: async () => { throw new Error(secret); } }),
    async () => ({ ok: true, json: async () => ({ error: secret }) }),
    async () => ({ ok: true, json: async () => ({ status: "unknown", message: secret }) }),
    async () => ({ ok: true, json: async () => [] }),
  ]) {
    const client = supabaseClient({ env, fetcher });
    await assert.rejects(client.rpc("security_read"), error => error.status === 503 && error.code === "persistence_unavailable" && !error.message.includes(secret) && !error.cause);
  }
});
