// MOCK_PERSISTENCE=file: the self-hosted (Docker) provider keeps every store on one volume.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orgtik-file-persistence-"));
const saved = { ...process.env };
Object.assign(process.env, { MOCK_PERSISTENCE: "file", MOCK_DATA_DIR: dataDir, MOCK_SANDBOX: "docker", MOCK_SESSION_SECRET: "test-only-session-secret-with-32-bytes!" });
for (const key of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "ORGTIK_SERVICES_DEV", "VERCEL", "MOCK_AUTH_FILE"]) delete process.env[key];
const hostedConfig = { hosted: true, dataDir };
test.after(() => { process.env = saved; fs.rmSync(dataDir, { recursive: true, force: true }); });

test("hosted session store uses the volume and survives a restart", async () => {
  const { pickStore } = require("./session-store");
  const first = pickStore(hostedConfig);
  assert.equal(first.kind, "file");
  const initial = await first.read();
  await first.compareAndSwap(initial.revision, { ...initial.state, sessions: { one: { sid: "one" } } });
  const restarted = pickStore(hostedConfig);
  assert.deepEqual((await restarted.read()).state.sessions, { one: { sid: "one" } });
  assert.deepEqual(await restarted.signingKey(), await first.signingKey());
  assert(fs.existsSync(path.join(dataDir, "journal", "security", "docker.json")));
});

test("file session store refuses to run without an operator secret", () => {
  const { pickStore } = require("./session-store");
  assert.throws(() => pickStore(hostedConfig, { env: { ...process.env, MOCK_SESSION_SECRET: "short", MOCK_AUTH_SECRET: "" } }), { status: 503 });
});

test("identity and journal stores persist under the data directory", async () => {
  const auth = require("./auth-store").pickStore(hostedConfig);
  assert.equal(auth.kind, "file");
  const { sandbox, store } = require("./journal").pickStore(hostedConfig);
  assert.equal(sandbox, "docker");
  assert.equal(store.kind, "file");
  await store.initialize({ epoch: "e1" });
  await store.push({ op: "x" });
  const again = require("./journal").pickStore(hostedConfig).store;
  assert.equal((await again.read(0)).length, 1);
  assert(fs.existsSync(path.join(dataDir, "journal", "docker.json")));
});

test("presentation storage round-trips without using workspace ids as paths", async () => {
  const storage = require("./presentation-storage").presentationStorage();
  assert.equal(await storage.load("../escape"), null);
  await storage.save("../escape", { theme: "dark" });
  assert.deepEqual(await require("./presentation-storage").presentationStorage().load("../escape"), { theme: "dark" });
  const files = fs.readdirSync(path.join(dataDir, "presentation", "docker"));
  assert.equal(files.length, 1);
  assert.match(files[0], /^[a-f0-9]{64}\.json$/);
});

test("local file assets are enabled and unknown providers still fail", () => {
  assert.equal(require("./local-file-assets").enabled(), true);
  process.env.MOCK_PERSISTENCE = "unknown";
  try {
    assert.throws(() => require("./journal").pickStore(hostedConfig));
    assert.throws(() => require("./auth-store").pickStore(hostedConfig));
  } finally { process.env.MOCK_PERSISTENCE = "file"; }
});
