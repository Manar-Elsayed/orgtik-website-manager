import assert from "node:assert/strict";
import { test } from "node:test";
import { clearClientSession, readClientSession, setClientSession } from "@orgtik/ui/auth";
import { canOpenCentralUsers, centralUsersDestination } from "./centralUsers.ts";

const session = (apps = ["wm", "admin"]) => ({
  user: { id: 1, email: "staff@example.test" },
  tokens: { accessToken: "wm-secret", refreshToken: "wm-refresh", expiresIn: 3600 },
  scopes: [],
  workspaceContext: null,
  staffAccess: { actorUserId: 1, apps, roles: { wm: ["wm_super_admin"], admin: ["super_admin"] }, permissions: { admin: ["staff:view"] } },
});

async function withBrowser(run) {
  const originalWindow = global.window, originalFetch = global.fetch;
  const storage = new Map();
  global.window = {
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    dispatchEvent: () => {},
  };
  try { await run(); }
  finally { clearClientSession(); global.window = originalWindow; global.fetch = originalFetch; }
}

test("central administration requires server-issued WM and admin staff access, not a WM role name", () => {
  assert.equal(canOpenCentralUsers(null), false);
  assert.equal(canOpenCentralUsers(session(["wm"])), false);
  assert.equal(canOpenCentralUsers({ ...session(), workspaceContext: { workspace: { id: "ws_customer" } } }), false);
  const finance = session();
  finance.staffAccess.permissions.admin = ["billing:view"];
  assert.equal(canOpenCentralUsers(finance), false);
  const mismatched = session();
  mismatched.staffAccess.actorUserId = 2;
  assert.equal(canOpenCentralUsers(mismatched), false);
  assert.equal(canOpenCentralUsers(session()), true);
});

test("central user navigation obtains an admin handoff, preserves the WM session and suite base path", async () => withBrowser(async () => {
  setClientSession(session());
  const before = readClientSession(), calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, auth: options.headers.Authorization, body: JSON.parse(options.body) });
    return Response.json({ data: calls.length === 1 ? { tokens: { accessToken: "admin-secret" } } : { code: "one-use-code" } });
  };
  const destination = new URL(await centralUsersDestination("https://suite.example/wm/api/backend/sos/api", "https://suite.example/sos"));
  assert.equal(destination.pathname, "/sos/auth/staff");
  assert.deepEqual([...destination.searchParams], [["code", "one-use-code"], ["redirect", "/people"]]);
  assert.deepEqual(calls.map(call => call.body), [{ mode: "staff", target: "admin" }, { audience: "staff:admin" }]);
  assert.equal(calls[0].auth, "Bearer wm-secret");
  assert.equal(calls[1].auth, "Bearer admin-secret");
  assert.equal(readClientSession(), before);
  assert.ok(!destination.toString().includes("secret"));
}));

test("WM-only staff never requests a suite admin token and a denied or failed transfer can be retried", async () => withBrowser(async () => {
  setClientSession(session(["wm"]));
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error("offline"); };
  await assert.rejects(centralUsersDestination("https://suite.example/api", "https://suite.example"), error => error.status === 403);
  assert.equal(calls, 0);
  setClientSession(session());
  const before = readClientSession();
  global.fetch = async () => Response.json({ error: { code: "staff_access_required" } }, { status: 403 });
  await assert.rejects(centralUsersDestination("https://suite.example/api", "https://suite.example"), error => error.status === 403);
  assert.equal(readClientSession(), before);
  global.fetch = async url => Response.json({ data: url.endsWith("/auth/workspace") ? { tokens: { accessToken: "new-admin-secret" } } : { code: "retry-code" } });
  assert.equal(new URL(await centralUsersDestination("https://suite.example/api", "https://suite.example")).searchParams.get("code"), "retry-code");
}));

test("changing the signed-in session during either transfer step stops navigation", async () => withBrowser(async () => {
  for (const changeAt of [1, 2]) {
    setClientSession(session());
    let calls = 0;
    global.fetch = async () => {
      calls++;
      if (calls === changeAt) setClientSession({ ...session(), user: { id: 2 } });
      return Response.json({ data: calls === 1 ? { tokens: { accessToken: "admin-secret" } } : { code: "discarded-code" } });
    };
    await assert.rejects(centralUsersDestination("https://suite.example/api", "https://suite.example"), error => error.code === "session_changed");
    assert.equal(calls, changeAt);
    assert.equal(readClientSession().user.id, 2);
  }
}));
