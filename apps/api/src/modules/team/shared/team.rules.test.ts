import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../../../lib/errors.ts";
import {
  assertCanHandleRoles,
  assertEditableRole,
  assertKeepsAnAdmin,
  assertNoSelfLockout,
  assertRoleUnused,
  diffRoleIds,
  isReservedRoleName,
  type Actor,
} from "./team.rules.ts";

function actor(roleNames: string[], permissions: string[]): Actor {
  return { userId: "actor", roleNames, permissions: new Set(permissions) };
}

function rejectsWith(code: string, run: () => void) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, code);
    return true;
  });
}

const couponManager = {
  name: "Coupon manager",
  permissions: ["coupon.read", "coupon.manage"],
};

test("an admin may hand out any role, admin included", () => {
  const admin = actor(["admin"], []);
  assertCanHandleRoles(admin, [
    couponManager,
    { name: "admin", permissions: [] },
  ]);
});

test("a member may hand out a role whose permissions they all hold", () => {
  const manager = actor(
    ["team_lead"],
    ["coupon.read", "coupon.manage", "role.assign"],
  );
  assertCanHandleRoles(manager, [couponManager]);
});

test("a member may not hand out a permission they lack", () => {
  const manager = actor(["team_lead"], ["coupon.read", "role.assign"]);
  rejectsWith("PRIVILEGE_ESCALATION", () =>
    assertCanHandleRoles(manager, [couponManager]),
  );
});

test("only an admin hands out or takes away admin", () => {
  const everything = actor(["team_lead"], ["coupon.read", "role.assign"]);
  rejectsWith("PRIVILEGE_ESCALATION", () =>
    assertCanHandleRoles(everything, [{ name: "Admin", permissions: [] }]),
  );
});

test("the last admin cannot go", () => {
  rejectsWith("LAST_ADMIN", () => assertKeepsAnAdmin(0));
  assertKeepsAnAdmin(1);
});

test("you cannot take away your own team or role permissions", () => {
  const now = new Set(["team.read", "role.assign", "coupon.read"]);
  rejectsWith("SELF_LOCKOUT", () =>
    assertNoSelfLockout(now, new Set(["team.read", "coupon.read"])),
  );
  // Losing other permissions is your own business.
  assertNoSelfLockout(now, new Set(["team.read", "role.assign"]));
});

test("built-in roles cannot be changed", () => {
  rejectsWith("ROLE_IS_SYSTEM", () => assertEditableRole({ isSystem: true }));
  assertEditableRole({ isSystem: false });
});

test("a role in use cannot be deleted", () => {
  rejectsWith("ROLE_IN_USE", () => assertRoleUnused(2));
  assertRoleUnused(0);
});

test("custom roles cannot take an admin-looking name", () => {
  for (const name of ["admin", " Admin ", "Administrator", "student"]) {
    assert.equal(isReservedRoleName(name), true, name);
  }
  assert.equal(isReservedRoleName("Support"), false);
});

test("diffRoleIds splits a full replace", () => {
  assert.deepEqual(diffRoleIds(["a", "b"], ["b", "c", "c"]), {
    added: ["c"],
    removed: ["a"],
  });
});
