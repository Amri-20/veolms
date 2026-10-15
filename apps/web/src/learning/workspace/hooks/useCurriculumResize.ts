import {
  useCallback,
  useEffect,
  useLayoutEffect,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useSecondPressHold } from "../../../gestures/useSecondPressHold";
import { FLOATING_SCROLLBAR_HORIZONTAL_DRAG_EVENT } from "../../../shell/FloatingScrollbar";
import type { FloatingScrollbarHorizontalDragDetail } from "../../../shell/FloatingScrollbar";
import { applyCurriculumDragWidth } from "../../curriculumDragWidth";
import {
  CURRICULUM_COLLAPSED_WIDTH,
  CURRICULUM_MAX_WIDTH,
  CURRICULUM_MIN_WIDTH,
} from "../../learningShellPreferences";
import {
  CURRICULUM_SNAP_WIDTH,
  CURRICULUM_RESIZE_STATE_SYNC_MS,
} from "../workspaceConstants";
import type {
  CurriculumResize,
  CurriculumPointerEvent,
} from "../workspaceGestureTypes";

export interface UseCurriculumResizeArgs {
  lessonStorageKey: string;
  selectedLesson: number;
  lessonDrawer: boolean;
  courseContentDrawerViewport: boolean;
  curriculumWidth: number;
  setCurriculumWidth: Dispatch<SetStateAction<number>>;
  curriculumCollapsed: boolean;
  setCurriculumCollapsed: Dispatch<SetStateAction<boolean>>;
  curriculumResizing: boolean;
  setCurriculumResizing: Dispatch<SetStateAction<boolean>>;
  setCurriculumResizePreviewWidth: Dispatch<SetStateAction<number | null>>;
  workspaceRef: RefObject<HTMLDivElement | null>;
  curriculumResizeRef: RefObject<CurriculumResize | null>;
  curriculumResizeSyncTimerRef: RefObject<number | undefined>;
  curriculumDragWidthAppliedRef: RefObject<boolean>;
  curriculumResizeMoveRef: RefObject<((event: PointerEvent) => void) | null>;
  curriculumResizeFinishRef: RefObject<
    ((event: PointerEvent, cancelled?: boolean) => void) | null
  >;
  beginCurriculumResizeRef: RefObject<
    ((pointerId: number, clientX: number, handle: HTMLElement) => void) | null
  >;
  curriculumScreenSwipeConsumedUntilRef: RefObject<number>;
  isCourseContentDrawerLayout: () => boolean;
  openLessonDrawer: () => void;
  closeLessonDrawer: () => void;
  openFloatingLessonDrawer: () => void;
  commitCurriculumWidth: (value: number) => void;
}

export interface UseCurriculumResizeResult {
  startCurriculumResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
  moveCurriculumResize: (event: CurriculumPointerEvent) => void;
  endCurriculumResize: (
    event: CurriculumPointerEvent,
    cancelled?: boolean,
  ) => void;
  handleCurriculumResizeKeyDown: (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => void;
  toggleCurriculumFromResizeRail: () => void;
  curriculumToggleGesture: ReturnType<
    typeof useSecondPressHold<HTMLButtonElement>
  >;
}

export function useCurriculumResize({
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
}: UseCurriculumResizeArgs): UseCurriculumResizeResult {
  const beginCurriculumResize = useCallback(
    (pointerId: number, clientX: number, handle: HTMLElement) => {
      if (isCourseContentDrawerLayout()) return;
      curriculumResizeRef.current = {
        pointerId,
        startX: clientX,
        startWidth: curriculumCollapsed
          ? CURRICULUM_COLLAPSED_WIDTH
          : curriculumWidth,
        expandedWidthAtStart: curriculumWidth,
        collapsedAtStart: curriculumCollapsed,
        collapsed: curriculumCollapsed,
        previewWidth: curriculumCollapsed
          ? CURRICULUM_COLLAPSED_WIDTH
          : curriculumWidth,
        expandedWidth: curriculumWidth,
        handle,
      };
      setCurriculumResizePreviewWidth(
        curriculumCollapsed ? CURRICULUM_COLLAPSED_WIDTH : curriculumWidth,
      );
      setCurriculumResizing(true);
    },
    [
      curriculumCollapsed,
      curriculumWidth,
      isCourseContentDrawerLayout,
      curriculumResizeRef,
      setCurriculumResizePreviewWidth,
      setCurriculumResizing,
    ],
  );

  useLayoutEffect(() => {
    beginCurriculumResizeRef.current = beginCurriculumResize;
  }, [beginCurriculumResize, beginCurriculumResizeRef]);

  const startCurriculumResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCourseContentDrawerLayout()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginCurriculumResize(event.pointerId, event.clientX, event.currentTarget);
  };

