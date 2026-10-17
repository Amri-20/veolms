import { z } from "zod";
import {
  DEFAULT_PLATFORM_APPEARANCE_SETTINGS,
  PLATFORM_DISPLAY_MODES,
  type PlatformAppearanceSettings,
  type PlatformSecuritySettings,
  type PlatformSettings,
} from "./platform-settings-defaults.ts";

export * from "./platform-settings-defaults.ts";

export const platformAppearanceSettingsSchema = z.strictObject({
  defaultDisplayMode: z
    .enum(PLATFORM_DISPLAY_MODES)
    .default(DEFAULT_PLATFORM_APPEARANCE_SETTINGS.defaultDisplayMode),
  // The theme list belongs to the web app; the API only checks the id's form.
  defaultColorTheme: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,39}$/, "Choose one of the colour themes")
    .default(DEFAULT_PLATFORM_APPEARANCE_SETTINGS.defaultColorTheme)
    .meta({ example: "ocean" }),
}) satisfies z.ZodType<PlatformAppearanceSettings>;

export const platformSecuritySettingsSchema = z.strictObject({
  studentTwoFactorEnabled: z.boolean(),
  requireVerifiedPhoneForEnrollment: z.boolean(),
}) satisfies z.ZodType<PlatformSecuritySettings>;

export const platformSettingsSchema = z.strictObject({
  appearance: platformAppearanceSettingsSchema,
  security: platformSecuritySettingsSchema,
}) satisfies z.ZodType<PlatformSettings>;

export const platformSettingsResponseSchema = z.strictObject({
  settings: platformSettingsSchema,
  /** Null until an admin saves for the first time (the defaults apply). */
  updatedAt: z.string().nullable(),
});
export type PlatformSettingsResponse = z.infer<
  typeof platformSettingsResponseSchema
>;

/**
 * Changes one or more settings; what is left out keeps its saved value. Each
 * control on the Platform page saves on its own, as the Settings page does.
 */
export const updatePlatformSettingsRequestSchema = z
  .strictObject({
    appearance: z
      .strictObject({
        defaultDisplayMode: z.enum(PLATFORM_DISPLAY_MODES),
        defaultColorTheme: z
          .string()
          .regex(/^[a-z][a-z0-9-]{0,39}$/, "Choose one of the colour themes"),
      })
      .partial()
      .optional(),
    security: platformSecuritySettingsSchema.partial().optional(),
  })
  .refine(
    (value) =>
      Object.keys(value.appearance ?? {}).length > 0 ||
      Object.keys(value.security ?? {}).length > 0,
    "Nothing to change",
  );
export type UpdatePlatformSettingsRequest = z.input<
  typeof updatePlatformSettingsRequestSchema
>;

/**
 * What every visitor's browser needs before it shows a page: the default look
 * and the student rules the screens follow. Nothing in it is private.
 */
export const publicPlatformSettingsResponseSchema = platformSettingsSchema;
export type PublicPlatformSettingsResponse = PlatformSettings;
