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
