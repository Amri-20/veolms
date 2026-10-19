/**
 * Which permissions open each staff page (any one of them). Pages not listed
 * are open to everyone on the team. The sidebar and the route guard both read
 * this, so a page is never in the menu yet refused, or the other way round.
 *
 * Kept free of imports: the route guard is in the startup path, and the
 * contracts barrel would bring zod with it, hence plain strings.
 */
export const NAVIGATION_PERMISSIONS: Readonly<
  Record<string, readonly string[]>
> = {
  "/orders": ["billing.read"],
  "/coupons": ["coupon.read"],
  "/students": ["student.read"],
  "/analytics": ["analytics.course.read", "analytics.revenue.read"],
  "/platform": [
    "platform.settings.read",
    "platform.settings.update",
    "platform.branding.update",
    "platform.homepage.update",
  ],
  "/team": ["team.read", "role.read"],
};

/** "/coupons/abc" → "/coupons". */
export function navigationRoot(path: string): string {
  return `/${path.split(/[?#]/, 1)[0]?.split("/")[1] ?? ""}`;
}

export function canOpenNavigationPath(
  path: string,
  permissions: ReadonlySet<string>,
  roles: readonly string[] = [],
): boolean {
  const root = navigationRoot(path);
  // Instructors see their own courses' orders without billing.read.
  if (
    root === "/orders" &&
    roles.some((role) => role.trim().toLowerCase() === "instructor")
  ) {
    return true;
  }
  const required = NAVIGATION_PERMISSIONS[root];
  return !required || required.some((key) => permissions.has(key));
}
