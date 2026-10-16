import { useMemo } from "react";
import type { AdaptedCurriculum } from "../../courseCurriculumAdapter";
import type {
  LessonContentAccessState,
  LessonParticipationState,
} from "../../Discussion";
import type { AuthUser } from "../../../store/auth.store";
import type { useEnrolledCourses } from "../../../services/enrollments";
import type { useCourseOverview } from "../../../services/courses";

export interface UseLessonAccessArgs {
  isAuthenticated: boolean;
  resolvedAuthUser: AuthUser | null;
  isAuthResolutionPending: boolean;
  enrolledCoursesQuery: ReturnType<typeof useEnrolledCourses>;
  courseOverview: ReturnType<typeof useCourseOverview>["data"];
  selectedLesson: number;
  adaptedCurriculum: AdaptedCurriculum | null;
}

export interface UseLessonAccessResult {
  lessonContentAccess: LessonContentAccessState;
  lockedLessonNumbers: ReadonlySet<number>;
  lessonContentAccessReason: "login" | "access" | null;
  lessonParticipationState: LessonParticipationState;
  canParticipateInLessonDiscussion: boolean;
}

export function useLessonAccess({
  isAuthenticated,
  resolvedAuthUser,
  isAuthResolutionPending,
  enrolledCoursesQuery,
  courseOverview,
  selectedLesson,
  adaptedCurriculum,
}: UseLessonAccessArgs): UseLessonAccessResult {
  const lessonContentAccess = useMemo<LessonContentAccessState>(() => {
    if (!courseOverview || !adaptedCurriculum) return "pending";

    const lesson = adaptedCurriculum.lessonsByNumber.get(selectedLesson);
    if (!lesson) return "pending";

    // Anyone may read a published lesson's discussions, enrolled or not and
    // signed in or not, so they do not wait to learn who the visitor is:
    // they load alongside the rest of the lesson. Taking part is another
    // matter (`lessonParticipationState`).
    const isPublicLesson =
      courseOverview.course.status === "published" && lesson.isPublished;
    if (isPublicLesson) return "granted";
    if (isAuthResolutionPending) return "pending";
    if (!isAuthenticated) return "denied";

    const isCourseOwner =
      resolvedAuthUser?.id === courseOverview.course.creatorId;
    const isAdmin = resolvedAuthUser?.roles?.some(
      (role) => role.trim().toLowerCase() === "admin",
    );
    if (isCourseOwner || isAdmin) return "granted";
    if (!enrolledCoursesQuery.isFetched) return "pending";

    return enrolledCoursesQuery.data?.courses.some(
      (course) => course.courseId === courseOverview.course.id,
    )
      ? "granted"
      : "denied";
  }, [
    adaptedCurriculum,
    courseOverview,
    enrolledCoursesQuery.data?.courses,
    enrolledCoursesQuery.isFetched,
    isAuthResolutionPending,
    isAuthenticated,
    resolvedAuthUser?.id,
    resolvedAuthUser?.roles,
    selectedLesson,
  ]);
  /**
   * The lessons this visitor cannot play, by the same rules the server
   * applies to video: a free preview is open to everyone; a free course is
   * open to anyone signed in, and its first lesson to everyone; anything
   * else needs access to the course. Nothing is marked while the session or
   * the visitor's courses are still loading, so locks never flash on and off.
   */
  const lockedLessonNumbers = useMemo<ReadonlySet<number>>(() => {
    const locked = new Set<number>();
    if (!courseOverview || !adaptedCurriculum || isAuthResolutionPending) {
      return locked;
    }
    const isCourseOwner =
      resolvedAuthUser?.id === courseOverview.course.creatorId;
    const isAdmin = resolvedAuthUser?.roles?.some(
      (role) => role.trim().toLowerCase() === "admin",
    );
    if (isCourseOwner || isAdmin) return locked;

    const isFreeCourse = courseOverview.pricing?.pricingType === "free";
    if (isFreeCourse && isAuthenticated) return locked;
    if (!isFreeCourse && isAuthenticated) {
      if (!enrolledCoursesQuery.isFetched) return locked;
      const hasCourse = enrolledCoursesQuery.data?.courses.some(
        (course) => course.courseId === courseOverview.course.id,
      );
      if (hasCourse) return locked;
    }

    const firstLessonNumber = Math.min(
      ...adaptedCurriculum.lessonsByNumber.keys(),
    );
    for (const [number, lesson] of adaptedCurriculum.lessonsByNumber) {
      if (lesson.isPreview) continue;
      if (isFreeCourse && number === firstLessonNumber) continue;
      locked.add(number);
    }
    return locked;
  }, [
    adaptedCurriculum,
    courseOverview,
    enrolledCoursesQuery.data?.courses,
    enrolledCoursesQuery.isFetched,
    isAuthResolutionPending,
    isAuthenticated,
    resolvedAuthUser?.id,
    resolvedAuthUser?.roles,
  ]);
  const lessonContentAccessReason =
    lessonContentAccess === "denied"
      ? isAuthenticated
        ? "access"
        : "login"
      : null;
  const lessonParticipationState = useMemo<LessonParticipationState>(() => {
    if (isAuthResolutionPending || !courseOverview || !adaptedCurriculum) {
      return "pending";
    }

    if (!isAuthenticated) return "denied";

    const isCourseOwner =
      resolvedAuthUser?.id === courseOverview.course.creatorId;
    const isAdmin = resolvedAuthUser?.roles?.some(
      (role) => role.trim().toLowerCase() === "admin",
    );
    if (isCourseOwner || isAdmin) return "granted";
    if (!enrolledCoursesQuery.isFetched) return "pending";

    return enrolledCoursesQuery.data?.courses.some(
      (course) => course.courseId === courseOverview.course.id,
    )
      ? "granted"
      : "denied";
  }, [
    adaptedCurriculum,
    courseOverview,
    enrolledCoursesQuery.data?.courses,
    enrolledCoursesQuery.isFetched,
    isAuthResolutionPending,
    isAuthenticated,
    resolvedAuthUser?.id,
    resolvedAuthUser?.roles,
  ]);
  const canParticipateInLessonDiscussion =
    lessonContentAccess === "granted" && lessonParticipationState === "granted";
  return {
    lessonContentAccess,
    lockedLessonNumbers,
    lessonContentAccessReason,
    lessonParticipationState,
    canParticipateInLessonDiscussion,
  };
}
