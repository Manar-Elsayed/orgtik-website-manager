const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
// Native HTTP permits every OS-assigned ephemeral port, including fetch's blocked ports.
function request(url, { body, ...options }) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text: async () => text, json: async () => JSON.parse(text) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(body);
  });
}
const { registerRoles, validateRoleOverrides, validateRoleDefinitions, validateRoleDeletions } = require("./roles");
const { ROLES, permissionsFor, availableRoleKeys } = require("./permissions");
const { registerUsers } = require("./users");

test("Role edits enforce authority, versions and self-protection, and immediately change effective access", async (t) => {
  const overrides = {},
    audit = [];
  const actorRoles = {
    admin: ["wm_admin"],
    editor: ["wm_editor"],
    owner: ["wm_owner"],
  };
  const identity = {
    grants: { global: { owner: { roles: ["super_admin"] } } },
  };
  const app = express();
  app.use(express.json());
  const need = (permission) => (req, res, next) => {
    const key = req.get("actor") || "admin";
    req.who = {
      user: { key },
      roles: actorRoles[key],
      permissions: permissionsFor(actorRoles[key], overrides),
    };
    if (!req.who.permissions.includes(permission))
      return res.status(403).json({ code: "forbidden" });
    next();
  };
  registerRoles(app, {
    identity,
    store: { audit },
    overrides,
    need,
    ok: (res, data) => res.json({ data }),
    fail: (res, status, code) => res.status(status).json({ code }),
  });
  app.post("/create", need("content:create"), (_req, res) =>
    res.status(204).end(),
  );
  app.patch("/edit", need("content:edit"), (_req, res) =>
    res.status(204).end(),
  );
  app.delete("/delete", need("content:delete"), (_req, res) =>
    res.status(204).end(),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const call = async (method, url, body, version, actor = "admin") => {
    const response = await request(
      `http://127.0.0.1:${server.address().port}${url}`,
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
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
  const roles = (await call("GET", "/v2/admin/roles")).body.data;
  assert.deepEqual(
    roles.slice(0, 3).map((r) => r.label),
    ["Owner", "Super admin", "Admin"],
  );
  const editor = roles.find((r) => r.key === "wm_editor");
  const permissions = editor.permissions.filter(
    (p) => !["content:create", "content:delete"].includes(p),
  );
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_editor",
        { permissions },
        editor.version,
        "editor",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_owner",
        { permissions },
        roles[0].version,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_editor",
        { permissions: ["unknown:grant"] },
        editor.version,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_editor",
        { permissions: ["content:view", "content:view"] },
        editor.version,
      )
    ).status,
    422,
  );
  assert.equal(
    (await call("PATCH", "/v2/admin/roles/wm_editor", { permissions }, "stale"))
      .status,
    412,
  );
  const saved = await call(
    "PATCH",
    "/v2/admin/roles/wm_editor",
    { permissions },
    editor.version,
  );
  assert.equal(saved.status, 200);
  assert.notEqual(saved.body.data.version, editor.version);
  assert.equal(
    (await call("POST", "/create", {}, undefined, "editor")).status,
    403,
  );
  assert.equal(
    (await call("DELETE", "/delete", undefined, undefined, "editor")).status,
    403,
  );
  assert.equal(
    (await call("PATCH", "/edit", {}, undefined, "editor")).status,
    204,
  );
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_editor",
        { permissions },
        editor.version,
      )
    ).status,
    412,
  );
  assert.equal(audit[0].action, "role_permissions");
  const admin = roles.find((r) => r.key === "wm_admin");
  assert.equal(
    (
      await call(
        "PATCH",
        "/v2/admin/roles/wm_admin",
        { permissions: admin.permissions.filter((p) => p !== "roles:manage") },
        admin.version,
      )
    ).body.code,
    "self_lockout",
  );
  assert.deepEqual(validateRoleOverrides(overrides), overrides);
  assert.throws(() => validateRoleOverrides({ wm_editor: ["unknown:grant"] }));
});

