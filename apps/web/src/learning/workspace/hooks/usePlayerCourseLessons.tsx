import {
  useMemo,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  type JSX,
} from "react";
import type { Lesson } from "../../courseContent";
import { Curriculum } from "../../Curriculum";
import { FullscreenLandscapeCurriculumPanel } from "../../FullscreenLandscapeCurriculumPanel";
import type { AdaptedCurriculumSection } from "../../courseCurriculumAdapter";
import { CURRICULUM_MIN_WIDTH } from "../../learningShellPreferences";
import { LESSON_DRAWER_MIN_FLOATING_WIDTH } from "../../useLessonDrawerHeroControl";
import type { LessonDrawerViewportBounds } from "../../useLessonDrawerHeroControl";
import type { useSecondPressHold } from "../../../gestures/useSecondPressHold";

export interface UsePlayerCourseLessonsArgs {
  courseNavigationActionLabel: string | undefined;
  courseSlug: string | undefined;
  onOpenCourseOverview: () => void;
  selectedLesson: number;
  courseTitle: string;
  coursePersistenceKey: string;
  lessonDrawer: boolean;
  mobileLandscapeFullscreen: boolean;
  fullscreenLessonPanelOpen: boolean;
  fullscreenVideoWidthPercent: number;
  setFullscreenVideoWidthPercent: Dispatch<SetStateAction<number>>;
  fullscreenVideoWidthPreviewPercent: number | null;
  setFullscreenVideoWidthPreviewPercent: Dispatch<
    SetStateAction<number | null>
  >;
  fullscreenCurriculumFocusRequest: number;
  lessonDrawerViewportBounds: LessonDrawerViewportBounds | null;
  floatingLessonDrawerWidth: number;
  floatingLessonDrawerResizing: boolean;
  courseContentDrawerViewport: boolean;
  curriculumWidth: number;
  curriculumCollapsed: boolean;
  curriculumResizePreviewWidth: number | null;
  fullscreenCurriculumScrollportRef: RefObject<HTMLElement | null>;
  curriculumSections: AdaptedCurriculumSection[];
  curriculumLessonsById: Map<number, Lesson>;
  curriculumLessonResources: Map<
    number,
    readonly {
      id: string;
      mediaAssetId: string;
      title: string;
      mediaAsset?:
        | {
            originalFilename: string;
            mimeType: string;
            sizeBytes: number;
            status:
              "uploading" | "uploaded" | "processing" | "ready" | "failed";
          }
        | undefined;
    }[]
  >;
  curriculumQuizLessonNumbers: Set<number>;
  showingQuiz: boolean;
  lockedLessonNumbers: ReadonlySet<number>;
  lessonProgress: Record<number, number>;
  courseThumbnail: string | undefined;
  courseThumbnailSrcSet: string | undefined;
  selectLesson: (lessonNumber: number, view?: "video" | "quiz") => void;
  handleOpenLessonQuiz: (lessonNumber: number) => void;
  closeFullscreenLessonPanel: () => void;
  curriculumToggleGesture: ReturnType<
    typeof useSecondPressHold<HTMLButtonElement>
  >;
}

export interface UsePlayerCourseLessonsResult {
  curriculumAccessibleWidth: number;
  playerCourseLessonsSidePanel: boolean;
  playerCourseLessonsSecondPressHold:
    | {
        isSecondPressHolding: boolean;
        handlers: ReturnType<
          typeof useSecondPressHold<HTMLButtonElement>
        >["handlers"];
      }
    | undefined;
  floatingLessonDrawerViewportWidth: number;
  floatingLessonDrawerSlidingClosed: boolean;
  playerCourseLessonsOpen: boolean;
  fullscreenVideoLayoutWidthPercent: number;
  fullscreenCoursePanel: JSX.Element;
}

