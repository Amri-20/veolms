/**
 * The academy-wide settings an administrator manages on the Platform page,
 * and what applies before anything is saved. Kept free of dependencies (no
 * zod) so the web app's startup code can read the defaults without loading
 * the schemas; `platform-settings.ts` validates the same shapes.
 */

export const PLATFORM_DISPLAY_MODES = ["light", "dark", "device"] as const;
export type PlatformDisplayMode = (typeof PLATFORM_DISPLAY_MODES)[number];

export interface PlatformAppearanceSettings {
  /**
   * What everyone sees until they pick their own in Settings: light, dark,
   * or whatever their device is set to.
   */
  defaultDisplayMode: PlatformDisplayMode;
  /**
   * The colour theme everyone sees until they pick their own. One of the web
   * app's theme ids; an id it does not know falls back to its first theme.
   */
  defaultColorTheme: string;
}

export interface PlatformSecuritySettings {
  /**
   * Students may turn on two-factor sign-in and are asked for it when they
   * sign in. When off, students are never asked for a second step and cannot
   * turn it on. Admins and instructors always need it.
   */
  studentTwoFactorEnabled: boolean;
  /** Enrolling in a course, free or paid, needs a verified mobile number. */
  requireVerifiedPhoneForEnrollment: boolean;
}

export interface PlatformSettings {
  appearance: PlatformAppearanceSettings;
  security: PlatformSecuritySettings;
}

export const DEFAULT_PLATFORM_APPEARANCE_SETTINGS: PlatformAppearanceSettings =
  {
    defaultDisplayMode: "dark",
    defaultColorTheme: "ocean",
  };
