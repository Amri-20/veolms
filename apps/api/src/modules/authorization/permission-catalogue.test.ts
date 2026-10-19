import assert from "node:assert/strict";
import { test } from "node:test";
import {
  permissionCatalogue,
  permissions,
  withImpliedPermissions,
} from "@veolms/contracts";

await test("every permission belongs to exactly one catalogue group", () => {
  const seen = new Map<string, string>();
  for (const group of permissionCatalogue) {
    for (const { key } of group.entries) {
      assert.ok(
        !seen.has(key),
        `${key} is in both "${seen.get(key)}" and "${group.area}"`,
      );
      seen.set(key, group.area);
    }
  }
  const missing = permissions.filter((key) => !seen.has(key));
  assert.deepEqual(missing, [], "permissions missing from the catalogue");
});

await test("implies only names known keys, never the key itself", () => {
  const known = new Set<string>(permissions);
  for (const group of permissionCatalogue) {
    for (const item of group.entries) {
      for (const implied of item.implies) {
        assert.ok(known.has(implied), `${item.key} implies unknown ${implied}`);
        assert.notEqual(implied, item.key, `${item.key} implies itself`);
      }
    }
  }
});

await test("withImpliedPermissions follows implies transitively", () => {
  assert.deepEqual(
    [...withImpliedPermissions(["submission.grade.override"])].sort(),
    ["submission.grade", "submission.grade.override", "submission.read"],
  );
  assert.deepEqual([...withImpliedPermissions(["lesson.create"])].sort(), [
    "course.read",
    "lesson.create",
    "lesson.read",
  ]);
});

await test("permission keys are unique", () => {
  assert.equal(new Set(permissions).size, permissions.length);
});
