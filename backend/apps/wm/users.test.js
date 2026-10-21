const { test } = require("node:test");
const assert = require("node:assert/strict"),
  http = require("node:http"),
  express = require("express");
const { registerUsers } = require("./users"),
  { permissionsFor } = require("./permissions");
const { setPassword, passwordMatches } = require("../../lib/auth-store");
// Native HTTP accepts every OS-selected ephemeral port, including fetch's denylist.
const request = (url, {body, ...options}) => new Promise((resolve,reject) => {
  const req=http.request(url,options,res=>{let text='';res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;});res.on('end',()=>resolve({status:res.statusCode,text:async()=>text}));res.on('error',reject);});
  req.on('error',reject);req.end(body);
});

test("Website administrators respect central account permissions, internal membership, version checks and self-protection", async (t) => {
  const users = ["admin", "webadmin", "staff", "customer"].map(
    (key, index) => ({
      id: index + 1,
      key,
      firstName: key,
      lastName: "Fixture",
      email: `${key}@example.test`,
      isActive: true,
      updatedAt: "2026-10-09T00:00:00Z",
    }),
  );
  const identity = {
    users,
    grants: {
      global: { admin: { roles: ["super_admin"] } },
      website_manager: {
        admin: { roles: ["wm_admin"] },
        webadmin: { roles: ["wm_admin"] },
        staff: { roles: ["wm_editor"] },
      },
    },
    findUser: (id) => users.find((user) => user.id === id),
    fullName: (user) => `${user.firstName} ${user.lastName}`,
    setPassword,
  };
  const workspace = {
      members: users
        .slice(0, 3)
        .map((user) => ({
          userKey: user.key,
          role: "member",
          status: "active",
        })),
    },
    logs = [],
    audit = [];
  const platform = {
    db: {workspaces:[workspace],invoices:[]},
    workspace: () => workspace,
    id: () => "member-new",
    iso: (value) => new Date(value).toISOString(),
    now: () => Date.now(),
    log: (...event) => logs.push(event),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.who = {
      user: users.find((user) => user.key === (req.get("actor") ?? "webadmin")),
    };
    next();
  });
  registerUsers(app, {
    identity,
    platform: () => platform,
    store: { audit },
    need: (permission) => (req, res, next) =>
      permissionsFor(
        identity.grants.website_manager[req.who.user.key]?.roles ?? [],
      ).includes(permission)
        ? next()
        : res.status(403).end(),
    ok: (res, data, meta = {}, status = 200) =>
      res.status(status).json({ data, meta }),
    fail: (res, status, code) => res.status(status).json({ code }),
    page: (_req, rows) => ({ rows, meta: { total: rows.length } }),
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const call = async (method, route, body, version, actor = "webadmin") => {
    const response = await request(
      `http://127.0.0.1:${server.address().port}/v2/admin/users${route}`,
      {
        method,
        headers: {
          actor,
          "content-type": "application/json",
          ...(version ? { "if-match": version } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const text = await response.text();
    return { status: response.status, ...(text ? JSON.parse(text) : {}) };
  };
  const listed = await call("GET", "");
  assert.equal(listed.data.length, 3);
  assert.ok(!listed.data.some((user) => user.key === "customer"));
  assert.equal(
    (await call("GET", "", undefined, undefined, "staff")).status,
    403,
  );
  assert.equal(
    (
      await call("POST", "", {
        firstName: "New",
        lastName: "Account",
        email: "new@example.test",
        password: "FixturePassword!",
      })
    ).status,
    403,
  );
  const staff = listed.data.find((user) => user.key === "staff"),
    self = listed.data.find((user) => user.key === "webadmin");
  for (const role of ["wm_owner", "wm_super_admin"])
    assert.equal((await call("PATCH", "/3", { roles: [role] }, staff.version)).status, 403);
  assert.equal(
    (await call("PATCH", "/3", { active: false }, staff.version)).status,
    403,
  );
  assert.equal(
    (await call("PATCH", "/2", { roles: ["wm_editor"] }, self.version)).code,
    "self_lockout",
  );
  assert.equal(
    (await call("PATCH", "/3", { roles: ["super_admin"] }, staff.version))
      .status,
    422,
  );
  const changed = await call(
    "PATCH",
    "/3",
    { roles: ["wm_viewer"] },
    staff.version,
  );
  assert.equal(changed.status, 200);
  assert.equal(platform.db.staffAccessEpochs.staff, 1);
  assert.equal(
    (await call("PATCH", "/3", { roles: ["wm_seo"] }, staff.version)).status,
    412,
  );
  let unchanged = await call(
    "PATCH",
    "/3",
    { roles: ["wm_viewer"] },
    changed.data.version,
  );
  assert.equal(platform.db.staffAccessEpochs.staff, 1);
  // Role access can pause independently of the suite account and preserves assignments.
  assert.equal((await call("PATCH", "/3", {rolePaused:"yes",roles:["wm_seo"]}, unchanged.data.version)).status,422);
  assert.deepEqual(identity.grants.website_manager.staff.roles,["wm_viewer"],"invalid pause cannot partially change roles");
  assert.equal((await call("PATCH", "/2", {rolePaused:true}, self.version)).code,"self_lockout");
  const paused=await call("PATCH", "/3", {rolePaused:true}, unchanged.data.version);
  assert.equal(paused.status,200);assert.equal(paused.data.rolePaused,true);assert.equal(paused.data.active,true);
  assert.deepEqual(paused.data.roles,["wm_viewer"]);assert.equal(users[2].authVersion,undefined);
  assert.equal(platform.db.staffAccessEpochs.staff,2);
  assert.equal((await call("PATCH", "/3", {rolePaused:false}, unchanged.data.version)).status,412);
  const rolesWhilePaused=await call("PATCH", "/3", {roles:["wm_seo"]}, paused.data.version);
  assert.equal(rolesWhilePaused.data.rolePaused,true,"changing a paused assignment does not resume it");
  const inactive=await call("PATCH", "/3", {active:false}, rolesWhilePaused.data.version,"admin");
  assert.equal(inactive.data.active,false);assert.equal(inactive.data.rolePaused,true);
  const resumed=await call("PATCH", "/3", {rolePaused:false}, inactive.data.version);
  assert.equal(resumed.data.rolePaused,false);assert.equal(resumed.data.active,false,"resuming a role cannot reactivate the account");
  unchanged=await call("PATCH", "/3", {active:true}, resumed.data.version,"admin");
  const epoch=platform.db.staffAccessEpochs.staff;
  unchanged=await call("PATCH", "/3", {rolePaused:false}, unchanged.data.version);
  assert.equal(platform.db.staffAccessEpochs.staff,epoch,"a repeated resume does not revoke sessions again");
  const adminGrant=identity.grants.website_manager.admin.roles;identity.grants.website_manager.admin.roles=["wm_owner"];
  const protectedUser=(await call("GET", "")).data.find(row=>row.key==="admin");
  assert.equal((await call("PATCH", "/1", {rolePaused:true},protectedUser.version)).status,403);
  identity.grants.website_manager.admin.roles=adminGrant;
  assert.ok(audit.some(event=>event.action==="user_role_pause"));assert.ok(audit.some(event=>event.action==="user_role_resume"));
  workspace.members.find((member) => member.userKey === "staff").status =
    "inactive";
  assert.equal(
    (await call("PATCH", "/3", { roles: ["wm_seo"] }, unchanged.data.version))
      .code,
    "internal_member_required",
  );
  const created = await call(
    "POST",
    "",
    {
      firstName: "New",
      lastName: "Account",
      email: "NEW@example.test",
      password: "FixturePassword!",
    },
    undefined,
    "admin",
  );
  assert.equal(created.status, 201);
  const raw = users.find((user) => user.id === created.data.id);
  assert.equal(raw.password, undefined);
  assert.ok(passwordMatches(raw, "FixturePassword!"));
  assert.ok(audit.some((event) => event.action === "user_create"));
  assert.ok(audit.some((event) => event.action === "user_roles"));
  assert.ok(logs.length >= 2);
  const prior=JSON.stringify({users,grants:identity.grants,db:platform.db});
  assert.equal((await call('DELETE','/'+created.data.id,undefined,created.data.version)).code,'suite_admin_required');
  assert.equal((await call('DELETE','/'+created.data.id,undefined,'stale','admin')).status,412);
  const myself=(await call('GET','',undefined,undefined,'admin')).data.find(user=>user.key==='admin');
  assert.equal((await call('DELETE','/1',undefined,myself.version,'admin')).code,'self_lockout');
  assert.equal(JSON.stringify({users,grants:identity.grants,db:platform.db}),prior,'denied deletions cannot change accounts or authority');
  assert.equal((await call('DELETE','/'+created.data.id,undefined,created.data.version,'admin')).status,204);
  assert.equal(raw.isActive,false);assert.ok(raw.deletedAt);assert.equal(raw.authVersion,1);
  assert.ok(users.includes(raw),'soft deletion retains the exact person row');
  assert.ok(Object.values(identity.grants).every(scope=>!scope[raw.key]));
  assert.ok(!(await call('GET','',undefined,undefined,'admin')).data.some(user=>user.id===raw.id));
  assert.equal((await call('DELETE','/'+raw.id,undefined,created.data.version,'admin')).status,404);
  assert.ok(audit.some(event=>event.action==='user_delete'&&event.entry===raw.key));
});

test('canonical account deletion protects administrators, ownership and invoices, and retains business history',()=>{
  const {deleteIdentityUser}=require('../../lib/accounts');
  const people=['actor','target','backup','peer'].map((key,index)=>({id:index+1,key,isActive:true,firstName:key,lastName:'Fixture',email:key+'@fixture.test',authVersion:2}));
  const [actor,target,backup]=people;
  const identity={users:people,findByKey:key=>people.find(person=>person.key===key),grants:{global:{actor:{roles:['super_admin']},target:{roles:['super_admin']},backup:{roles:[]}},website_manager:{target:{roles:['wm_viewer'],permissions:[]}},sales:{target:{roles:['manager'],permissions:[]}}}};
  const membership=(key,role='member')=>({id:'member-'+key,userKey:key,role,status:'active',revision:3,accessEpoch:4,toolGrants:{files:{assigned:true,roles:['file_editor']}}});
  const internal={id:'ws_orgtik',kind:'orgtik_internal',state:'active',authorityRevision:7,members:people.map(person=>membership(person.key)),lines:[{id:'billed-files',tool:'files',seats:5}]};
  const owned={id:'owned',state:'active',authorityRevision:2,members:[membership(target.key,'owner')],lines:[{id:'closed-billed-line',state:'ended'}]};
  const other={id:'other',state:'active',members:[membership('peer','owner')],lines:[{id:'other-billed-line',seats:8}]};
  const logs=[],S={db:{workspaces:[internal,owned,other],invoices:[{id:'open-invoice',workspaceId:'owned',state:'open',amount:1250}],staffRoles:{actor:['support'],target:['super_admin'],backup:['super_admin']},staffAccessEpochs:{target:5}},workspace:id=>S.db.workspaces.find(row=>row.id===id),now:()=>Date.parse('2026-10-15T09:00:00Z'),iso:at=>new Date(at).toISOString(),log:(...entry)=>logs.push(entry)};
  const snapshot=()=>JSON.stringify({people,grants:identity.grants,db:S.db,logs});
  const refused=code=>{const before=snapshot();assert.throws(()=>deleteIdentityUser(identity,{user:target,actor,platform:S}),{code});assert.equal(snapshot(),before,'refusal must not partially delete the account');};
  backup.isActive=false;refused('active_super_admin_required');
  backup.isActive=true;internal.members.find(member=>member.userKey==='backup').role='guest';refused('active_super_admin_required');
  internal.members.find(member=>member.userKey==='backup').role='member';S.db.staffAuthorityRevocations={backup:{at:'2026-10-14T00:00:00Z'}};refused('active_super_admin_required');
  delete S.db.staffAuthorityRevocations.backup;refused('ownership_transfer_required');
  owned.state='cancelled';refused('unpaid_invoices');
  S.db.invoices[0].state='paid';const beforeMissing=snapshot();assert.throws(()=>deleteIdentityUser(identity,{user:target,actor,platform:null}),{code:'account_authority_unavailable'});assert.equal(snapshot(),beforeMissing);
  target.authVersion=Number.MAX_SAFE_INTEGER;refused('account_authority_unavailable');target.authVersion=2;
  const business=structuredClone({invoices:S.db.invoices,lines:S.db.workspaces.map(row=>row.lines),other}),remainingGrants=structuredClone(identity.grants.global.actor),staffRoles=structuredClone(S.db.staffRoles),targetId=target.id;
  deleteIdentityUser(identity,{user:target,actor,platform:S});
  assert.equal(identity.findByKey('target'),target);assert.equal(target.id,targetId);assert.equal(target.firstName,'target');assert.equal(target.authVersion,3);assert.equal(target.deletedAt,'2026-10-15T09:00:00.000Z');assert.equal(target.isActive,false);
  assert.ok(Object.values(identity.grants).every(scope=>!scope.target));assert.deepEqual(identity.grants.global.actor,remainingGrants);assert.deepEqual(S.db.staffRoles,staffRoles);
  assert.deepEqual({invoices:S.db.invoices,lines:S.db.workspaces.map(row=>row.lines),other},business);
  for(const row of [internal,owned]){const member=row.members.find(member=>member.userKey==='target');assert.equal(member.status,'removed');assert.equal(member.accessEpoch,5);assert.equal(member.revision,4);assert.equal(member.toolGrants.files.assigned,false);assert.deepEqual(member.toolGrants.files.roles,['file_editor']);}
  assert.equal(S.db.staffAccessEpochs.target,6);assert.deepEqual(logs,[[actor.key,'account_deleted',String(target.id)]]);
  const after=snapshot();assert.throws(()=>deleteIdentityUser(identity,{user:target,actor,platform:S}),{code:'not_found'});assert.equal(snapshot(),after);
});