test("Custom roles validate edits and delete assigned roles while preserving other access", async t => {
  const definitions = {}, overrides = {}, deletions = {}, audit = [];
  const users = [{id:1,key:"admin",firstName:"Admin",lastName:"Test",email:"admin@test.invalid",isActive:true},{id:2,key:"staff",firstName:"Staff",lastName:"Test",email:"staff@test.invalid",isActive:true}];
  const identity = {users,grants:{website_manager:{admin:{roles:["wm_admin"]},staff:{roles:["wm_viewer"]}}},fullName:user=>user.firstName+" "+user.lastName,userScopes:user=>[{scope:"website_manager",roles:identity.grants.website_manager[user.key].roles}],findUser:id=>users.find(user=>user.id===Number(id))};
  const S = {db:{},workspace:()=>({members:users.map(user=>({userKey:user.key,status:"active",role:"member"}))}),log(){}};
  const app = express(); app.use(express.json());
  const fail = (res,status,code)=>res.status(status).json({code});
  const need = permission => (req,res,next) => {
    const user=users.find(user=>user.key===(req.get("actor")||"admin")),roles=identity.grants.website_manager[user.key].roles;
    req.who={user,roles,permissions:permissionsFor(roles,overrides)};
    return req.who.permissions.includes(permission)?next():fail(res,403,"forbidden");
  };
  const shared={identity,store:{audit},overrides,definitions,deletions,need,fail,platform:()=>S,ok:(res,data,_meta,status=200)=>res.status(status).json({data})};
  registerRoles(app,shared);
  registerUsers(app,{...shared,platform:()=>S,page:(_req,rows)=>({rows,meta:{}})});
  app.get("/access",need("content:edit"),(_req,res)=>res.status(204).end());
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const call=async(method,url,body,version,actor="admin")=>{const r=await request(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{actor,"content-type":"application/json",...(version?{"if-match":version}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();return{status:r.status,...(text?JSON.parse(text):{})};};
  const route="/v2/admin/roles",grants=["settings:view","content:view"];
  assert.equal((await call("POST",route,{label:"Forbidden",permissions:[]},undefined,"staff")).status,403);
  for(const label of ["",null,"x".repeat(101)," Admin "])assert.equal((await call("POST",route,{label,permissions:grants})).status,422);
  for(const permissions of [["unknown:grant"],["content:view","content:view"],null])assert.equal((await call("POST",route,{label:"Test role",permissions})).status,422);
  const created=await call("POST",route,{label:" Review team ",permissions:grants});assert.equal(created.status,201);const role=created.data;
  assert.equal(role.label,"Review team");assert.equal(role.builtin,false);assert.equal(role.protected,false);assert.equal(role.assignedCount,0);
  assert.equal((await call("POST",route,{label:"review TEAM",permissions:grants})).status,422);
  assert.equal((await call("PATCH",route+"/"+role.key,{label:null},role.version)).status,422);
  const beforeInvalid=JSON.stringify({definitions,overrides});assert.equal((await call("PATCH",route+"/"+role.key,{label:"Renamed",permissions:["bad"]},role.version)).status,422);assert.equal(JSON.stringify({definitions,overrides}),beforeInvalid);
  const staff=(await call("GET","/v2/admin/users")).data.find(user=>user.key==="staff");
  const assigned=await call("PATCH","/v2/admin/users/2",{roles:[role.key]},staff.version);assert.equal(assigned.status,200);assert.equal((await call("GET","/access",undefined,undefined,"staff")).status,403);
  const assignedRole=(await call("GET",route)).data.find(row=>row.key===role.key);assert.notEqual(assignedRole.version,role.version);
  assert.equal((await call("PATCH",route+"/"+role.key,{label:"Review editors"},role.version)).status,412);
  const renamed=await call("PATCH",route+"/"+role.key,{label:"Review editors",permissions:[...grants,"content:edit","users:view","users:manage","roles:manage"]},assignedRole.version);assert.equal(renamed.status,200);assert.notEqual(renamed.data.version,role.version);assert.equal(renamed.data.assignedCount,1);
  assert.equal((await call("GET","/access",undefined,undefined,"staff")).status,204);
  assert.equal((await call("PATCH","/v2/admin/users/2",{roles:[]},assigned.data.version,"staff")).code,"self_lockout");
  assert.equal((await call("PATCH",route+"/wm_owner",{label:"Forged owner"},"any")).status,403);
  assert.equal((await call("DELETE",route+"/"+role.key,undefined,role.version)).status,412);
  assert.equal((await call("DELETE",route+"/"+role.key,undefined,renamed.data.version)).status,204);
  assert.equal(definitions[role.key],undefined);assert.equal(overrides[role.key],undefined);assert.equal(deletions[role.key],true);
  assert.deepEqual(identity.grants.website_manager.staff.roles,[]);assert.equal(S.db.staffAccessEpochs.staff,2);
  assert.equal((await call("GET","/access",undefined,undefined,"staff")).status,403);
  const current=(await call("GET","/v2/admin/users")).data.find(user=>user.key==="staff");assert.equal((await call("PATCH","/v2/admin/users/2",{roles:[role.key]},current.version)).status,422);
  assert.deepEqual(audit.filter(row=>row.type==="role").map(row=>row.action),["role_delete","role_update","role_create"]);
});

test("Every assigned built-in except Super admin is deletable, with current impact and persistent permission tombstones", async t => {
  const definitions={},overrides={},deletions={},audit=[];
  const users=[{id:1,key:'actor',isActive:true},...Object.keys(ROLES).filter(key=>key!=='wm_super_admin').map((key,index)=>({id:index+2,key:'person_'+key,isActive:true}))];
  const grants={actor:{roles:['wm_super_admin','wm_owner'],permissions:[]}};
  for(const user of users.slice(1)){const key=user.key.slice('person_'.length);grants[user.key]={roles:key==='wm_viewer'?[key]:[key,'wm_viewer'],permissions:[],rolePaused:true};}
  const identity={users,grants:{global:{actor:{roles:[]}},website_manager:grants},userScopes:user=>[{scope:'website_manager',roles:grants[user.key].roles}]};
  const originalAccounts=structuredClone(users),originalGlobal=structuredClone(identity.grants.global),S={db:{staffAccessEpochs:{actor:4}}};
  const app=express();app.use(express.json());
  const fail=(res,status,code)=>res.status(status).json({code});
  const need=permission=>(req,res,next)=>{const key=req.get('actor')||'actor',roles=availableRoleKeys(grants[key]?.roles??[],definitions,deletions);req.who={user:users.find(user=>user.key===key),roles,permissions:permissionsFor(roles,overrides,deletions)};return req.who.permissions.includes(permission)?next():fail(res,403,'forbidden');};
  registerRoles(app,{identity,store:{audit},definitions,overrides,deletions,platform:()=>S,need,fail,ok:(res,data,_meta,status=200)=>res.status(status).json({data})});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const call=async(method,key='',version)=>{const response=await request(`http://127.0.0.1:${server.address().port}/v2/admin/roles${key?'/'+key:''}`,{method,headers:{...(version?{'if-match':version}:{})}});const text=await response.text();return{status:response.status,...(text?JSON.parse(text):{})};};
  let roles=(await call('GET')).data;
  assert.equal(roles.find(role=>role.key==='wm_super_admin').deletable,false);
  assert.equal((await call('DELETE','wm_super_admin',roles.find(role=>role.key==='wm_super_admin').version)).code,'protected_role');
  const owner=roles.find(role=>role.key==='wm_owner');assert.equal(owner.deletable,true);assert.deepEqual(owner.deleteImpact,{assignedCount:2,usersLosingAccess:0,includesCurrentUser:true});
  grants.person_wm_owner.roles.push('wm_seo');
  assert.equal((await call('DELETE','wm_owner',owner.version)).status,412,'changed remaining assignments invalidate confirmation');
  for(const key of Object.keys(ROLES).filter(key=>key!=='wm_super_admin')){
    const before=(await call('GET')).data.find(role=>role.key===key);assert.equal(before.deletable,true);
    const impacted=Object.entries(grants).filter(([,grant])=>grant.roles.includes(key)),prior=new Map(impacted.map(([person])=>[person,S.db.staffAccessEpochs?.[person]??0]));
    assert.equal((await call('DELETE',key,before.version)).status,204,key);
    assert.equal(deletions[key],true);assert.ok(!(await call('GET')).data.some(role=>role.key===key));
    for(const [person] of impacted){assert.ok(!grants[person].roles.includes(key));assert.equal(S.db.staffAccessEpochs[person],prior.get(person)+1);if(person!=='actor')assert.equal(grants[person].rolePaused,true);}
    assert.deepEqual(permissionsFor([key],overrides,deletions),[]);
    assert.deepEqual(availableRoleKeys([key],definitions,deletions),[]);
  }
  assert.deepEqual(users,originalAccounts);assert.deepEqual(identity.grants.global,originalGlobal);assert.deepEqual(grants.actor.roles,['wm_super_admin']);
  const saved=JSON.parse(JSON.stringify(deletions));assert.deepEqual(validateRoleDeletions(saved),deletions);
  assert.deepEqual(validateRoleDefinitions({},saved),{});assert.deepEqual(validateRoleOverrides({}, {},saved),{});
  for(const bad of [{wm_super_admin:true},{wm_viewer:false},{unknown:true},{wm_custom_bad:true}])assert.throws(()=>validateRoleDeletions(bad),{code:'wm_state_unavailable'});
  assert.throws(()=>validateRoleDefinitions({wm_viewer:{label:'Revived viewer'}},saved),{code:'wm_state_unavailable'});
  assert.throws(()=>validateRoleOverrides({wm_viewer:['content:view']},{},saved),{code:'wm_state_unavailable'});
});