export function usePlayerCourseLessons({
  courseNavigationActionLabel,
  courseSlug,
  onOpenCourseOverview,
  selectedLesson,
  courseTitle,
  coursePersistenceKey,
  lessonDrawer,
  mobileLandscapeFullscreen,
  fullscreenLessonPanelOpen,
  fullscreenVideoWidthPercent,
  setFullscreenVideoWidthPercent,
  fullscreenVideoWidthPreviewPercent,
  setFullscreenVideoWidthPreviewPercent,
  fullscreenCurriculumFocusRequest,
  lessonDrawerViewportBounds,
  floatingLessonDrawerWidth,
  floatingLessonDrawerResizing,
  courseContentDrawerViewport,
  curriculumWidth,
  curriculumCollapsed,
  curriculumResizePreviewWidth,
  fullscreenCurriculumScrollportRef,
  curriculumSections,
  curriculumLessonsById,
  curriculumLessonResources,
  curriculumQuizLessonNumbers,
  showingQuiz,
  lockedLessonNumbers,
  lessonProgress,
  courseThumbnail,
  courseThumbnailSrcSet,
  selectLesson,
  handleOpenLessonQuiz,
  closeFullscreenLessonPanel,
  curriculumToggleGesture,
}: UsePlayerCourseLessonsArgs): UsePlayerCourseLessonsResult {
  const curriculumAccessibleWidth = Math.max(
    CURRICULUM_MIN_WIDTH,
    curriculumResizePreviewWidth ?? curriculumWidth,
  );
  const playerCourseLessonsSidePanel = !courseContentDrawerViewport;
  const playerCourseLessonsSecondPressHold = useMemo(
    () =>
      courseContentDrawerViewport
        ? undefined
        : {
            isSecondPressHolding: curriculumToggleGesture.isSecondPressHolding,
            handlers: curriculumToggleGesture.handlers,
          },
    [
      courseContentDrawerViewport,
      curriculumToggleGesture.handlers,
      curriculumToggleGesture.isSecondPressHolding,
    ],
  );
  const floatingLessonDrawerViewportWidth =
    lessonDrawerViewportBounds?.width ?? floatingLessonDrawerWidth;
  const floatingLessonDrawerSlidingClosed =
    floatingLessonDrawerResizing &&
    floatingLessonDrawerViewportWidth < LESSON_DRAWER_MIN_FLOATING_WIDTH;
  const playerCourseLessonsOpen = mobileLandscapeFullscreen
    ? fullscreenLessonPanelOpen
    : courseContentDrawerViewport
      ? lessonDrawer
      : !curriculumCollapsed;
  const fullscreenVideoLayoutWidthPercent =
    fullscreenVideoWidthPreviewPercent ?? fullscreenVideoWidthPercent;
  const fullscreenCoursePanel = useMemo(
    () => (
      <FullscreenLandscapeCurriculumPanel
        onClose={closeFullscreenLessonPanel}
        videoWidthPercent={fullscreenVideoWidthPercent}
        onVideoWidthPercentChange={setFullscreenVideoWidthPercent}
        onVideoWidthPreviewChange={setFullscreenVideoWidthPreviewPercent}
      >
        <Curriculum
          sections={curriculumSections}
          lessonsById={curriculumLessonsById}
          scrollportRef={fullscreenCurriculumScrollportRef}
          scrollportId="learning-fullscreen-course-curriculum-scrollport"
          scrollControlBottomClearance="calc(100dvh - 228px)"
          selectedLesson={selectedLesson}
          lessonProgress={lessonProgress}
          lockedLessonNumbers={lockedLessonNumbers}
          onSelectLesson={selectLesson}
          onOpenCourseOverview={onOpenCourseOverview}
          courseNavigationActionLabel={courseNavigationActionLabel}
          courseTitle={courseTitle}
          courseThumbnail={courseThumbnail}
          courseThumbnailSrcSet={courseThumbnailSrcSet}
          focusRequest={fullscreenCurriculumFocusRequest}
          persistenceKey={coursePersistenceKey}
          lessonResources={curriculumLessonResources}
          resourceCourseKey={courseSlug}
          quizLessonNumbers={curriculumQuizLessonNumbers}
          activeQuizLesson={showingQuiz ? selectedLesson : null}
          onOpenLessonQuiz={handleOpenLessonQuiz}
        />
      </FullscreenLandscapeCurriculumPanel>
    ),
    [
      coursePersistenceKey,
      closeFullscreenLessonPanel,
      courseNavigationActionLabel,
      courseThumbnail,
      courseThumbnailSrcSet,
      courseTitle,
      courseSlug,
      curriculumLessonResources,
      curriculumLessonsById,
      curriculumQuizLessonNumbers,
      curriculumSections,
      fullscreenCurriculumFocusRequest,
      fullscreenVideoWidthPercent,
      handleOpenLessonQuiz,
      lessonProgress,
      lockedLessonNumbers,
      onOpenCourseOverview,
      selectLesson,
      selectedLesson,
      showingQuiz,
      fullscreenCurriculumScrollportRef,
      setFullscreenVideoWidthPercent,
      setFullscreenVideoWidthPreviewPercent,
    ],
  );
  return {
    curriculumAccessibleWidth,
    playerCourseLessonsSidePanel,
    playerCourseLessonsSecondPressHold,
    floatingLessonDrawerViewportWidth,
    floatingLessonDrawerSlidingClosed,
    playerCourseLessonsOpen,
    fullscreenVideoLayoutWidthPercent,
    fullscreenCoursePanel,
  };
}
