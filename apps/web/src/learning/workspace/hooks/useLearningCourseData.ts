import { useCallback, useMemo } from "react";
import { ALLOW_GUEST_LEARNING } from "../../../routing/routeAccess";
import {
  canPlayCourseLesson,
  getPublicPreviewLessonNumbers,
} from "../../coursePlayerAccess";
import { useAuthStore } from "../../../store/auth.store";
import { useCourseOverview } from "../../../services/courses";
import { useCurrentUser } from "../../../services/auth";
import { useEnrolledCourses } from "../../../services/enrollments";
import type { InteractionCapabilities } from "../../Discussion";
import type { AuthUser } from "../../../store/auth.store";
import type { ApiError } from "../../../lib/api-error";

export interface UseLearningCourseDataArgs {
  courseSlug: string | undefined;
}

export interface UseLearningCourseDataResult {
  isAuthenticated: boolean;
  resolvedAuthUser: AuthUser | null;
  isAuthResolutionPending: boolean;
  enrolledCoursesQuery: ReturnType<typeof useEnrolledCourses>;
  isApiRoute: boolean;
  courseOverview: ReturnType<typeof useCourseOverview>["data"];
  isCourseOverviewLoading: boolean;
  isCourseOverviewError: boolean;
  courseOverviewError: ApiError | null;
  isCourseOverviewFetching: boolean;
  refetchCourseOverview: ReturnType<typeof useCourseOverview>["refetch"];
  isInteractionCapabilitiesLoading: boolean;
  interactionCapabilities: InteractionCapabilities;
  isLessonAvailable: (lessonNumber: number) => boolean;
  lessonStorageKey: string;
}

export function useLearningCourseData({
  courseSlug,
}: UseLearningCourseDataArgs): UseLearningCourseDataResult {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storedAuthUser = useAuthStore((state) => state.user);
  const { data: currentUser, isFetched: isCurrentUserFetched } =
    useCurrentUser();
  const resolvedAuthUser =
    currentUser === undefined ? storedAuthUser : currentUser;
  const isAuthResolutionPending = !isCurrentUserFetched && !storedAuthUser;
  const enrolledCoursesQuery = useEnrolledCourses({
    enabled: isAuthenticated,
  });
  const isApiRoute = Boolean(courseSlug);
  const {
    data: courseOverview,
    isLoading: isCourseOverviewLoading,
    isError: isCourseOverviewError,
    error: courseOverviewError,
    isFetching: isCourseOverviewFetching,
    refetch: refetchCourseOverview,
  } = useCourseOverview(courseSlug, {
    enabled: isApiRoute,
  });
  const isInteractionCapabilitiesLoading =
    isApiRoute && isCourseOverviewLoading && !courseOverview;
  const allowComments = courseOverview?.settings?.allowComments ?? true;
  const allowNotes = courseOverview?.settings?.allowNotes ?? true;
  const allowQa = courseOverview?.settings?.allowQa ?? true;

  const interactionCapabilities: InteractionCapabilities = useMemo(() => {
    return {
      allowComments,
      allowNotes,
      allowQa,
    };
  }, [allowComments, allowNotes, allowQa]);
  const publicPreviewLessonNumbers = useMemo(
    () => getPublicPreviewLessonNumbers(courseOverview),
    [courseOverview],
  );
  const publicPreviewLessonSet = useMemo(
    () => new Set(publicPreviewLessonNumbers),
    [publicPreviewLessonNumbers],
  );
  const isLessonAvailable = useCallback(
    (lessonNumber: number) =>
      canPlayCourseLesson({
        allowGuestLearning: ALLOW_GUEST_LEARNING,
        isAuthenticated,
        lessonNumber,
        publicPreviewLessonNumbers: publicPreviewLessonSet,
      }),
    [isAuthenticated, publicPreviewLessonSet],
  );
  const lessonStorageKey = `veolms-last-lesson-${encodeURIComponent(courseSlug || "default")}`;
  return {
    isAuthenticated,
    resolvedAuthUser,
    isAuthResolutionPending,
    enrolledCoursesQuery,
    isApiRoute,
    courseOverview,
    isCourseOverviewLoading,
    isCourseOverviewError,
    courseOverviewError,
    isCourseOverviewFetching,
    refetchCourseOverview,
    isInteractionCapabilitiesLoading,
    interactionCapabilities,
    isLessonAvailable,
    lessonStorageKey,
  };
}
