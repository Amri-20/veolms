import "./learning-feature.css";
import "./learning-split-layout.css";
import type { MyQuizAssignment } from "@veolms/contracts";
import { FloatingScrollbar } from "../shell/FloatingScrollbar";
import type {
  LessonPlayerMinimizeGestureState,
  RegisterPersistentLearningPlayer,
} from "./player";
import type { LearningMiniPlayerRequest } from "./player/learningMiniPlayerTypes";
import { PrerenderedMobileCommentComposer } from "./Discussion";
import { Drawer } from "@/components/ui/drawer";
import { LessonPlayerSlot } from "./workspace/LessonPlayerSlot";
import { LessonContentPanel } from "./workspace/LessonContentPanel";
import { CurriculumColumn } from "./workspace/CurriculumColumn";
import { CourseLessonsDrawerContent } from "./workspace/CourseLessonsDrawerContent";
import { useLearningCourseData } from "./workspace/hooks/useLearningCourseData";
import { useLessonSelectionState } from "./workspace/hooks/useLessonSelectionState";
import { useLearningShellState } from "./workspace/hooks/useLearningShellState";
import { useWorkspaceRefs } from "./workspace/hooks/useWorkspaceRefs";
import { useCurriculumModel } from "./workspace/hooks/useCurriculumModel";
import { usePlaybackBootstrapState } from "./workspace/hooks/usePlaybackBootstrapState";
import { useLessonDescriptionState } from "./workspace/hooks/useLessonDescriptionState";
import { useLessonStagePlan } from "./workspace/hooks/useLessonStagePlan";
import { useLessonAccess } from "./workspace/hooks/useLessonAccess";
import { useLessonProgressState } from "./workspace/hooks/useLessonProgressState";
import { useLessonPlayerSizing } from "./workspace/hooks/useLessonPlayerSizing";
import { useLearningDeepLinkState } from "./workspace/hooks/useLearningDeepLinkState";
import { useLessonNavigation } from "./workspace/hooks/useLessonNavigation";
import { useLessonDrawerControls } from "./workspace/hooks/useLessonDrawerControls";
import { useCurriculumScreenSwipe } from "./workspace/hooks/useCurriculumScreenSwipe";
import { useFloatingLessonDrawerResize } from "./workspace/hooks/useFloatingLessonDrawerResize";
import { useCurriculumResize } from "./workspace/hooks/useCurriculumResize";
import { usePlayerCourseLessons } from "./workspace/hooks/usePlayerCourseLessons";
import { useLessonPlayerProps } from "./workspace/hooks/useLessonPlayerProps";
import { useLessonHeader } from "./workspace/hooks/useLessonHeader";

interface LearningWorkspaceProps {
  courseSlug: string | undefined;
  userId?: string;
  lessonId: number;
  deepLinkLessonUuid?: string | null;
  isDiscussionDeepLink?: boolean;
  deepLinkRouteSettled?: boolean;
  noteDeepLinkId?: string | null;
  courseNavigationActionLabel?: string;
  initialLessonView?: "video" | "quiz";
  mobileBottomNavigation: boolean;
  mobileBottomNavigationHidden?: boolean;
  onSelectLesson: (lessonId: number, view?: "video" | "quiz") => void;
  onOpenCourseOverview: () => void;
  /** "Unlock the course" on a locked lesson. */
  onUnlockCourse: () => void;
  onOpenLogin: () => void;
  onMinimizePlayer?: (request: LearningMiniPlayerRequest) => void;
  onMinimizeGestureChange?: (state: LessonPlayerMinimizeGestureState) => void;
  onMiniPlayerRestoreReady?: () => void;
  persistentPlayerCourseRouteKey?: string;
  persistentPlayerLessonPath?: string;
  persistentPlayerReturnPath?: string;
  persistentPlayerMounted?: boolean;
  registerPersistentPlayer?: RegisterPersistentLearningPlayer;
  quizAssignment?: MyQuizAssignment | null;
  quizAssignments?: readonly MyQuizAssignment[] | null;
  quizAssignmentLoading?: boolean;
}

