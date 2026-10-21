import {
  useLayoutEffect,
  type RefObject,
  type Dispatch,
  type SetStateAction,
  type JSX,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  LessonVideoPlayerProps,
  RegisterPersistentLearningPlayer,
} from "../../player";
import type { Lesson } from "../../courseContent";
import type { AdaptedCurriculumSection } from "../../courseCurriculumAdapter";
import type { useLessonTitleHeightSwipe } from "../../player/LessonPlayerHeightHandle";
import type { LiveLessonProgress } from "../../player/liveLessonProgress";

export interface UseLessonHeaderArgs {
  courseSlug: string | undefined;
  persistentPlayerCourseRouteKey: string | undefined;
  persistentPlayerLessonPath: string | undefined;
  persistentPlayerReturnPath: string | undefined;
  registerPersistentPlayer: RegisterPersistentLearningPlayer | undefined;
  isLessonAvailable: (lessonNumber: number) => boolean;
  selectedLesson: number;
  lessonDrawer: boolean;
  playerWrapRef: RefObject<HTMLDivElement | null>;
  lessonTriggerRef: RefObject<HTMLButtonElement | null>;
  curriculumSections: AdaptedCurriculumSection[];
  curriculumLessonsById: Map<number, Lesson>;
  currentLesson: Lesson;
  detachedProgressTarget:
    | {
        userId: string;
        courseKey: string;
        lessonIdsByNumber: ReadonlyMap<number, string> | undefined;
      }
    | undefined;
  liveLessonProgress: LiveLessonProgress;
  stickyPlayer: boolean;
  appliedPlayerHeight: number | null;
  readingGrowable:
    | {
        growth: number | null;
        onGrowthChange: Dispatch<SetStateAction<number | null>>;
      }
    | undefined;
  onHeaderPointerLeave: () => void;
  onHeaderPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  titleSwipeHandlers: Omit<
    ReturnType<typeof useLessonTitleHeightSwipe>,
    "onHeaderPointerMove" | "onHeaderPointerLeave"
  >;
  selectLesson: (lessonNumber: number, view?: "video" | "quiz") => void;
  openLessonDrawerInPlace: () => void;
  lessonPlayerProps: LessonVideoPlayerProps;
}

export interface UseLessonHeaderResult {
  lessonHeader: (contained?: boolean, titleLoading?: boolean) => JSX.Element;
}

export function useLessonHeader({
  courseSlug,
  persistentPlayerCourseRouteKey,
  persistentPlayerLessonPath,
  persistentPlayerReturnPath,
  registerPersistentPlayer,
  isLessonAvailable,
  selectedLesson,
  lessonDrawer,
  playerWrapRef,
  lessonTriggerRef,
  curriculumSections,
  curriculumLessonsById,
  currentLesson,
  detachedProgressTarget,
  liveLessonProgress,
  stickyPlayer,
  appliedPlayerHeight,
  readingGrowable,
  onHeaderPointerLeave,
  onHeaderPointerMove,
  titleSwipeHandlers,
  selectLesson,
  openLessonDrawerInPlace,
  lessonPlayerProps,
}: UseLessonHeaderArgs): UseLessonHeaderResult {
  // Registers the player again whenever what it shows changes. Progress is
  // not among those: it is handed over as a live source (see
  // `liveLessonProgress`), since every registration re-renders the academy
  // layout in the middle of this commit.
  useLayoutEffect(() => {
    const anchor = playerWrapRef.current;
    if (
      !anchor ||
      !registerPersistentPlayer ||
      !persistentPlayerCourseRouteKey ||
      !persistentPlayerLessonPath ||
      !persistentPlayerReturnPath
    ) {
      return undefined;
    }

    return registerPersistentPlayer({
      anchor,
      courseRouteKey: persistentPlayerCourseRouteKey,
      lessonPath: persistentPlayerLessonPath,
      mediaKey:
        lessonPlayerProps.resumePersistenceKey ??
        lessonPlayerProps.media.fileName,
      playerProps: lessonPlayerProps,
      returnPath: persistentPlayerReturnPath,
      courseSlug,
      selectedLesson,
      onSelectLesson: selectLesson,
      curriculumSections,
      curriculumLessonsById,
      lessonProgress: liveLessonProgress,
      isLessonAvailable,
      progressTarget: detachedProgressTarget,
    });
  }, [
    courseSlug,
    curriculumLessonsById,
    curriculumSections,
    detachedProgressTarget,
    isLessonAvailable,
    lessonPlayerProps,
    liveLessonProgress,
    persistentPlayerCourseRouteKey,
    persistentPlayerLessonPath,
    persistentPlayerReturnPath,
    registerPersistentPlayer,
    selectLesson,
    selectedLesson,
    playerWrapRef,
  ]);

  const lessonHeader = (contained = false, titleLoading = false) => (
    <header
      className="learning-workspace__lesson-header"
      // Tells the video's resize grip when a mouse is over its strip (at
      // phone width the strip lies over the top of this header).
      onPointerMove={stickyPlayer ? onHeaderPointerMove : undefined}
      onPointerLeave={stickyPlayer ? onHeaderPointerLeave : undefined}
    >
      <button
        id="learning-course-content-trigger"
        ref={lessonTriggerRef}
        type="button"
        className={`learning-workspace__lesson-heading ${appliedPlayerHeight === null && !readingGrowable ? "touch-pan-up" : "touch-none"}`}
        {...(stickyPlayer ? titleSwipeHandlers : undefined)}
        style={
          contained
            ? {
                width: "100%",
                minWidth: 0,
                marginInline: 0,
                paddingInline: 0,
              }
            : undefined
        }
        aria-label={`Open course lessons for ${currentLesson[1]}`}
        aria-expanded={lessonDrawer}
        onClick={openLessonDrawerInPlace}
      >
        <div className="min-w-0">
          {titleLoading ? (
            <span
              className="block h-5 w-40 max-w-full animate-pulse rounded-md bg-[color-mix(in_srgb,var(--text)_12%,transparent)]"
              data-testid="learning-lesson-title-loading"
              aria-hidden="true"
            />
          ) : (
            <h1 id="learning-lesson-title">{currentLesson[1]}</h1>
          )}
        </div>
      </button>
      {/* No quiz button here: the course content list marks a lesson that
          has a quiz and opens it, and the open quiz carries its own way
          back to the video. */}
    </header>
  );
  return {
    lessonHeader,
  };
}
