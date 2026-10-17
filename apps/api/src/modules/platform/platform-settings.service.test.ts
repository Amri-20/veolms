import assert from "node:assert/strict";
import { test } from "node:test";

import type { Database } from "@veolms/database";
import type { Kysely, RawBuilder } from "kysely";

import { config } from "../../config.ts";
import { createPlatformSettingsService } from "./platform-settings.service.ts";

/**
 * Stands in for the database the repository talks to: the single settings
 * row, read whole and written whole. A write's JSON document is taken from
 * the parameter of the `::jsonb` cast the repository sends.
 */
function fakeDatabase(stored?: unknown) {
  let row: { settings: unknown; updated_at: Date } | null =
    stored === undefined
      ? null
      : { settings: stored, updated_at: new Date("2026-10-01T00:00:00Z") };
  const writes: unknown[] = [];
  const database = {
    selectFrom: () => ({
      select: () => ({
        where: () => ({ executeTakeFirst: async () => row ?? undefined }),
      }),
    }),
    insertInto: () => ({
      values: (values: { settings: RawBuilder<unknown> }) => ({
        onConflict: () => ({
          returning: () => ({
            executeTakeFirstOrThrow: async () => {
              const node = values.settings.toOperationNode() as unknown as {
                parameters: { value: string }[];
              };
              const settings: unknown = JSON.parse(node.parameters[0]!.value);
              writes.push(settings);
              row = { settings, updated_at: new Date("2026-10-17T00:00:00Z") };
              return row;
            },
          }),
        }),
      }),
    }),
  } as unknown as Kysely<Database>;
  return { database, writes };
}

await test("before anything is saved, the defaults apply and the phone rule follows the server's configuration", async () => {
  const { database } = fakeDatabase();
  const service = createPlatformSettingsService({ database });

  assert.deepEqual(await service.getSettings(), {
    settings: {
      appearance: { defaultDisplayMode: "dark", defaultColorTheme: "ocean" },
      security: {
        studentTwoFactorEnabled: true,
        requireVerifiedPhoneForEnrollment:
          config.REQUIRE_VERIFIED_PHONE_FOR_ENROLLMENT,
      },
    },
    updatedAt: null,
  });
  assert.equal(await service.isStudentTwoFactorEnabled(), true);
});

await test("a saved document fills in what it lacks, setting by setting", async () => {
  const { database } = fakeDatabase({
    appearance: { defaultDisplayMode: "light" },
    security: { studentTwoFactorEnabled: false, somethingRetired: 1 },
  });
  const service = createPlatformSettingsService({ database });

  const { settings } = await service.getSettings();
  assert.deepEqual(settings.appearance, {
    defaultDisplayMode: "light",
    defaultColorTheme: "ocean",
  });
  assert.equal(settings.security.studentTwoFactorEnabled, false);
  assert.equal(
    settings.security.requireVerifiedPhoneForEnrollment,
    config.REQUIRE_VERIFIED_PHONE_FOR_ENROLLMENT,
  );
});

await test("an appearance the contract no longer accepts falls back to the default look, not a broken page", async () => {
  const { database } = fakeDatabase({
    appearance: { defaultDisplayMode: "sepia", defaultColorTheme: "ocean" },
  });
  const service = createPlatformSettingsService({ database });

  assert.deepEqual((await service.getPublicSettings()).appearance, {
    defaultDisplayMode: "dark",
    defaultColorTheme: "ocean",
  });
});

await test("a save writes only what was set, so the phone rule keeps following the configuration", async () => {
  const { database, writes } = fakeDatabase({
    appearance: { defaultColorTheme: "grove" },
  });
  const service = createPlatformSettingsService({ database });

  const saved = await service.updateSettings(
    { security: { studentTwoFactorEnabled: false } },
    null,
  );

  assert.deepEqual(writes, [
    {
      appearance: { defaultColorTheme: "grove" },
      security: { studentTwoFactorEnabled: false },
    },
  ]);
  assert.equal(saved.settings.appearance.defaultColorTheme, "grove");
  assert.equal(saved.settings.security.studentTwoFactorEnabled, false);
  assert.equal(saved.updatedAt, "2026-10-17T00:00:00.000Z");
  // Every instance on the same database sees the save at once.
  const other = createPlatformSettingsService({ database });
  assert.equal(await other.isStudentTwoFactorEnabled(), false);
});

await test("only a change to a security setting drops the cached sign-in answers", async () => {
  const { database } = fakeDatabase();
  let dropped = 0;
  const service = createPlatformSettingsService({
    database,
    onSecuritySettingsChange: () => {
      dropped += 1;
    },
  });

  await service.updateSettings(
    { appearance: { defaultDisplayMode: "light" } },
    null,
  );
  assert.equal(dropped, 0);
  await service.updateSettings(
    { security: { studentTwoFactorEnabled: true } },
    null,
  );
  assert.equal(dropped, 0, "saving the value already in force changes nothing");
  await service.updateSettings(
    { security: { studentTwoFactorEnabled: false } },
    null,
  );
  assert.equal(dropped, 1);
});
