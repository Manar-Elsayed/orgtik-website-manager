const { createHash, randomUUID } = require("node:crypto");
const { ROLES, PERMISSIONS, permissionsFor, availableRoleKeys } = require("./permissions");
const { capabilities } = require("./users");
const codec = require("./state-codec");
const PROTECTED = new Set(["wm_owner", "wm_super_admin"]);
const CUSTOM_KEY = /^wm_custom_[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const versionOf = (label, permissions, assignments) =>
  createHash("sha256")
    .update(JSON.stringify([label, [...permissions].sort(), assignments]))
    .digest("hex");

function validateRoleDeletions(value) {
  const deletions = codec.object(value ?? {});
  for (const [key, deleted] of Object.entries(deletions)) {
    if (key === "wm_super_admin" || (!Object.hasOwn(ROLES, key) && !CUSTOM_KEY.test(key)) || deleted !== true)
      throw codec.fail("Website Manager deleted roles are invalid.");
  }
  return deletions;
}

function validateRoleDefinitions(value, deletions = {}) {
  const definitions = codec.object(value ?? {});
  for (const [key, definition] of Object.entries(definitions)) {
    if (deletions[key] || (!Object.hasOwn(ROLES, key) && !CUSTOM_KEY.test(key)) ||
      !definition || typeof definition !== "object" || Array.isArray(definition) ||
      Object.keys(definition).some(key => key !== "label") ||
      typeof definition.label !== "string" || !definition.label.trim() || definition.label.trim() !== definition.label || definition.label.length > 100)
      throw codec.fail("Website Manager role definitions are invalid.");
  }
  const labels = availableRoleKeys(Object.keys({...ROLES, ...definitions}), definitions, deletions).map(key => (definitions[key]?.label ?? ROLES[key].label).toLocaleLowerCase());
  if (new Set(labels).size !== labels.length) throw codec.fail("Website Manager role names must be unique.");
  return definitions;
}

function validateRoleOverrides(value, definitions = {}, deletions = {}) {
  const overrides = codec.object(value ?? {});
  for (const [key, permissions] of Object.entries(overrides)) {
    if (
      deletions[key] || (!Object.hasOwn(ROLES, key) && !Object.hasOwn(definitions, key)) ||
      !Array.isArray(permissions) ||
      permissions.some((p) => !PERMISSIONS.includes(p)) ||
      new Set(permissions).size !== permissions.length
    )
      throw codec.fail("Website Manager role permissions are invalid.");
  }
  for (const key of Object.keys(definitions)) {
    if (!Object.hasOwn(ROLES, key) && !Object.hasOwn(overrides, key))
      throw codec.fail("Website Manager custom role permissions are missing.");
  }
  return overrides;
}

function registerRoles(app, { identity, store, overrides, definitions = {}, deletions = {}, need, ok, fail, platform = () => require("../admin").getStore() }) {
  const keys = () => availableRoleKeys([...Object.keys(ROLES), ...Object.keys(definitions)], definitions, deletions);
  const assignments = key => {
    const people = new Map(Object.entries(identity.grants?.website_manager ?? {}).filter(([, grant]) => grant.roles?.includes(key)));
    for (const user of identity.users ?? []) {
      if (!people.has(user.key) && !Object.hasOwn(identity.grants?.website_manager ?? {}, user.key)) {
        const scope = identity.userScopes?.(user).find(scope => scope.scope === "website_manager" && scope.roles.includes(key));
        if (scope) people.set(user.key, {roles: scope.roles});
      }
    }
    return [...people].map(([person, grant]) => [person, [...grant.roles].sort(), Boolean(grant.rolePaused)]).sort(([a], [b]) => a.localeCompare(b));
  };
  const labelOf = key => definitions[key]?.label ?? ROLES[key]?.label;
  const role = (key, actorKey) => {
    const people = assignments(key), permissions = permissionsFor([key], overrides, deletions);
    return {
      key, label: labelOf(key), permissions,
      version: versionOf(labelOf(key), permissions, people),
      protected: PROTECTED.has(key),
      builtin: Object.hasOwn(ROLES, key),
      labelOverridden: Boolean(definitions[key]),
      assignedCount: people.length,
      // Owner and Super admin keep someone in charge: they can be edited, never deleted.
      deletable: !PROTECTED.has(key),
      deleteImpact: {
        assignedCount: people.length,
        usersLosingAccess: people.filter(([, roles]) => !availableRoleKeys(roles.filter(role => role !== key), definitions, deletions).length).length,
        includesCurrentUser: people.some(([person]) => person === actorKey),
      },
    };
  };
  const permissionsValid = permissions => Array.isArray(permissions) && permissions.every(p => PERMISSIONS.includes(p)) && new Set(permissions).size === permissions.length;
  const labelValid = (label, except) => typeof label === "string" && label.trim().length > 0 && label.trim().length <= 100 && !keys().some(key => key !== except && labelOf(key).toLocaleLowerCase() === label.trim().toLocaleLowerCase());
  const log = (req, key, action) => store.audit.unshift({at: new Date().toISOString(), by: req.who.user.key, type: "role", action, entry: key, targetName: labelOf(key)});
  app.get("/v2/admin/roles", need("settings:view"), (req, res) =>
    ok(res, keys().map(key => role(key, req.who.user.key))),
  );
  app.post("/v2/admin/roles", need("roles:manage"), (req, res) => {
    const { label, permissions } = req.body ?? {};
    if (!labelValid(label)) return fail(res, 422, "invalid_label", "Choose a unique role name, up to 100 characters.");
    if (!permissionsValid(permissions)) return fail(res, 422, "invalid_permissions", "Choose valid capabilities.");
    if (Object.keys(definitions).filter(key => !Object.hasOwn(ROLES, key)).length >= 100) return fail(res, 409, "role_limit", "There are too many custom roles.");
    const key = "wm_custom_" + randomUUID();
    definitions[key] = {label: label.trim()};
    overrides[key] = [...permissions].sort();
    log(req, key, "role_create");
    ok(res, role(key, req.who.user.key), {}, 201);
  });
  app.patch("/v2/admin/roles/:key", need("roles:manage"), (req, res) => {
    const key = req.params.key;
    if (!keys().includes(key))
      return fail(res, 404, "not_found", "Role not found.");
    if (PROTECTED.has(key) && !capabilities(identity, req.who.user).accounts)
      return fail(
        res,
        403,
        "suite_admin_required",
        "Only central super administrators can change this role.",
      );
    if (req.get("if-match") !== role(key).version)
      return fail(
        res,
        412,
        "stale",
        "This role changed. Reload it before saving.",
      );
    const label = Object.hasOwn(req.body ?? {}, "label") ? req.body.label : labelOf(key);
    if (!labelValid(label, key)) return fail(res, 422, "invalid_label", "Choose a unique role name, up to 100 characters.");
    const permissions = Object.hasOwn(req.body ?? {}, "permissions") ? req.body.permissions : role(key).permissions;
    if (!permissionsValid(permissions))
      return fail(
        res,
        422,
        "invalid_permissions",
        "Choose valid capabilities.",
      );
    const next = permissionsFor(req.who.roles, {
      ...overrides,
      [key]: permissions,
    }, deletions);
    if (
      ["roles:manage", "users:manage", "settings:view"].some(
        (p) => req.who.permissions.includes(p) && !next.includes(p),
      )
    )
      return fail(
        res,
        409,
        "self_lockout",
        "You cannot remove your own administration access.",
      );
    if (req.body?.label !== undefined) {
      if (ROLES[key]?.label === label.trim()) delete definitions[key];
      else definitions[key] = {label: label.trim()};
    }
    overrides[key] = [...permissions].sort();
    log(req, key, req.body?.label !== undefined ? "role_update" : "role_permissions");
    ok(res, role(key, req.who.user.key));
  });
  app.delete("/v2/admin/roles/:key", need("roles:manage"), (req, res) => {
    const key = req.params.key;
    if (!keys().includes(key)) return fail(res, 404, "not_found", "Role not found.");
    if (PROTECTED.has(key)) return fail(res, 409, "protected_role", `The ${role(key).label} role cannot be deleted.`);
    if (req.get("if-match") !== role(key).version) return fail(res, 412, "stale", "This role changed. Reload it before deleting.");
    const people = assignments(key), S = people.length ? platform() : null;
    if (people.length && !S?.db) return fail(res, 503, "staff_authority_unavailable", "Current staff authority is unavailable. Try again.");
    log(req, key, "role_delete");
    for (const [person, roles, rolePaused] of people) {
      const grants = (identity.grants ||= {}).website_manager ||= {};
      grants[person] = {...grants[person], roles: roles.filter(role => role !== key), ...(rolePaused ? {rolePaused} : {})};
      S.db.staffAccessEpochs ||= {};
      S.db.staffAccessEpochs[person] = (S.db.staffAccessEpochs[person] || 0) + 1;
    }
    delete definitions[key];
    delete overrides[key];
    deletions[key] = true;
    res.status(204).end();
  });
}
module.exports = { registerRoles, validateRoleOverrides, validateRoleDefinitions, validateRoleDeletions, PROTECTED };
