import { useCallback, useMemo } from "react";
import { useLessonDescription } from "../../../services/courses";
import type { AdaptedCurriculum } from "../../courseCurriculumAdapter";
import {
  resolveLessonDescriptionState,
  type LessonDescriptionState,
} from "../../lessonWithoutVideo";
import type { useCourseOverview } from "../../../services/courses";
import type { useCourseQuizAssignments } from "../../../services/quizzes/quizzes.queries";
import type { CourseLesson } from "@veolms/contracts";
import type { ApiError } from "../../../lib/api-error";

export interface UseLessonDescriptionStateArgs {
  isApiRoute: boolean;
  courseOverview: ReturnType<typeof useCourseOverview>["data"];
  courseOverviewError: ApiError | null;
  isCourseOverviewError: boolean;
  isCourseOverviewFetching: boolean;
  refetchCourseOverview: ReturnType<typeof useCourseOverview>["refetch"];
  selectedLesson: number;
  adaptedCurriculum: AdaptedCurriculum | null;
  firstCurriculumLessonId: number | undefined;
  courseQuizAssignments: ReturnType<typeof useCourseQuizAssignments>;
  hasLessonQuiz: (lessonNumber: number) => boolean;
  retryPlaybackBootstrap: () => void;
}

export interface UseLessonDescriptionStateResult {
  courseUnavailable: "failed" | "not-found" | "no-lessons" | null;
  retryCourseOverview: () => void;
  selectedLessonQuizAttached: boolean | undefined;
  stageLesson: CourseLesson | undefined;
  isLessonDescriptionPending: boolean;
  lessonDescriptionState: LessonDescriptionState;
  retryLessonDescription: () => void;
}

export function useLessonDescriptionState({
  isApiRoute,
  courseOverview,
  courseOverviewError,
  isCourseOverviewError,
  isCourseOverviewFetching,
  refetchCourseOverview,
  selectedLesson,
  adaptedCurriculum,
  firstCurriculumLessonId,
  courseQuizAssignments,
  hasLessonQuiz,
  retryPlaybackBootstrap,
}: UseLessonDescriptionStateArgs): UseLessonDescriptionStateResult {
  // There is no lesson to show: the course did not load (a wrong address,
  // or a course that has been unpublished), or it has no lessons. The page
  // used to carry on as if a lesson were there, with an empty title, a video
  // that could only be retried in vain and discussions that never finished
  // checking access. A lesson opened from a discussion link is no
  // different: it used to keep the whole page up around a course it did
  // not have, with the course's id for a title.
  //
  // "not-found" is the server saying there is no such course; "failed" is
  // everything else (the server could not be reached, or it failed), where
  // the course may well be there and trying again is the thing to do.
  const courseUnavailable: "not-found" | "failed" | "no-lessons" | null =
    !isApiRoute
      ? null
      : isCourseOverviewError && !isCourseOverviewFetching && !courseOverview
        ? courseOverviewError?.status === 404
          ? "not-found"
          : "failed"
        : courseOverview && firstCurriculumLessonId === undefined
          ? "no-lessons"
          : null;
  const retryCourseOverview = useCallback(() => {
    // The video was asked for while the course was failing, so it is asked
    // for again along with the course.
    retryPlaybackBootstrap();
    void refetchCourseOverview();
  }, [refetchCourseOverview, retryPlaybackBootstrap]);

  // What stands where the video goes, whether the server is asked for one,
  // and whether opening the lesson finishes it. A lesson the course lists
  // with no video (a quiz lesson whose quiz was deleted, for one) is asked
  // for none; see `lessonWithoutVideo`.
  const selectedLessonQuizAttached = hasLessonQuiz(selectedLesson)
    ? true
    : courseQuizAssignments.data === undefined
      ? undefined
      : false;
  const overviewLesson = adaptedCurriculum?.lessonsByNumber.get(selectedLesson);
  // The open lesson's description comes from its own request. The overview's
  // copy is shown until that answers, and kept if it fails; once the
  // overview stops carrying descriptions, this is the only source.
  const lessonDescriptionQuery = useLessonDescription(
    courseOverview?.course.id,
    overviewLesson?.id,
  );
  const fetchedLessonDescription = lessonDescriptionQuery.data;
  // The lesson as the course lists it: what the stage is planned from, and
  // where a reading lesson's text comes from.
  const stageLesson = useMemo(() => {
    if (
      !overviewLesson ||
      !fetchedLessonDescription ||
      fetchedLessonDescription.lessonId !== overviewLesson.id ||
      fetchedLessonDescription.description ===
        (overviewLesson.description ?? null)
    ) {
      return overviewLesson;
    }
    return {
      ...overviewLesson,
      description: fetchedLessonDescription.description,
    };
  }, [fetchedLessonDescription, overviewLesson]);
  // An overview with no description on any lesson may be one that no longer
  // carries them, so the open lesson's is not known until its request ends.
  const overviewCarriesLessonDescriptions = useMemo(() => {
    for (const lesson of adaptedCurriculum?.lessonsByNumber.values() ?? []) {
      if (lesson.description) return true;
    }
    return false;
  }, [adaptedCurriculum]);
  const isLessonDescriptionPending =
    lessonDescriptionQuery.isLoading && !overviewCarriesLessonDescriptions;
  // Whether the open lesson's description is known. A lesson with no video
  // is its description, so its stage and its completion wait for this.
  const lessonDescriptionState = resolveLessonDescriptionState({
    overviewCarriesDescriptions: overviewCarriesLessonDescriptions,
    request: !(courseOverview?.course.id && overviewLesson?.id)
      ? "idle"
      : fetchedLessonDescription !== undefined
        ? "answered"
        : lessonDescriptionQuery.isError && !lessonDescriptionQuery.isFetching
          ? "failed"
          : "loading",
  });
  const refetchLessonDescription = lessonDescriptionQuery.refetch;
  const retryLessonDescription = useCallback(() => {
    void refetchLessonDescription();
  }, [refetchLessonDescription]);
  return {
    courseUnavailable,
    retryCourseOverview,
    selectedLessonQuizAttached,
    stageLesson,
    isLessonDescriptionPending,
    lessonDescriptionState,
    retryLessonDescription,
  };
}