  // While the gutter is held, the course content is exactly as wide as the
  // pointer makes it, from nothing to the maximum: it never jumps to a
  // width of its own. Where it settles (closed, its minimum, or the width
  // it was dragged to) is decided when the pointer is released.
  //
  // The width is written directly onto the elements sized from it (see
  // curriculumDragWidth.ts), so the split is laid out for it in this same
  // frame. It used to travel through React state alone, which re-rendered
  // the whole workspace for every movement of the pointer; those renders
  // took several frames each, so the layout followed the pointer in jumps.
  // React still hears the width at once where it changes what is rendered
  // (closed or open, sliding closed or not), and otherwise when the pointer
  // comes to rest.
  const moveCurriculumResize = useCallback(
    (event: CurriculumPointerEvent) => {
      const resize = curriculumResizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;

      const previewWidth = Math.min(
        CURRICULUM_MAX_WIDTH,
        Math.max(
          CURRICULUM_COLLAPSED_WIDTH,
          resize.startWidth + resize.startX - event.clientX,
        ),
      );

      // The content itself shows for as long as there is any width to show it
      // in, so it slides out from the edge instead of appearing at a threshold.
      const hidden = previewWidth <= CURRICULUM_COLLAPSED_WIDTH;
      if (resize.collapsed !== hidden) {
        resize.collapsed = hidden;
        setCurriculumCollapsed(hidden);
      }

      const slidingClosed = previewWidth < CURRICULUM_MIN_WIDTH;
      const rendersDifferently =
        resize.previewWidth < CURRICULUM_MIN_WIDTH !== slidingClosed;
      resize.previewWidth = previewWidth;
      if (!slidingClosed) resize.expandedWidth = previewWidth;
      const workspace = workspaceRef.current;
      if (workspace) {
        curriculumDragWidthAppliedRef.current = true;
        applyCurriculumDragWidth(workspace, resize);
      }

      const syncState = () => {
        const current = curriculumResizeRef.current;
        if (current !== resize) return;
        setCurriculumResizePreviewWidth(resize.previewWidth);
        setCurriculumWidth(resize.expandedWidth);
      };
      window.clearTimeout(curriculumResizeSyncTimerRef.current);
      if (rendersDifferently) {
        syncState();
      } else {
        curriculumResizeSyncTimerRef.current = window.setTimeout(
          syncState,
          CURRICULUM_RESIZE_STATE_SYNC_MS,
        );
      }
    },
    [
      curriculumDragWidthAppliedRef,
      curriculumResizeRef,
      curriculumResizeSyncTimerRef,
      setCurriculumCollapsed,
      setCurriculumResizePreviewWidth,
      setCurriculumWidth,
      workspaceRef,
    ],
  );
  const endCurriculumResize = useCallback(
    (event: CurriculumPointerEvent, cancelled = false) => {
      const resize = curriculumResizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      curriculumResizeRef.current = null;
      window.clearTimeout(curriculumResizeSyncTimerRef.current);
      setCurriculumResizing(false);
      setCurriculumResizePreviewWidth(null);
      resize.handle?.releasePointerCapture?.(resize.pointerId);
      // A drag handed over from a swipe on the panel swallows taps while it
      // lasts; from here they are swallowed only for a moment longer.
      if (curriculumScreenSwipeConsumedUntilRef.current > performance.now()) {
        curriculumScreenSwipeConsumedUntilRef.current = performance.now() + 450;
      }

      if (cancelled) {
        setCurriculumCollapsed(resize.collapsedAtStart);
        setCurriculumWidth(resize.expandedWidthAtStart);
        return;
      }
      // Let go less than half-way to the minimum width, it closes (and
      // keeps the width it had for next time). Anything wider stays open,
      // at the minimum width if it was let go narrower than that.
      if (resize.previewWidth < CURRICULUM_SNAP_WIDTH) {
        setCurriculumCollapsed(true);
        setCurriculumWidth(resize.expandedWidthAtStart);
        return;
      }
      setCurriculumCollapsed(false);
      commitCurriculumWidth(resize.previewWidth);
    },
    [
      commitCurriculumWidth,
      curriculumResizeRef,
      curriculumResizeSyncTimerRef,
      curriculumScreenSwipeConsumedUntilRef,
      setCurriculumCollapsed,
      setCurriculumResizePreviewWidth,
      setCurriculumResizing,
      setCurriculumWidth,
    ],
  );

