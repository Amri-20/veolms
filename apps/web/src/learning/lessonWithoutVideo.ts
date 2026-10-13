import type { CourseLesson } from "@veolms/contracts";

/**
 * A lesson with no video.
 *
 * Deleting a quiz (or its assignment), or changing a quiz lesson's type,
 * leaves the lesson published as a video lesson with no video attached. The
 * lesson page used to treat it as any other video: it asked the server for
 * playback, was told `MEDIA_NOT_FOUND`, and showed the answer as a failure.
 * Nothing ever played, so the lesson could not be finished and the course
 * could not reach 100%.
 *
 * The course overview already says which lessons have a video
 * (`contentMediaId`). From it the page decides here, for every way a lesson
 * can come to have none: it asks for no playback, says plainly that the
 * lesson has no video, and counts the lesson finished once a learner who has
 * the course opens it, since its title, description and resources are all
 * there is to it.
 */

type LessonContent = Pick<CourseLesson, "contentType" | "contentMediaId">;
type LessonReadingContent = LessonContent & Pick<CourseLesson, "description">;

/**
 * True when the course lists the lesson with no media. `null` is the
 * server's "none attached"; a lesson whose record is not known yet (the
 * course is still loading) or does not say is treated as having a video.
 */
export function lessonHasNoVideo(
  lesson: LessonContent | null | undefined,
): boolean {
  return (
    lesson !== null && lesson !== undefined && lesson.contentMediaId === null
  );
}

export interface LessonStagePlan {
  /** What stands where the lesson's video goes. */
  stage: "quiz" | "video" | "no-video-notice";
  /** Whether the page asks the server for the lesson's video. */
  requestsPlayback: boolean;
  /** Whether opening the lesson is all there is to finishing it. */
  completesWhenOpened: boolean;
}

export interface LessonStageInput {
  /** The lesson as the course overview lists it; absent while that loads. */
  lesson: LessonContent | null | undefined;
  /** The quiz view is open in place of the video. */
  showingQuiz: boolean;
  /**
   * Whether a quiz is attached to the lesson; `undefined` while the course's
   * quiz assignments are not known yet.
   */
  hasQuiz: boolean | undefined;
  /** See `viewerMayRecordProgress`. */
  viewerMayRecordProgress: boolean;
}

export function planLessonStage({
  lesson,
  showingQuiz,
  hasQuiz,
  viewerMayRecordProgress,
}: LessonStageInput): LessonStagePlan {
  const noVideo = lessonHasNoVideo(lesson);
  return {
    stage: showingQuiz ? "quiz" : noVideo ? "no-video-notice" : "video",
    // A lesson with no media has nothing to play whichever view is open, a
    // quiz lesson included: the request could only come back "not found".
    requestsPlayback: !noVideo,
    // A quiz is finished by passing it, and the server checks that. A
    // lesson that still has a quiz attached is not finished by looking at
    // it either, so nothing is recorded until it is known to have none.
    completesWhenOpened:
      noVideo &&
      lesson?.contentType !== "quiz" &&
      !showingQuiz &&
      hasQuiz === false &&
      viewerMayRecordProgress,
  };
}

/**
 * Whether the server accepts lesson progress from this viewer, by the rule
 * its progress endpoint applies: the course's creator and an admin always;
 * anyone else must be signed in, and must hold the course when it is sold
 * or access-restricted. False while any of that is still loading, so
 * nothing is recorded on a guess and then refused.
 */
export function viewerMayRecordProgress(input: {
  isAuthenticated: boolean;
  managesCourse: boolean;
  /** `undefined` while the viewer's courses are loading. */
  holdsCourse: boolean | undefined;
  /** The overview's pricing type; absent for a course with no pricing. */
  pricingType: "free" | "paid" | null | undefined;
  /** The overview's `canSelfEnroll`: false for a restricted free course. */
  canSelfEnroll: boolean | undefined;
}): boolean {
  if (!input.isAuthenticated) return false;
  if (input.managesCourse) return true;
  if (input.holdsCourse === true) return true;
  const needsGrant =
    input.pricingType === "paid" || input.canSelfEnroll === false;
  return !needsGrant;
}

/**
 * The statement shown where the video would be. It is not a failure: there
 * is nothing to retry and nothing wrong with the lesson.
 */
export const NO_VIDEO_NOTICE = {
  kind: "notice",
  title: "No video",
  message: "This lesson has no video.",
  actionLabel: "",
} as const;

/**
 * The text of a reading lesson: a document lesson with no file attached
 * keeps what there is to read in its description, the only text field a
 * lesson has. `null` for any other lesson, and for a reading left empty.
 */
export function getLessonReading(
  lesson: LessonReadingContent | null | undefined,
): string | null {
  if (!lesson || lesson.contentType !== "document") return null;
  if (!lessonHasNoVideo(lesson)) return null;
  return lesson.description?.trim() || null;
}

/**
 * What stands where the video would be for a lesson with none: its reading
 * when it is a reading lesson, the plain statement otherwise. The small
 * player has no room for a text and names the lesson's kind instead.
 */
export function noVideoNoticeFor(
  lesson: LessonReadingContent | null | undefined,
) {
  const article = getLessonReading(lesson);
  return article
    ? ({
        kind: "notice",
        title: "Reading",
        message: "This lesson is a reading.",
        actionLabel: "",
        article,
      } as const)
    : NO_VIDEO_NOTICE;
}
