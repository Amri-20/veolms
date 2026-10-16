import type { RefObject, Dispatch, SetStateAction } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Lesson } from "../courseContent";
import { Curriculum } from "../Curriculum";
import { CurriculumResizeGrip } from "../CurriculumResizeGrip";
import type { AdaptedCurriculumSection } from "../courseCurriculumAdapter";
import {
  CURRICULUM_COLLAPSED_WIDTH,
  CURRICULUM_MAX_WIDTH,
  CURRICULUM_MIN_WIDTH,
} from "../learningShellPreferences";
import type { CurriculumPointerEvent } from "./workspaceGestureTypes";

export interface CurriculumColumnProps {
  splitPaneRef: RefObject<HTMLDivElement | null>;
  theaterMode: boolean;
  curriculumCollapsed: boolean;
  curriculumShortcutLabel: "⌥+C" | "Alt+C";
  curriculumAccessibleWidth: number;
  curriculumResizing: boolean;
  curriculumResizePreviewWidth: number | null;
  curriculumWidth: number;
  handleCurriculumResizeKeyDown: (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => void;
  toggleCurriculumFromResizeRail: () => void;
  startCurriculumResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
  moveCurriculumResize: (event: CurriculumPointerEvent) => void;
  endCurriculumResize: (
    event: CurriculumPointerEvent,
    cancelled?: boolean,
  ) => void;
  curriculumSections: AdaptedCurriculumSection[];
  curriculumLessonsById: Map<number, Lesson>;
  curriculumScrollportRef: RefObject<HTMLElement | null>;
  selectedLesson: number;
  lessonProgress: Record<number, number>;
  selectLesson: (lessonNumber: number, view?: "video" | "quiz") => void;
  lockedLessonNumbers: ReadonlySet<number>;
  onOpenCourseOverview: () => void;
  courseNavigationActionLabel: string | undefined;
  courseTitle: string;
  courseThumbnail: string | undefined;
  courseThumbnailSrcSet: string | undefined;
  curriculumFocusRequest: number;
  coursePersistenceKey: string;
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
  courseSlug: string | undefined;
  curriculumQuizLessonNumbers: Set<number>;
  showingQuiz: boolean;
  handleOpenLessonQuiz: (lessonNumber: number) => void;
  isApiRoute: boolean;
  isCourseOverviewLoading: boolean;
  courseUnavailable: "failed" | "not-found" | "no-lessons" | null;
  setChaptersPanelHost: Dispatch<SetStateAction<HTMLDivElement | null>>;
}

export function CurriculumColumn({
  splitPaneRef,
  theaterMode,
  curriculumCollapsed,
  curriculumShortcutLabel,
  curriculumAccessibleWidth,
  curriculumResizing,
  curriculumResizePreviewWidth,
  curriculumWidth,
  handleCurriculumResizeKeyDown,
  toggleCurriculumFromResizeRail,
  startCurriculumResize,
  moveCurriculumResize,
  endCurriculumResize,
  curriculumSections,
  curriculumLessonsById,
  curriculumScrollportRef,
  selectedLesson,
  lessonProgress,
  selectLesson,
  lockedLessonNumbers,
  onOpenCourseOverview,
  courseNavigationActionLabel,
  courseTitle,
  courseThumbnail,
  courseThumbnailSrcSet,
  curriculumFocusRequest,
  coursePersistenceKey,
  curriculumLessonResources,
  courseSlug,
  curriculumQuizLessonNumbers,
  showingQuiz,
  handleOpenLessonQuiz,
  isApiRoute,
  isCourseOverviewLoading,
  courseUnavailable,
  setChaptersPanelHost,
}: CurriculumColumnProps) {
  // prettier-ignore
  return (
    <div
      ref={splitPaneRef}
      className="learning-workspace__curriculum-clip"
      data-learning-split-pane={theaterMode ? undefined : ""}
    >
      <div
        className={`learning-workspace__curriculum-column ${curriculumCollapsed ? "is-collapsed" : ""}`}
        data-learning-split-card=""
      >
        <div
          className="learning-curriculum__resize-rail group/rail"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize course curriculum"
          aria-keyshortcuts="Alt+C"
          title={`Resize course content | ${curriculumShortcutLabel}`}
          aria-valuemin={CURRICULUM_MIN_WIDTH}
          aria-valuemax={CURRICULUM_MAX_WIDTH}
          aria-valuenow={
            curriculumCollapsed
              ? undefined
              : Math.round(curriculumAccessibleWidth)
          }
          aria-valuetext={
            curriculumCollapsed
              ? "Course curriculum collapsed"
              : `${Math.round(curriculumAccessibleWidth)} pixels wide${
                  curriculumResizing &&
                  (curriculumResizePreviewWidth ??
                    (curriculumCollapsed
                      ? CURRICULUM_COLLAPSED_WIDTH
                      : curriculumWidth)) < CURRICULUM_MIN_WIDTH
                    ? ", sliding closed"
                    : ""
                }`
          }
          tabIndex={0}
          onKeyDown={handleCurriculumResizeKeyDown}
          onDoubleClick={toggleCurriculumFromResizeRail}
          onPointerDown={startCurriculumResize}
          onPointerMove={moveCurriculumResize}
          onPointerUp={endCurriculumResize}
          onPointerCancel={(event) => endCurriculumResize(event, true)}
        >
          <CurriculumResizeGrip />
        </div>
        <div
          id="learning-course-content"
          className="learning-curriculum__viewport"
        >
          <Curriculum
            sections={curriculumSections}
            lessonsById={curriculumLessonsById}
            scrollportRef={curriculumScrollportRef}
            scrollportId="learning-course-curriculum-scrollport"
            selectedLesson={selectedLesson}
            lessonProgress={lessonProgress}
            onSelectLesson={selectLesson}
            lockedLessonNumbers={lockedLessonNumbers}
            onOpenCourseOverview={onOpenCourseOverview}
            courseNavigationActionLabel={courseNavigationActionLabel}
            courseTitle={courseTitle}
            courseThumbnail={courseThumbnail}
            courseThumbnailSrcSet={courseThumbnailSrcSet}
            focusRequest={curriculumFocusRequest}
            persistenceKey={coursePersistenceKey}
            lessonResources={curriculumLessonResources}
            resourceCourseKey={courseSlug}
            quizLessonNumbers={curriculumQuizLessonNumbers}
            activeQuizLesson={showingQuiz ? selectedLesson : null}
            onOpenLessonQuiz={handleOpenLessonQuiz}
            isLoading={isApiRoute && isCourseOverviewLoading}
            unavailable={courseUnavailable !== null}
            loadFailed={courseUnavailable === "failed"}
          />
        </div>
        {/* The lesson player portals its chapters panel here so it
                overlays the course content. It sits below the resize rail. */}
        <div
          ref={setChaptersPanelHost}
          data-learning-chapters-panel-host=""
          className="pointer-events-none absolute inset-0 z-11 overflow-hidden rounded-[inherit]"
        />
      </div>
    </div>
  );
}