  useEffect(() => {
    const handleScrollbarHorizontalDrag = (event: Event) => {
      const { detail } =
        event as CustomEvent<FloatingScrollbarHorizontalDragDetail>;
      if (detail.ariaControls !== "courses-main-scrollport") return;

      if (detail.phase === "start") {
        beginCurriculumResize(detail.pointerId, detail.clientX, detail.handle);
      } else if (detail.phase === "move") {
        moveCurriculumResize(detail);
      } else {
        endCurriculumResize(detail, detail.phase === "cancel");
      }
    };

    window.addEventListener(
      FLOATING_SCROLLBAR_HORIZONTAL_DRAG_EVENT,
      handleScrollbarHorizontalDrag,
    );
    return () =>
      window.removeEventListener(
        FLOATING_SCROLLBAR_HORIZONTAL_DRAG_EVENT,
        handleScrollbarHorizontalDrag,
      );
  }, [beginCurriculumResize, endCurriculumResize, moveCurriculumResize]);

  useLayoutEffect(() => {
    curriculumResizeMoveRef.current = moveCurriculumResize;
    curriculumResizeFinishRef.current = endCurriculumResize;

    return () => {
      if (curriculumResizeMoveRef.current === moveCurriculumResize) {
        curriculumResizeMoveRef.current = null;
      }
      if (curriculumResizeFinishRef.current === endCurriculumResize) {
        curriculumResizeFinishRef.current = null;
      }
    };
  }, [
    moveCurriculumResize,
    endCurriculumResize,
    curriculumResizeFinishRef,
    curriculumResizeMoveRef,
  ]);

  useEffect(() => {
    if (!curriculumResizing) return undefined;
    const continueResize = (event: PointerEvent) =>
      curriculumResizeMoveRef.current?.(event);
    const finishResize = (event: PointerEvent) =>
      curriculumResizeFinishRef.current?.(event);
    const cancelResize = (event: PointerEvent) =>
      curriculumResizeFinishRef.current?.(event, true);
    window.addEventListener("pointermove", continueResize);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", cancelResize);
    return () => {
      window.removeEventListener("pointermove", continueResize);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", cancelResize);
    };
  }, [curriculumResizing, curriculumResizeFinishRef, curriculumResizeMoveRef]);

  const handleCurriculumResizeKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      if (curriculumCollapsed && event.key === "ArrowLeft") {
        setCurriculumCollapsed(false);
        commitCurriculumWidth(CURRICULUM_MIN_WIDTH);
        return;
      }
      if (!curriculumCollapsed) {
        const direction = event.key === "ArrowRight" ? -16 : 16;
        commitCurriculumWidth(curriculumWidth + direction);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setCurriculumCollapsed(true);
    } else if (event.key === "End") {
      event.preventDefault();
      setCurriculumCollapsed(false);
      commitCurriculumWidth(CURRICULUM_MAX_WIDTH);
    }
  };

  const toggleCurriculumFromResizeRail = () => {
    if (isCourseContentDrawerLayout()) return;
    setCurriculumCollapsed((collapsed) => !collapsed);
  };

  const toggleCurriculumFromPlayer = () => {
    if (isCourseContentDrawerLayout()) {
      if (lessonDrawer) closeLessonDrawer();
      else openLessonDrawer();
      return;
    }
    setCurriculumCollapsed((collapsed) => !collapsed);
  };

  const curriculumToggleGesture = useSecondPressHold<HTMLButtonElement>({
    onPress: toggleCurriculumFromPlayer,
    onSecondPressHold: openFloatingLessonDrawer,
    secondPressWindow: courseContentDrawerViewport ? 700 : undefined,
  });

  useEffect(() => {
    try {
      localStorage.setItem(lessonStorageKey, String(selectedLesson));
    } catch {
      // Lesson selection remains usable when browser storage is unavailable.
    }
  }, [lessonStorageKey, selectedLesson]);

  useEffect(() => {
    try {
      sessionStorage.removeItem("veolms-course-autostart");
    } catch {
      // Retired preferences are cleaned up on a best-effort basis.
    }
  }, []);
  return {
    startCurriculumResize,
    moveCurriculumResize,
    endCurriculumResize,
    handleCurriculumResizeKeyDown,
    toggleCurriculumFromResizeRail,
    curriculumToggleGesture,
  };
}
