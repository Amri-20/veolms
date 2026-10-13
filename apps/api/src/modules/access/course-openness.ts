/**
 * Whether a course is open without a grant: it is free and not
 * access-restricted. A restricted course needs a grant even when it costs
 * nothing. A course with no pricing yet is not open.
 */
export function isOpenFreeCourse(course: {
  pricing_type: string | null | undefined;
  access_type: string | null | undefined;
}): boolean {
  return course.pricing_type === "free" && course.access_type !== "restricted";
}

/**
 * Whether a course is one nobody may take for themselves: it is
 * access-restricted and has no price to pay. Such a course is entered only
 * by a grant that staff give.
 *
 * Checkout asks this before it prices a course. Enrolling in a course that
 * costs nothing creates a grant, so without the question a restricted free
 * course could be opened by anyone who posted a checkout for it, and every
 * check that asks "does the viewer hold a grant" then let them in.
 *
 * "No price to pay" follows checkout's own reading, not `isOpenFreeCourse`'s:
 * checkout charges nothing for any course that is not priced as paid, a
 * course with no pricing row included. A restricted course that is sold is
 * not covered: buying it is how its grant is obtained.
 */
export function isRestrictedFreeCourse(course: {
  pricing_type: string | null | undefined;
  access_type: string | null | undefined;
}): boolean {
  return course.access_type === "restricted" && course.pricing_type !== "paid";
}
