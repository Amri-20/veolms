import { ADMIN_ROLE, STUDENT_ROLE } from "./auth.constants.ts";

export function isMfaMandatoryAccount(
  storedFlag: boolean,
  roles: readonly string[] | null | undefined,
  options?: { skipAdminMfa?: boolean },
): boolean {
  const isAdmin = Boolean(
    roles?.some((role) => role.toLowerCase() === ADMIN_ROLE),
  );
  if (options?.skipAdminMfa && isAdmin) {
    return false;
  }

  if (storedFlag) {
    return true;
  }

  return isStaffAccount(roles);
}

/**
 * Anyone holding a role other than student (admins, instructors and every
 * team role, custom ones included): two-factor sign-in is always required of
 * them, whatever the academy decides for students.
 */
export function isStaffAccount(
  roles: readonly string[] | null | undefined,
): boolean {
  return Boolean(roles?.some((role) => role.toLowerCase() !== STUDENT_ROLE));
}

export function sessionNeedsMfaChallenge(input: {
  mfaMandatory: boolean;
  totpEnabled: boolean;
  passkeyEnabled: boolean;
  mfaVerified: boolean;
}): boolean {
  const hasFactor = input.totpEnabled || input.passkeyEnabled;

  if (input.mfaMandatory && !hasFactor) {
    return true;
  }

  return hasFactor && !input.mfaVerified;
}