export function LearningWorkspace({
  courseSlug,
  userId,
  lessonId,
  deepLinkLessonUuid = null,
  isDiscussionDeepLink = false,
  deepLinkRouteSettled = true,
  noteDeepLinkId = null,
  courseNavigationActionLabel,
  initialLessonView = "video",
  mobileBottomNavigation,
  mobileBottomNavigationHidden = false,
  onSelectLesson,
  onOpenCourseOverview,
  onUnlockCourse,
  onOpenLogin,
  onMinimizePlayer,
  onMinimizeGestureChange,
  onMiniPlayerRestoreReady,
  persistentPlayerCourseRouteKey,
  persistentPlayerLessonPath,
  persistentPlayerReturnPath,
  persistentPlayerMounted = false,
  registerPersistentPlayer,
  quizAssignment = null,
  quizAssignments = null,
  quizAssignmentLoading = false,
}: LearningWorkspaceProps) {
  const {
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
  } = useLearningCourseData({
    courseSlug,
  });
  const {
    shortcutPlatform,
    selectedLesson,
    setSelectedLesson,
    deepLinkInitializationPending,
    setDeepLinkInitializationPending,
    pendingLessonSelectionRef,
    localLessonProgress,
    setLocalLessonProgress,
    autoPlayOnLessonChange,
    setAutoPlayOnLessonChange,
    autoplayEnabled,
    setAutoplayEnabled,
    courseTitle,
    coursePersistenceKey,
    discussionPersistenceKey,
  } = useLessonSelectionState({
    courseSlug,
    deepLinkLessonUuid,
    lessonId,
    isApiRoute,
    courseOverview,
    isCourseOverviewError,
  });
  const {
    lessonDrawer,
    setLessonDrawer,
    mobileLandscapeFullscreen,
    setMobileLandscapeFullscreen,
    fullscreenLessonPanelOpen,
    setFullscreenLessonPanelOpen,
    fullscreenVideoWidthPercent,
    setFullscreenVideoWidthPercent,
    fullscreenVideoWidthPreviewPercent,
    setFullscreenVideoWidthPreviewPercent,
    fullscreenCurriculumFocusRequest,
    setFullscreenCurriculumFocusRequest,
    lessonDrawerForcedFloating,
    setLessonDrawerForcedFloating,
    lessonDrawerSnapPoint,
    setLessonDrawerSnapPoint,
    lessonDrawerCollapsedSnapPoint,
    setLessonDrawerCollapsedSnapPoint,
    lessonDrawerViewportBounds,
    setLessonDrawerViewportBounds,
    floatingLessonDrawerWidth,
    setFloatingLessonDrawerWidth,
    floatingLessonDrawerResizing,
    setFloatingLessonDrawerResizing,
    courseContentDrawerViewport,
    phoneLessonDrawerViewport,
    desktopLearningMinimizeViewport,
    phoneLessonDrawer,
    lessonDrawerSnapPoints,
    curriculumFocusRequest,
    setCurriculumFocusRequest,
    lessonDrawerFocusRequest,
    setLessonDrawerFocusRequest,
    lessonDrawerTopRequest,
    setLessonDrawerTopRequest,
    lessonDrawerScrollTarget,
    setLessonDrawerScrollTarget,
    curriculumWidth,
    setCurriculumWidth,
    curriculumCollapsed,
    setCurriculumCollapsed,
    curriculumResizing,
    setCurriculumResizing,
    curriculumResizePreviewWidth,
    setCurriculumResizePreviewWidth,
  } = useLearningShellState({
    mobileBottomNavigation,
    setAutoplayEnabled,
  });

  const {
    theaterMode,
    setTheaterMode,
    chaptersPanelHost,
    setChaptersPanelHost,
    mainRef,
    splitPaneRef,
    playerWrapRef,
    workspaceRef,
    lessonContentRef,
    updatePlayerMinimizeGesture,
    lessonTriggerRef,
    curriculumScrollportRef,
    fullscreenCurriculumScrollportRef,
    lessonDrawerSurfaceRef,
    lessonDrawerScrollportRef,
    previousFocusRef,
    lessonDrawerSkipFinalFocusRef,
    curriculumResizeRef,
    curriculumResizeSyncTimerRef,
    curriculumDragWidthAppliedRef,
    floatingLessonDrawerResizeRef,
    curriculumResizeMoveRef,
    curriculumResizeFinishRef,
    curriculumScreenSwipeRef,
    curriculumScreenSwipeStartRef,
    claimCurriculumPointerGesture,
    beginCurriculumResizeRef,
    curriculumScreenSwipeMoveRef,
    curriculumScreenSwipeFinishRef,
    curriculumScreenSwipeConsumedUntilRef,
  } = useWorkspaceRefs({
    onMinimizeGestureChange,
    lessonDrawer,
  });
  const {
    isCourseContentDrawerLayout,
    adaptedCurriculum,
    curriculumSections,
    curriculumLessonsById,
    firstCurriculumLessonId,
    currentLesson,
    playbackBootstrapError,
    setPlaybackBootstrapError,
    courseAccessRefused,
    courseQuizAssignments,
    setActiveLessonView,
    hasLessonQuiz,
    curriculumLessonResources,
    curriculumQuizLessonNumbers,
    currentLessonUuid,
    currentQuizAssignment,
    isDedicatedQuizLesson,
    showingQuiz,
  } = useCurriculumModel({
    initialLessonView,
    quizAssignment,
    quizAssignments,
    isAuthenticated,
    courseOverview,
    selectedLesson,
    autoPlayOnLessonChange,
    playerWrapRef,
  });
  const {
    protectedPlayback,
    playbackRequestKey,
    playbackBootstrap,
    setPlaybackBootstrap,
    playbackBootstrapAttempt,
    playbackRequestKeyRef,
    refreshPlaybackToken,
    retryPlaybackBootstrap,
  } = usePlaybackBootstrapState({
    courseSlug,
    isAuthenticated,
    selectedLesson,
    setPlaybackBootstrapError,
  });

  const {
    courseUnavailable,
    retryCourseOverview,
    selectedLessonQuizAttached,
    stageLesson,
    isLessonDescriptionPending,
    lessonDescriptionState,
    retryLessonDescription,
  } = useLessonDescriptionState({
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
  });
  const {
    lessonStagePlan,
    playbackAccessError,
    lessonTextPending,
    playbackBootstrapPending,
  } = useLessonStagePlan({
    courseSlug,
    onUnlockCourse,
    onOpenLogin,
    isAuthenticated,
    resolvedAuthUser,
    isAuthResolutionPending,
    enrolledCoursesQuery,
    courseOverview,
    selectedLesson,
    adaptedCurriculum,
    playbackBootstrapError,
    setPlaybackBootstrapError,
    showingQuiz,
    protectedPlayback,
    playbackRequestKey,
    playbackBootstrap,
    setPlaybackBootstrap,
    playbackBootstrapAttempt,
    playbackRequestKeyRef,
    retryPlaybackBootstrap,
    courseUnavailable,
    retryCourseOverview,
    selectedLessonQuizAttached,
    stageLesson,
    lessonDescriptionState,
    retryLessonDescription,
  });
  const {
    lessonContentAccess,
    lockedLessonNumbers,
    lessonContentAccessReason,
    lessonParticipationState,
    canParticipateInLessonDiscussion,
  } = useLessonAccess({
    isAuthenticated,
    resolvedAuthUser,
    isAuthResolutionPending,
    enrolledCoursesQuery,
    courseOverview,
    selectedLesson,
    adaptedCurriculum,
  });
  const {
    lessonSequence,
    recordProgress,
    detachedProgressTarget,
    lessonProgress,
    courseComplete,
    currentLessonIndex,
    previousLessonId,
    nextLessonId,
    courseThumbnail,
    courseThumbnailSrcSet,
    nextLessonInfo,
  } = useLessonProgressState({
    courseSlug,
    userId,
    isApiRoute,
    courseOverview,
    isCourseOverviewError,
    selectedLesson,
    localLessonProgress,
    adaptedCurriculum,
    curriculumSections,
    curriculumLessonsById,
    courseAccessRefused,
  });

  const {
    stickyPlayer,
    playerHeight,
    setPlayerHeight,
    appliedPlayerHeight,
    readingGrowable,
    appliedReadingGrowth,
    shortPlayer,
    seekTimeOnly,
    onHeaderPointerMove,
    onHeaderPointerLeave,
    titleSwipeHandlers,
  } = useLessonPlayerSizing({
    theaterMode,
    playerWrapRef,
    showingQuiz,
    stageLesson,
  });
  const {
    selectedLessonRecord,
    selectedLessonDescription,
    selectedLessonReading,
    courseId,
    backendLessonId,
    isLearningDeepLinkReady,
    isLearningDeepLinkError,
    isLearningBootstrapLoading,
    curriculumShortcutLabel,
  } = useLearningDeepLinkState({
    deepLinkLessonUuid,
    deepLinkRouteSettled,
    isDiscussionDeepLink,
    lessonId,
    courseOverview,
    isCourseOverviewError,
    isCourseOverviewFetching,
    isInteractionCapabilitiesLoading,
    shortcutPlatform,
    selectedLesson,
    deepLinkInitializationPending,
    setDeepLinkInitializationPending,
    stageLesson,
  });

  const {
    getLessonDrawerCollapsedSnapPoint,
    getLessonDrawerViewportBounds,
    resumeLessonVideoPlayback,
    selectLesson,
    handleOpenLessonQuiz,
    updateAutoplayEnabled,
    goToPreviousLesson,
    goToNextLesson,
    updateSelectedLessonProgress,
    handleLessonEnded,
  } = useLessonNavigation({
    lessonId,
    onSelectLesson,
    selectedLesson,
    setSelectedLesson,
    pendingLessonSelectionRef,
    setLocalLessonProgress,
    setAutoPlayOnLessonChange,
    setAutoplayEnabled,
    lessonDrawer,
    setLessonDrawer,
    phoneLessonDrawer,
    playerWrapRef,
    curriculumLessonsById,
    firstCurriculumLessonId,
    setActiveLessonView,
    hasLessonQuiz,
    lessonStagePlan,
    recordProgress,
    previousLessonId,
    nextLessonId,
  });

  const {
    toggleTheaterMode,
    openLessonDrawer,
    openLessonDrawerInPlace,
    closeLessonDrawer,
    toggleLessonDrawerFromPlayer,
    handleMobileLandscapeFullscreenChange,
    closeFullscreenLessonPanel,
    openFloatingLessonDrawer,
    lessonDrawerHeroControlProps,
    handleLessonDrawerTouchStartCapture,
  } = useLessonDrawerControls({
    lessonDrawer,
    setLessonDrawer,
    mobileLandscapeFullscreen,
    setMobileLandscapeFullscreen,
    fullscreenLessonPanelOpen,
    setFullscreenLessonPanelOpen,
    setFullscreenVideoWidthPreviewPercent,
    setFullscreenCurriculumFocusRequest,
    lessonDrawerForcedFloating,
    setLessonDrawerForcedFloating,
    lessonDrawerSnapPoint,
    setLessonDrawerSnapPoint,
    lessonDrawerCollapsedSnapPoint,
    setLessonDrawerCollapsedSnapPoint,
    setLessonDrawerViewportBounds,
    floatingLessonDrawerWidth,
    phoneLessonDrawer,
    setCurriculumFocusRequest,
    setLessonDrawerFocusRequest,
    setLessonDrawerTopRequest,
    setLessonDrawerScrollTarget,
    curriculumCollapsed,
    setCurriculumCollapsed,
    setTheaterMode,
    theaterMode,
    playerWrapRef,
    lessonDrawerScrollportRef,
    previousFocusRef,
    lessonDrawerSkipFinalFocusRef,
    isCourseContentDrawerLayout,
    getLessonDrawerCollapsedSnapPoint,
    getLessonDrawerViewportBounds,
  });

  const { startCurriculumScreenSwipe, suppressCurriculumSwipeClick } =
    useCurriculumScreenSwipe({
      lessonDrawer,
      phoneLessonDrawer,
      curriculumWidth,
      curriculumCollapsed,
      setCurriculumCollapsed,
      setCurriculumResizing,
      setCurriculumResizePreviewWidth,
      playerWrapRef,
      workspaceRef,
      curriculumResizeRef,
      curriculumScreenSwipeRef,
      curriculumScreenSwipeStartRef,
      claimCurriculumPointerGesture,
      beginCurriculumResizeRef,
      curriculumScreenSwipeMoveRef,
      curriculumScreenSwipeFinishRef,
      curriculumScreenSwipeConsumedUntilRef,
      isCourseContentDrawerLayout,
      openLessonDrawer,
      closeLessonDrawer,
    });

  const {
    commitCurriculumWidth,
    startFloatingLessonDrawerResize,
    handleFloatingLessonDrawerResizeKeyDown,
  } = useFloatingLessonDrawerResize({
    lessonDrawerViewportBounds,
    setLessonDrawerViewportBounds,
    floatingLessonDrawerWidth,
    setFloatingLessonDrawerWidth,
    floatingLessonDrawerResizing,
    setFloatingLessonDrawerResizing,
    phoneLessonDrawer,
    setCurriculumWidth,
    floatingLessonDrawerResizeRef,
    getLessonDrawerViewportBounds,
    closeLessonDrawer,
  });

  const {
    startCurriculumResize,
    moveCurriculumResize,
    endCurriculumResize,
    handleCurriculumResizeKeyDown,
    toggleCurriculumFromResizeRail,
    curriculumToggleGesture,
  } = useCurriculumResize({
    lessonStorageKey,
    selectedLesson,
    lessonDrawer,
    courseContentDrawerViewport,
    curriculumWidth,
    setCurriculumWidth,
    curriculumCollapsed,
    setCurriculumCollapsed,
    curriculumResizing,
    setCurriculumResizing,
    setCurriculumResizePreviewWidth,
    workspaceRef,
    curriculumResizeRef,
    curriculumResizeSyncTimerRef,
    curriculumDragWidthAppliedRef,
    curriculumResizeMoveRef,
    curriculumResizeFinishRef,
    beginCurriculumResizeRef,
    curriculumScreenSwipeConsumedUntilRef,
    isCourseContentDrawerLayout,
    openLessonDrawer,
    closeLessonDrawer,
    openFloatingLessonDrawer,
    commitCurriculumWidth,
  });

  const {
    curriculumAccessibleWidth,
    playerCourseLessonsSidePanel,
    playerCourseLessonsSecondPressHold,
    floatingLessonDrawerViewportWidth,
    floatingLessonDrawerSlidingClosed,
    playerCourseLessonsOpen,
    fullscreenVideoLayoutWidthPercent,
    fullscreenCoursePanel,
  } = usePlayerCourseLessons({
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
  });
  const { seekCurrentLessonToTimestamp, lessonPlayerProps } =
    useLessonPlayerProps({
      courseSlug,
      onMinimizePlayer,
      onMiniPlayerRestoreReady,
      selectedLesson,
      autoPlayOnLessonChange,
      autoplayEnabled,
      courseTitle,
      coursePersistenceKey,
      lessonDrawer,
      courseContentDrawerViewport,
      phoneLessonDrawer,
      curriculumCollapsed,
      theaterMode,
      chaptersPanelHost,
      updatePlayerMinimizeGesture,
      currentLesson,
      playbackBootstrapError,
      showingQuiz,
      protectedPlayback,
      playbackBootstrap,
      refreshPlaybackToken,
      retryPlaybackBootstrap,
      playbackAccessError,
      lessonTextPending,
      playbackBootstrapPending,
      lessonSequence,
      courseComplete,
      currentLessonIndex,
      previousLessonId,
      nextLessonId,
      courseThumbnail,
      nextLessonInfo,
      shortPlayer,
      seekTimeOnly,
      selectedLessonRecord,
      selectedLessonDescription,
      curriculumShortcutLabel,
      updateAutoplayEnabled,
      goToPreviousLesson,
      goToNextLesson,
      updateSelectedLessonProgress,
      handleLessonEnded,
      toggleTheaterMode,
      toggleLessonDrawerFromPlayer,
      handleMobileLandscapeFullscreenChange,
      playerCourseLessonsSidePanel,
      playerCourseLessonsSecondPressHold,
      playerCourseLessonsOpen,
      fullscreenVideoLayoutWidthPercent,
      fullscreenCoursePanel,
    });

  const { lessonHeader } = useLessonHeader({
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
    lessonProgress,
    stickyPlayer,
    appliedPlayerHeight,
    readingGrowable,
    onHeaderPointerLeave,
    onHeaderPointerMove,
    titleSwipeHandlers,
    selectLesson,
    openLessonDrawerInPlace,
    lessonPlayerProps,
  });

  return (
    <div
      ref={workspaceRef}
      className={`learning-workspace ${theaterMode ? "is-theater" : ""} ${curriculumResizing ? "is-curriculum-resizing" : ""} ${floatingLessonDrawerResizing ? "is-floating-curriculum-resizing select-none" : ""}`}
      onPointerDownCapture={(event) =>
        startCurriculumScreenSwipe({
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          clientX: event.clientX,
          clientY: event.clientY,
          timeStamp: event.timeStamp,
          target: event.target,
          handle: event.currentTarget,
        })
      }
      onClickCapture={suppressCurriculumSwipeClick}
    >
      <main
        ref={mainRef}
        data-learning-motion-surface=""
        data-learning-split-lesson=""
        data-learning-quiz-active={showingQuiz ? "true" : undefined}
        className={`learning-workspace__main ${curriculumCollapsed ? "is-curriculum-collapsed" : ""}`}
        inert={lessonDrawer ? true : undefined}
        aria-hidden={lessonDrawer || undefined}
      >
        {/* On a phone the page itself stays put and this column is what
            scrolls: the video, title, description and comments go up
            together. (The window does not move, which the minimize and
            expand motions rely on.) Its content is never squeezed to fit. */}
        <section className="learning-workspace__lesson-column max-[640px]:overflow-x-hidden max-[640px]:overflow-y-auto max-[640px]:[&>.learning-workspace\_\_lesson-content-clip]:flex-[1_0_auto]!">
          <LessonPlayerSlot
            playerWrapRef={playerWrapRef}
            stickyPlayer={stickyPlayer}
            showingQuiz={showingQuiz}
            currentQuizAssignment={currentQuizAssignment}
            currentLessonUuid={currentLessonUuid}
            selectedLesson={selectedLesson}
            courseId={courseId}
            resumeLessonVideoPlayback={resumeLessonVideoPlayback}
            updateSelectedLessonProgress={updateSelectedLessonProgress}
            nextLessonId={nextLessonId}
            onSelectLesson={onSelectLesson}
            quizAssignmentLoading={quizAssignmentLoading}
            courseQuizAssignments={courseQuizAssignments}
            isDedicatedQuizLesson={isDedicatedQuizLesson}
            hasLessonQuiz={hasLessonQuiz}
            registerPersistentPlayer={registerPersistentPlayer}
            appliedReadingGrowth={appliedReadingGrowth}
            appliedPlayerHeight={appliedPlayerHeight}
            shortPlayer={shortPlayer}
            seekTimeOnly={seekTimeOnly}
            persistentPlayerMounted={persistentPlayerMounted}
            lessonPlayerProps={lessonPlayerProps}
            playerHeight={playerHeight}
            setPlayerHeight={setPlayerHeight}
            readingGrowable={readingGrowable}
          />

          <LessonContentPanel
            lessonContentRef={lessonContentRef}
            desktopLearningMinimizeViewport={desktopLearningMinimizeViewport}
            courseUnavailable={courseUnavailable}
            phoneLessonDrawerViewport={phoneLessonDrawerViewport}
            lessonHeader={lessonHeader}
            isLearningBootstrapLoading={isLearningBootstrapLoading}
            isLearningDeepLinkReady={isLearningDeepLinkReady}
            discussionPersistenceKey={discussionPersistenceKey}
            courseSlug={courseSlug}
            courseId={courseId}
            backendLessonId={backendLessonId}
            noteDeepLinkId={noteDeepLinkId}
            mobileBottomNavigation={mobileBottomNavigation}
            mobileBottomNavigationHidden={mobileBottomNavigationHidden}
            selectedLessonReading={selectedLessonReading}
            selectedLessonDescription={selectedLessonDescription}
            isApiRoute={isApiRoute}
            isCourseOverviewLoading={isCourseOverviewLoading}
            isLessonDescriptionPending={isLessonDescriptionPending}
            interactionCapabilities={interactionCapabilities}
            lessonContentAccess={lessonContentAccess}
            lessonContentAccessReason={lessonContentAccessReason}
            canParticipateInLessonDiscussion={canParticipateInLessonDiscussion}
            lessonParticipationState={lessonParticipationState}
            isAuthenticated={isAuthenticated}
            onOpenCourseOverview={onOpenCourseOverview}
            onOpenLogin={onOpenLogin}
            seekCurrentLessonToTimestamp={seekCurrentLessonToTimestamp}
            isLearningDeepLinkError={isLearningDeepLinkError}
            refetchCourseOverview={refetchCourseOverview}
          />
        </section>

        {/* On desktop this is the second card of the page. Theater mode hides
            the course content, so the lesson card takes the full width. */}
        <CurriculumColumn
          splitPaneRef={splitPaneRef}
          theaterMode={theaterMode}
          curriculumCollapsed={curriculumCollapsed}
          curriculumShortcutLabel={curriculumShortcutLabel}
          curriculumAccessibleWidth={curriculumAccessibleWidth}
          curriculumResizing={curriculumResizing}
          curriculumResizePreviewWidth={curriculumResizePreviewWidth}
          curriculumWidth={curriculumWidth}
          handleCurriculumResizeKeyDown={handleCurriculumResizeKeyDown}
          toggleCurriculumFromResizeRail={toggleCurriculumFromResizeRail}
          startCurriculumResize={startCurriculumResize}
          moveCurriculumResize={moveCurriculumResize}
          endCurriculumResize={endCurriculumResize}
          curriculumSections={curriculumSections}
          curriculumLessonsById={curriculumLessonsById}
          curriculumScrollportRef={curriculumScrollportRef}
          selectedLesson={selectedLesson}
          lessonProgress={lessonProgress}
          selectLesson={selectLesson}
          lockedLessonNumbers={lockedLessonNumbers}
          onOpenCourseOverview={onOpenCourseOverview}
          courseNavigationActionLabel={courseNavigationActionLabel}
          courseTitle={courseTitle}
          courseThumbnail={courseThumbnail}
          courseThumbnailSrcSet={courseThumbnailSrcSet}
          curriculumFocusRequest={curriculumFocusRequest}
          coursePersistenceKey={coursePersistenceKey}
          curriculumLessonResources={curriculumLessonResources}
          courseSlug={courseSlug}
          curriculumQuizLessonNumbers={curriculumQuizLessonNumbers}
          showingQuiz={showingQuiz}
          handleOpenLessonQuiz={handleOpenLessonQuiz}
          isApiRoute={isApiRoute}
          isCourseOverviewLoading={isCourseOverviewLoading}
          courseUnavailable={courseUnavailable}
          setChaptersPanelHost={setChaptersPanelHost}
        />
      </main>

      <PrerenderedMobileCommentComposer />

      <FloatingScrollbar
        scrollportRef={curriculumScrollportRef}
        ariaControls="learning-course-curriculum-scrollport"
        ariaLabel="Course curriculum scroll position"
        className="floating-scrollbar--curriculum"
        disabled={curriculumCollapsed || theaterMode || lessonDrawer}
      />

      <Drawer
        key={phoneLessonDrawer ? "phone-course-lessons" : "side-course-lessons"}
        open={lessonDrawer}
        onOpenChange={(open) => {
          if (!open) closeLessonDrawer();
        }}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setLessonDrawerViewportBounds(null);
            if (phoneLessonDrawer)
              setLessonDrawerSnapPoint(lessonDrawerCollapsedSnapPoint);
          }
        }}
        snapPoints={phoneLessonDrawer ? lessonDrawerSnapPoints : undefined}
        snapPoint={phoneLessonDrawer ? lessonDrawerSnapPoint : undefined}
        onSnapPointChange={
          phoneLessonDrawer ? setLessonDrawerSnapPoint : undefined
        }
        snapToSequentialPoints={phoneLessonDrawer}
        showSwipeHandle={phoneLessonDrawer}
        swipeDirection={phoneLessonDrawer ? "down" : "right"}
        swipeHandleClassName="absolute inset-x-0 top-0 z-30 pt-2 group-data-[swipe-axis=y]/drawer-popup:h-7 group-data-[swipe-direction=down]/drawer-popup:items-start after:bg-white/75 after:shadow-[0_1px_3px_rgba(0,0,0,0.48)]"
        triggerId="learning-course-content-trigger"
      >
        <CourseLessonsDrawerContent
          lessonDrawerSurfaceRef={lessonDrawerSurfaceRef}
          lessonDrawerSkipFinalFocusRef={lessonDrawerSkipFinalFocusRef}
          previousFocusRef={previousFocusRef}
          lessonTriggerRef={lessonTriggerRef}
          phoneLessonDrawer={phoneLessonDrawer}
          lessonDrawerCollapsedSnapPoint={lessonDrawerCollapsedSnapPoint}
          lessonDrawerViewportBounds={lessonDrawerViewportBounds}
          floatingLessonDrawerWidth={floatingLessonDrawerWidth}
          floatingLessonDrawerResizing={floatingLessonDrawerResizing}
          floatingLessonDrawerViewportWidth={floatingLessonDrawerViewportWidth}
          floatingLessonDrawerSlidingClosed={floatingLessonDrawerSlidingClosed}
          handleFloatingLessonDrawerResizeKeyDown={
            handleFloatingLessonDrawerResizeKeyDown
          }
          startFloatingLessonDrawerResize={startFloatingLessonDrawerResize}
          handleLessonDrawerTouchStartCapture={
            handleLessonDrawerTouchStartCapture
          }
          curriculumSections={curriculumSections}
          curriculumLessonsById={curriculumLessonsById}
          lessonDrawerScrollportRef={lessonDrawerScrollportRef}
          selectedLesson={selectedLesson}
          lessonProgress={lessonProgress}
          lockedLessonNumbers={lockedLessonNumbers}
          selectLesson={selectLesson}
          onOpenCourseOverview={onOpenCourseOverview}
          courseNavigationActionLabel={courseNavigationActionLabel}
          courseTitle={courseTitle}
          courseThumbnail={courseThumbnail}
          courseThumbnailSrcSet={courseThumbnailSrcSet}
          lessonDrawerScrollTarget={lessonDrawerScrollTarget}
          lessonDrawerFocusRequest={lessonDrawerFocusRequest}
          lessonDrawerTopRequest={lessonDrawerTopRequest}
          coursePersistenceKey={coursePersistenceKey}
          curriculumLessonResources={curriculumLessonResources}
          courseSlug={courseSlug}
          curriculumQuizLessonNumbers={curriculumQuizLessonNumbers}
          showingQuiz={showingQuiz}
          handleOpenLessonQuiz={handleOpenLessonQuiz}
          isApiRoute={isApiRoute}
          isCourseOverviewLoading={isCourseOverviewLoading}
          courseUnavailable={courseUnavailable}
          closeLessonDrawer={closeLessonDrawer}
          setLessonDrawerSnapPoint={setLessonDrawerSnapPoint}
          lessonDrawerHeroControlProps={lessonDrawerHeroControlProps}
        />
      </Drawer>
      <FloatingScrollbar
        scrollportRef={lessonDrawerScrollportRef}
        rightEdgeRef={lessonDrawerSurfaceRef}
        ariaControls="lesson-drawer-curriculum-scrollport"
        ariaLabel="Course curriculum scroll position"
        className="floating-scrollbar--curriculum floating-scrollbar--drawer"
        disabled={!lessonDrawer}
      />
    </div>
  );
}
