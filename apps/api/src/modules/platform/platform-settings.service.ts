import {
  DEFAULT_PLATFORM_APPEARANCE_SETTINGS,
  platformAppearanceSettingsSchema,
  type PlatformSettings,
  type PlatformSettingsResponse,
  type UpdatePlatformSettingsRequest,
} from "@veolms/contracts";
import type { Database } from "@veolms/database";
import type { Kysely } from "kysely";
import { config } from "../../config.ts";
import { httpError } from "../../lib/errors.ts";
import {
  findPlatformSettings,
  isMissingPlatformSettingsTable,
  savePlatformSettings,
} from "./platform-settings.repository.ts";

/**
 * The student sign-in rule is read on signed-in requests, so the settings
 * are kept in memory for a short while instead of being read each time. A
 * save replaces them at once in this process; any other API process sees the
 * change within this time.
 */
const SETTINGS_CACHE_MS = 30_000;

type StoredDocument = Record<string, Record<string, unknown>>;

interface StoredSettings {
  /** Only what an admin has set; anything missing follows its default. */
  document: StoredDocument;
  settings: PlatformSettings;
  updatedAt: Date | null;
}

interface CachedSettings {
  expiresAt: number;
  value: Promise<StoredSettings>;
}

// One copy per database for every service instance: the auth module builds
// its own instance for each route plugin, and all of them must see a save at
// once.
const cachedSettings = new WeakMap<object, CachedSettings>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDocument(value: unknown): StoredDocument {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]),
    ),
  );
}

/**
 * The settings in force: each one saved by an admin, or its default. A
 * document written by another version of the contract keeps what still
 * reads correctly, setting by setting, rather than failing the page.
 */
function resolveSettings(document: StoredDocument): PlatformSettings {
  const appearance = platformAppearanceSettingsSchema.safeParse(
    document.appearance ?? {},
  );
  const security = document.security ?? {};
  return {
    appearance: appearance.success
      ? appearance.data
      : DEFAULT_PLATFORM_APPEARANCE_SETTINGS,
    security: {
      studentTwoFactorEnabled:
        typeof security.studentTwoFactorEnabled === "boolean"
          ? security.studentTwoFactorEnabled
          : true,
      // Until an admin decides, the server's configuration does.
      requireVerifiedPhoneForEnrollment:
        typeof security.requireVerifiedPhoneForEnrollment === "boolean"
          ? security.requireVerifiedPhoneForEnrollment
          : config.REQUIRE_VERIFIED_PHONE_FOR_ENROLLMENT,
    },
  };
}

function toResponse(stored: StoredSettings): PlatformSettingsResponse {
  return {
    settings: stored.settings,
    updatedAt: stored.updatedAt?.toISOString() ?? null,
  };
}

export interface PlatformSettingsService {
  getSettings(): Promise<PlatformSettingsResponse>;
  /** The same settings, for every visitor: nothing in them is private. */
  getPublicSettings(): Promise<PlatformSettings>;
  updateSettings(
    changes: UpdatePlatformSettingsRequest,
    updatedBy: string | null,
  ): Promise<PlatformSettingsResponse>;
  isStudentTwoFactorEnabled(): Promise<boolean>;
  requiresVerifiedPhoneForEnrollment(): Promise<boolean>;
}

export function createPlatformSettingsService({
  database,
  onSecuritySettingsChange,
}: {
  database: Kysely<Database>;
  /**
   * Called after a save that changed a security setting, so that signed-in
   * requests stop using answers worked out under the old rules.
   */
  onSecuritySettingsChange?: () => void;
}): PlatformSettingsService {
  async function loadSettings(): Promise<StoredSettings> {
    let row: Awaited<ReturnType<typeof findPlatformSettings>>;
    try {
      row = await findPlatformSettings(database);
    } catch (error) {
      // Until the settings migration has run there is nothing to read, and
      // every page and sign-in must keep working on the defaults.
      if (!isMissingPlatformSettingsTable(error)) throw error;
      row = null;
    }
    const document = readDocument(row?.settings);
    return {
      document,
      settings: resolveSettings(document),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  function readSettings(): Promise<StoredSettings> {
    const now = Date.now();
    const cached = cachedSettings.get(database);
    if (cached && cached.expiresAt > now) return cached.value;
    const value = loadSettings();
    const entry = { expiresAt: now + SETTINGS_CACHE_MS, value };
    cachedSettings.set(database, entry);
    // A failed read is not kept: the next request tries again.
    value.catch(() => {
      if (cachedSettings.get(database) === entry) {
        cachedSettings.delete(database);
      }
    });
    return value;
  }

  async function updateSettings(
    changes: UpdatePlatformSettingsRequest,
    updatedBy: string | null,
  ): Promise<PlatformSettingsResponse> {
    // Read fresh, so a change saved by another process is not written over.
    cachedSettings.delete(database);
    const current = await readSettings();
    // Only the settings named in the request are written; the others keep
    // following their defaults (the phone rule follows the server's
    // configuration until an admin sets it here).
    const document: StoredDocument = {
      ...current.document,
      ...(changes.appearance
        ? {
            appearance: {
              ...current.document.appearance,
              ...changes.appearance,
            },
          }
        : {}),
      ...(changes.security
        ? { security: { ...current.document.security, ...changes.security } }
        : {}),
    };

    let row: Awaited<ReturnType<typeof savePlatformSettings>>;
    try {
      row = await savePlatformSettings(database, {
        settings: document,
        updatedBy,
      });
    } catch (error) {
      if (!isMissingPlatformSettingsTable(error)) throw error;
      throw httpError(
        503,
        "PLATFORM_SETTINGS_UNAVAILABLE",
        "Platform settings cannot be saved until the database is updated.",
      );
    }

    const saved: StoredSettings = {
      document: readDocument(row.settings),
      settings: resolveSettings(readDocument(row.settings)),
      updatedAt: row.updatedAt,
    };
    cachedSettings.set(database, {
      expiresAt: Date.now() + SETTINGS_CACHE_MS,
      value: Promise.resolve(saved),
    });
    if (
      JSON.stringify(saved.settings.security) !==
      JSON.stringify(current.settings.security)
    ) {
      onSecuritySettingsChange?.();
    }
    return toResponse(saved);
  }

  return {
    getSettings: async () => toResponse(await readSettings()),
    getPublicSettings: async () => (await readSettings()).settings,
    updateSettings,
    isStudentTwoFactorEnabled: async () =>
      (await readSettings()).settings.security.studentTwoFactorEnabled,
    requiresVerifiedPhoneForEnrollment: async () =>
      (await readSettings()).settings.security
        .requireVerifiedPhoneForEnrollment,
  };
}
