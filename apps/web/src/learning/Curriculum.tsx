import { OctopusIllustration } from "../components/OctopusIllustration";
import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/CaretDown";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { LessonResource } from "@veolms/contracts";
import { DEFAULT_DEBOUNCE_DELAY_MS, useDebounce } from "../hooks/useDebounce";
import { ExpandableSearch } from "../ExpandableSearch";
import { CourseThumbnailPlaceholder } from "../courses/CourseThumbnailPlaceholder";
import { ContextMenu, ContextMenuTrigger } from "../components/ui/context-menu";
import { ElasticScroller } from "../components/elastic-scroller";
import type { ElasticScrollerHandle } from "../components/elastic-scroller";
import { CurriculumSectionActionsMenuContent } from "./CurriculumSectionActionsMenu";
import { getInitialCurriculumExpandedSections } from "./curriculumExpandedSections";
import { formatTotalLessonDuration } from "./courseContent";
import type { CourseSection, Lesson } from "./courseContent";
import { CurriculumProgressBar } from "./CurriculumProgressBar";

import {
  isStoredBoolean,
  isStoredString,
  useSessionStorageState,
} from "./useSessionStorageState";
import type { LessonDrawerHeroControlProps } from "./useLessonDrawerHeroControl";
import { CurriculumLessonRows } from "./CurriculumLessonRows";
import { useContinuousLessonNumbering } from "./useContinuousLessonNumbering";
import { useCurriculumSectionScrollAnchor } from "./useCurriculumSectionScrollAnchor";
import {
  formatCourseProgress,
  roundCourseProgress,
} from "./courseProgressFormat";

const EMPTY_CURRICULUM_SECTIONS: CourseSection[] = [];
const EMPTY_LESSONS_BY_ID: ReadonlyMap<number, Lesson> = new Map();

const LESSON_PROGRESS_COMPLETE_THRESHOLD = 99.5;
/** The course's percentage while the learner's progress is on its way. */
const PROGRESS_SHIMMER =
  "animate-pulse rounded-[4px] bg-[color-mix(in_srgb,currentColor_24%,transparent)] motion-reduce:animate-none";

interface CurriculumProps {
  selectedLesson: number;
  sections?: readonly CourseSection[];
  lessonsById?: ReadonlyMap<number, Lesson>;
  lessonProgress?: Readonly<Record<number, number>>;
  /**
   * The learner's progress is still on its way (the session has not said
   * who they are, or theirs has not arrived): the course's progress
   * shimmers instead of saying 0%. A page built ahead of time does not know
   * the visitor either; a visitor (no session remembered, see
   * store/sessionPresence.ts) is shown 0% from the first paint.
   */
  progressPending?: boolean;
  onSelectLesson: (lessonNumber: number) => void;
  onOpenCourseOverview?: () => void;
  courseNavigationActionLabel?: string;
  courseTitle: string;
  courseThumbnail?: string;
  courseThumbnailSrcSet?: string;
  onClose?: () => void;
  onLessonSearchOpen?: () => void;
  focusRequest?: number;
  topRequest?: number;
  persistenceKey: string;
  isLessonAvailable?: (lessonNumber: number) => boolean;
  /** Lessons the visitor cannot play yet; their cards show a lock. */
  lockedLessonNumbers?: ReadonlySet<number>;
  isLoading?: boolean;
  /**
   * The course could not be loaded, or has no lessons. There is then no
   * course to head the panel with and nothing to list, and it says so
   * instead of drawing a header out of the address's slug and blanks.
   */
  unavailable?: boolean;
  /**
   * With `unavailable`: the course is not missing or empty, loading it
   * failed (the server could not be reached, say), and the panel says that.
   */
  loadFailed?: boolean;
  scrollportId?: string;
  scrollportRef?: RefObject<HTMLElement | null>;
  scrollControlBottomClearance?: number | string;
  drawerHeroControlProps?: LessonDrawerHeroControlProps;
  hideHero?: boolean;
  expandAllSections?: boolean;
  expandedSectionIds?: readonly number[];
  onExpandedSectionIdsChange?: (sectionIds: readonly number[]) => void;
  /** Downloadable files of each lesson that has any, by lesson number. */
  lessonResources?: ReadonlyMap<number, readonly LessonResource[]>;
  /** Course slug or id the resources are downloaded through. */
  resourceCourseKey?: string;
  /** Lessons with a quiz attached. */
  quizLessonNumbers?: ReadonlySet<number>;
  /** The lesson whose quiz is currently open, if any. */
  activeQuizLesson?: number | null;
  onOpenLessonQuiz?: (lessonNumber: number) => void;
}

/** A little over the time a section takes to close (learning.css). */
const SECTION_CLOSE_MS = 260;

/**
 * A section's lessons, kept in the page while the section closes. The
 * closing is a transition of the row they stand in; taken out the moment
 * the section is told to close, they left nothing for it to animate and
 * the section simply vanished. They go once it has shut.
 */
function ClosingSectionLessons({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [lingering, setLingering] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setLingering(!open);
  }
  useEffect(() => {
    if (!lingering) return undefined;
    const timer = window.setTimeout(
      () => setLingering(false),
      SECTION_CLOSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [lingering]);
  return open || lingering ? children : null;
}

/**
 * Memoized: the lesson page around it renders for reasons of its own (its
 * panel being dragged wider is one), and everything it is given is stable
 * across those.
 */
export const Curriculum = memo(function Curriculum({
  selectedLesson,
  sections = EMPTY_CURRICULUM_SECTIONS,
  lessonsById = EMPTY_LESSONS_BY_ID,
  lessonProgress = {},
  progressPending = false,
  onSelectLesson,
  onOpenCourseOverview,
  courseNavigationActionLabel,
  courseTitle,
  courseThumbnail = "",
  courseThumbnailSrcSet,
  onClose,
  onLessonSearchOpen,
  focusRequest = 0,
  topRequest = 0,
  persistenceKey,
  isLessonAvailable,
  lockedLessonNumbers,
  isLoading = false,
  unavailable = false,
  loadFailed = false,
  scrollportId,
  scrollportRef,
  scrollControlBottomClearance,
  drawerHeroControlProps,
  hideHero = false,
  expandAllSections = false,
  expandedSectionIds: controlledExpandedSectionIds,
  onExpandedSectionIdsChange,
  lessonResources,
  resourceCourseKey,
  quizLessonNumbers,
  activeQuizLesson,
  onOpenLessonQuiz,
}: CurriculumProps) {
  const sectionIds = sections.map(({ id }) => id);
  const isExpandedControlled = controlledExpandedSectionIds !== undefined;
  const [uncontrolledExpandedSectionIds, setUncontrolledExpandedSectionIds] =
    useState<number[]>(() =>
      getInitialCurriculumExpandedSections(sections, selectedLesson, {
        expandAllSections,
        hideHero,
      }),
    );
  const expanded =
    controlledExpandedSectionIds ?? uncontrolledExpandedSectionIds;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const setExpanded = useCallback(
    (
      value:
        readonly number[] | ((current: readonly number[]) => readonly number[]),
    ) => {
      const resolveNext = (current: readonly number[]) =>
        typeof value === "function" ? value(current) : value;
      if (onExpandedSectionIdsChange) {
        onExpandedSectionIdsChange(resolveNext(expandedRef.current));
        return;
      }
      setUncontrolledExpandedSectionIds((current) => [...resolveNext(current)]);
    },
    [onExpandedSectionIdsChange],
  );
  const storageBase = `veolms-learning-${persistenceKey}-curriculum`;
  const [lessonSearch, setLessonSearch] = useSessionStorageState(
    `${storageBase}-search`,
    "",
    isStoredString,
  );
  const [searchOpen, setSearchOpen] = useSessionStorageState(
    `${storageBase}-search-open`,
    false,
    isStoredBoolean,
  );
  const debouncedLessonSearch = useDebounce(
    lessonSearch,
    DEFAULT_DEBOUNCE_DELAY_MS,
  );
  const activeLessonSearch = searchOpen ? debouncedLessonSearch : "";
  const lessonSearchInputId = `learning-curriculum-search-${useId().replaceAll(":", "")}`;
  const activeLessonRef = useRef<HTMLButtonElement>(null);
  const currentSectionRef = useRef<HTMLElement>(null);
  const lessonListRef = useRef<HTMLDivElement>(null);
  const curriculumRef = useRef<HTMLElement>(null);
  const contextMenuPortalHostRef = useRef<HTMLElement | null>(null);
  const scrollControlRef = useRef<ElasticScrollerHandle>(null);
  const handledFocusRequestRef = useRef(0);
  const handledTopRequestRef = useRef(0);
  const fallbackSection: CourseSection = {
    id: 0,
    title: "",
    progress: "",
    lessons: [],
  };
  const fallbackLesson: Lesson = [selectedLesson || 1, "", "", "todo"];
  const currentSection =
    sections.find((section) =>
      section.lessons.some(([number]) => number === selectedLesson),
    ) ||
    sections[0] ||
    fallbackSection;
  const currentLesson =
    lessonsById?.get(selectedLesson) || lessonsById?.get(1) || fallbackLesson;
  // Lessons are numbered from 1 in each section unless the learner has
  // chosen to have them numbered straight through the course. A lesson's
  // own number is its place in the course; what a section takes off it is
  // one less than its first lesson's.
  const continuousLessonNumbering = useContinuousLessonNumbering();
  const getLessonNumberBase = (section: CourseSection) =>
    continuousLessonNumbering ? 0 : (section.lessons[0]?.[0] ?? 1) - 1;
  const selectedLessonDisplayNumber =
    selectedLesson - getLessonNumberBase(currentSection);
  useEffect(() => {
    if (expandAllSections || isExpandedControlled) return;
    // The section of the lesson being played is opened; the ones the
    // learner has opened themselves stay as they are.
    if (expandedRef.current.includes(currentSection.id)) return;
    setExpanded((current) => [...current, currentSection.id]);
  }, [
    currentSection.id,
    expandAllSections,
    hideHero,
    isExpandedControlled,
    selectedLesson,
    setExpanded,
  ]);

  const setCurriculumScrollport = useCallback(
    (node: HTMLElement | null) => {
      curriculumRef.current = node;
      contextMenuPortalHostRef.current =
        node?.closest<HTMLElement>(".video-shell") ?? null;
      if (scrollportRef) scrollportRef.current = node;
    },
    [scrollportRef],
  );

  const isSectionExpanded = useCallback(
    (sectionId: number) => expandedRef.current.includes(sectionId),
    [],
  );
  const { handleCollapseTransitionEnd } = useCurriculumSectionScrollAnchor(
    curriculumRef,
    isSectionExpanded,
  );

  const getLessonProgress = (number: number, status: string) => {
    const storedProgress = lessonProgress[number];
    if (typeof storedProgress === "number")
      return Math.max(0, Math.min(100, storedProgress));
    if (status === "done") return 100;
    return 0;
  };

  const allLessons = sections.flatMap(({ lessons }) => lessons);
  // With two decimals, as course progress is shown everywhere (0.42%).
  const courseProgress =
    allLessons.length > 0
      ? roundCourseProgress(
          allLessons.reduce(
            (total, [number, , , status]) =>
              total + getLessonProgress(number, status),
            0,
          ) / allLessons.length,
        )
      : 0;
  // Any lesson with progress kept, a few seconds of one included: the bar
  // then shows a sliver even while the course is still at 0.00%.
  const courseStarted = allLessons.some(
    ([number, , , status]) =>
      typeof lessonProgress[number] === "number" || status === "done",
  );
  const scrollItemToTop = (element: HTMLElement | null) => {
    const curriculum = element?.closest<HTMLElement>(".learning-curriculum");
    if (!element || !curriculum) return;

    // A lesson stops as far below the top edge as lessons are from one
    // another (the list gap), instead of touching it. A section heading
    // still goes flush to the top.
    const lessonList = element.closest<HTMLElement>(".flex.flex-col");
    const topMargin =
      element === currentSectionRef.current || !lessonList
        ? 0
        : Number.parseFloat(getComputedStyle(lessonList).rowGap) || 0;
    // In the full panel an open section's heading holds to the top while
    // its lessons scroll under it. A lesson brought to the top stops below
    // that heading, not behind it.
    const sectionHeading =
      element === currentSectionRef.current
        ? null
        : (element
            .closest(".learning-curriculum__section")
            ?.querySelector<HTMLElement>(
              ":scope > .learning-curriculum__section-toggle",
            ) ?? null);
    const headingSpace =
      sectionHeading && getComputedStyle(sectionHeading).position === "sticky"
        ? sectionHeading.offsetHeight
        : 0;
    const itemTop = Math.max(
      0,
      element.getBoundingClientRect().top -
        curriculum.getBoundingClientRect().top +
        curriculum.scrollTop -
        topMargin -
        headingSpace,
    );

    if (typeof curriculum.scrollTo === "function") {
      curriculum.scrollTo({
        top: itemTop,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    } else {
      curriculum.scrollTop = itemTop;
    }
  };

  const revealAndScrollTo = (
    target: "section" | "chapter",
    sectionId: number,
  ) => {
    setSearchOpen(false);
    setExpanded((current) =>
      current.includes(sectionId) ? current : [...current, sectionId],
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetElement =
          target === "section"
            ? currentSectionRef.current
            : activeLessonRef.current;
        const curriculum = targetElement?.closest<HTMLElement>(
          ".learning-curriculum",
        );
        const lessonList = lessonListRef.current;
        if (!targetElement || !curriculum || !lessonList) return;

        const targetTop =
          targetElement.getBoundingClientRect().top -
          curriculum.getBoundingClientRect().top +
          curriculum.scrollTop;
        const currentRevealSpace = Number.parseFloat(
          lessonList.dataset.revealSpace || "0",
        );
        const maximumScrollWithoutRevealSpace = Math.max(
          0,
          curriculum.scrollHeight -
            currentRevealSpace -
            curriculum.clientHeight,
        );
        const nextRevealSpace = Math.ceil(
          Math.max(0, targetTop - maximumScrollWithoutRevealSpace) + 4,
        );

        if (nextRevealSpace !== currentRevealSpace) {
          lessonList.dataset.revealSpace = String(nextRevealSpace);
          lessonList.style.setProperty(
            "--curriculum-reveal-space",
            `${nextRevealSpace}px`,
          );
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => scrollItemToTop(targetElement));
          });
          return;
        }

        scrollItemToTop(targetElement);
      });
    });
  };

  const openLessonSearch = useCallback(() => {
    onLessonSearchOpen?.();
    scrollControlRef.current?.scrollToStart();
    setSearchOpen(true);
  }, [onLessonSearchOpen, setSearchOpen]);

  const handleLessonSearchOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (!searchOpen) openLessonSearch();
        return;
      }
      setSearchOpen(false);
    },
    [openLessonSearch, searchOpen, setSearchOpen],
  );

  useEffect(() => {
    const lessonList = lessonListRef.current;
    if (!lessonList) return;
    lessonList.dataset.revealSpace = "0";
    lessonList.style.setProperty("--curriculum-reveal-space", "0px");
  }, [selectedLesson]);

  // Any number of sections can be open: opening one leaves the others alone.
  const toggleSection = (id: number) => {
    setSearchOpen(false);
    setExpanded((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  useEffect(() => {
    if (!focusRequest || focusRequest === handledFocusRequestRef.current)
      return undefined;

    handledFocusRequestRef.current = focusRequest;
    setExpanded((current) =>
      current.includes(currentSection.id)
        ? current
        : [...current, currentSection.id],
    );

    let firstFrame: number;
    let secondFrame: number | undefined;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollItemToTop(activeLessonRef.current);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [focusRequest, currentSection.id, setExpanded]);

  useEffect(() => {
    if (!topRequest || topRequest === handledTopRequestRef.current)
      return undefined;

    handledTopRequestRef.current = topRequest;
    setSearchOpen(false);

    let firstFrame: number;
    let secondFrame: number | undefined;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollControlRef.current?.scrollToStart();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [setSearchOpen, topRequest]);

  useEffect(() => {
    if (!hideHero) return undefined;

    let firstFrame: number;
    let secondFrame: number | undefined;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const targetElement = currentSectionRef.current;
        const curriculum = targetElement?.closest<HTMLElement>(
          ".learning-curriculum",
        );
        const lessonList = lessonListRef.current;
        if (!targetElement || !curriculum) return;

        if (lessonList) {
          const targetTop =
            targetElement.getBoundingClientRect().top -
            curriculum.getBoundingClientRect().top +
            curriculum.scrollTop;
          const currentRevealSpace = Number.parseFloat(
            lessonList.dataset.revealSpace || "0",
          );
          const maximumScrollWithoutRevealSpace = Math.max(
            0,
            curriculum.scrollHeight -
              currentRevealSpace -
              curriculum.clientHeight,
          );
          const nextRevealSpace = Math.ceil(
            Math.max(0, targetTop - maximumScrollWithoutRevealSpace) + 4,
          );

          if (nextRevealSpace !== currentRevealSpace) {
            lessonList.dataset.revealSpace = String(nextRevealSpace);
            lessonList.style.setProperty(
              "--curriculum-reveal-space",
              `${nextRevealSpace}px`,
            );
          }
        }

        scrollItemToTop(targetElement);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [hideHero, currentSection.id]);

  return (
    <ContextMenu>
      <aside
        ref={setCurriculumScrollport}
        id={scrollportId}
        // It scrolls, so how a finger may pan is decided here: up and down
        // only. Sideways swipes then reach the page, which resizes the panel
        // with them (a browser would otherwise claim them itself).
        className={`learning-curriculum touch-pan-y touch-pinch-zoom ${hideHero ? "learning-curriculum--compact" : ""}`}
        aria-label="Course curriculum"
      >
        <ElasticScroller
          ref={scrollControlRef}
          scrollportRef={curriculumRef}
          ariaControls={scrollportId}
          scrollAreaLabel="Curriculum"
          contentRevision={`${selectedLesson}:${activeLessonSearch}:${expanded.join(",")}`}
          bottomClearance={scrollControlBottomClearance}
        />
        {/* Until the course is known the header has nothing true to show:
            its title would be the address's slug, its progress zero, its
            section and lesson blank, its cover a placeholder. So while the
            course loads it is bars, like the list under it. */}
        {!hideHero && isLoading && !unavailable ? (
          <div
            className="animate-pulse space-y-4 px-5 pt-6 pb-5"
            aria-hidden="true"
            data-testid="curriculum-hero-skeleton"
          >
            <div className="h-5 w-3/5 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
            <div className="space-y-2.5 pt-3">
              <div className="flex justify-between">
                <div className="h-3.5 w-16 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
                <div className="h-3.5 w-8 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
              </div>
              <div className="h-2 w-full rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 flex-1 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
              <div className="h-3 flex-1 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
            </div>
          </div>
        ) : null}
        {!hideHero && !isLoading && !unavailable ? (
          <ContextMenuTrigger
            render={
              <div
                {...drawerHeroControlProps}
                className="learning-curriculum__hero"
              />
            }
          >
            {courseThumbnail ? (
              <img
                src={courseThumbnail}
                srcSet={courseThumbnailSrcSet}
                sizes="(max-width: 820px) 100vw, 400px"
                alt=""
                className="learning-curriculum__cover"
              />
            ) : (
              <div className="learning-curriculum__cover overflow-hidden">
                <CourseThumbnailPlaceholder />
              </div>
            )}
            <div className="learning-curriculum__shade" aria-hidden="true" />
            <button
              type="button"
              className="learning-curriculum__overview-link"
              aria-label={
                searchOpen
                  ? "Close lesson search"
                  : (courseNavigationActionLabel ??
                    `View course overview for ${courseTitle}`)
              }
              title={
                searchOpen
                  ? "Close search"
                  : (courseNavigationActionLabel ?? "View")
              }
              onClick={() => {
                if (searchOpen) {
                  setSearchOpen(false);
                  return;
                }
                onOpenCourseOverview?.();
              }}
            />
            <header className="learning-curriculum__overview">
              <div className="learning-curriculum__overview-content">
                <div className="learning-curriculum__title-row @container">
                  <ExpandableSearch
                    inputId={lessonSearchInputId}
                    label="Search lessons"
                    placeholder="Search lessons..."
                    value={lessonSearch}
                    onValueChange={setLessonSearch}
                    open={searchOpen}
                    onOpenChange={handleLessonSearchOpenChange}
                    overlay
                    shortcutPriority
                    backLabel="Back from lesson search"
                    triggerClassName="learning-curriculum__search-trigger rounded-full"
                    triggerIconSize={21.375}
                    backButtonClassName="learning-curriculum__search-trigger rounded-full"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[clamp(1rem,4.25cqi,1.1875rem)]">
                        {courseTitle}
                      </h2>
                    </div>
                  </ExpandableSearch>
                </div>
              </div>
            </header>

            <div className="learning-curriculum__sticky-meta">
              <div className="learning-curriculum__progress-copy">
                <span>Progress</span>
                {progressPending ? (
                  <>
                    <strong className="[:root[data-session-hint=signed-in]_&]:hidden">
                      {formatCourseProgress(0)}
                    </strong>
                    <i
                      aria-hidden="true"
                      className={`${PROGRESS_SHIMMER} hidden h-[0.95rem] w-[3.1rem] [:root[data-session-hint=signed-in]_&]:inline-block`}
                    />
                  </>
                ) : (
                  <strong>{formatCourseProgress(courseProgress)}</strong>
                )}
              </div>
              <div
                className={`learning-curriculum__progress-track ${
                  progressPending
                    ? "[:root[data-session-hint=signed-in]_&]:animate-pulse [:root[data-session-hint=signed-in]_&]:motion-reduce:animate-none"
                    : ""
                }`}
                aria-busy={progressPending || undefined}
                role="progressbar"
                aria-label={`Course progress: ${courseProgress} percent`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={courseProgress}
              >
                <span
                  className={
                    progressPending
                      ? "[:root[data-session-hint=signed-in]_&]:invisible"
                      : undefined
                  }
                  style={{
                    width: `${courseProgress}%`,
                    minWidth: courseStarted ? "0.375rem" : undefined,
                  }}
                />
              </div>
              <div
                className="learning-curriculum__current"
                aria-label="Current lesson location"
              >
                <button
                  type="button"
                  className="learning-curriculum__current-action"
                  aria-label={`Go to current section, Section ${currentSection.id}: ${currentSection.title}`}
                  title={`Go to Section ${currentSection.id}: ${currentSection.title}`}
                  onClick={() => {
                    if (searchOpen) {
                      setSearchOpen(false);
                      return;
                    }
                    revealAndScrollTo("section", currentSection.id);
                  }}
                >
                  <span
                    className="learning-curriculum__current-key"
                    aria-hidden="true"
                  >
                    S{currentSection.id}:
                  </span>
                  <span className="learning-curriculum__current-label">
                    {currentSection.title}
                  </span>
                </button>
                <button
                  type="button"
                  className="learning-curriculum__current-action"
                  aria-label={`Go to current chapter, Chapter ${selectedLessonDisplayNumber}: ${currentLesson[1]}`}
                  title={`Go to Chapter ${selectedLessonDisplayNumber}: ${currentLesson[1]}`}
                  onClick={() => {
                    if (searchOpen) {
                      setSearchOpen(false);
                      return;
                    }
                    revealAndScrollTo("chapter", currentSection.id);
                  }}
                >
                  <span
                    className="learning-curriculum__current-key"
                    aria-hidden="true"
                  >
                    L{selectedLessonDisplayNumber}:
                  </span>
                  <span className="learning-curriculum__current-label">
                    {currentLesson[1]}
                  </span>
                </button>
              </div>
            </div>
          </ContextMenuTrigger>
        ) : null}

        <div ref={lessonListRef} className="learning-curriculum__lesson-list">
          {unavailable ? (
            <div className="grid min-h-60 place-items-center px-6 py-10 text-center">
              <div className="space-y-2">
                <OctopusIllustration
                  kind={loadFailed ? "went-wrong" : "not-found"}
                  className="mx-auto mb-3 h-28 w-auto"
                />
                <p className="text-sm font-semibold text-(--text)">
                  {loadFailed
                    ? "Couldn't load the lessons"
                    : "No course content"}
                </p>
                <p className="text-[0.8125rem] leading-5 text-(--muted)">
                  {loadFailed
                    ? "They will be listed here once the course loads."
                    : "Lessons will be listed here once the course opens."}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div
              className="p-3 space-y-4 animate-pulse"
              data-testid="curriculum-loading-skeleton"
              aria-label="Loading curriculum"
            >
              {[1, 2, 3].map((sectionIndex) => (
                <div key={sectionIndex} className="space-y-2.5">
                  <div className="flex items-center justify-between py-2 px-1">
                    <div className="h-4 w-36 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
                    <div className="h-3.5 w-8 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
                  </div>
                  <div className="space-y-1.5 pl-6">
                    <div className="h-7 w-4/5 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
                    <div className="h-7 w-3/5 rounded bg-[color-mix(in_srgb,var(--surface-strong)_84%,var(--canvas))]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            sections.map((section) => {
              const matchingLessons = section.lessons.filter((lesson) =>
                lesson[1]
                  .toLowerCase()
                  .includes(activeLessonSearch.toLowerCase()),
              );
              const completedLessons = section.lessons.filter(
                ([number, , , status]) =>
                  getLessonProgress(number, status) >=
                  LESSON_PROGRESS_COMPLETE_THRESHOLD,
              ).length;
              const lessonCount = section.lessons.length;
              const sectionDuration = formatTotalLessonDuration(
                section.lessons,
              );
              const sectionProgress = `${completedLessons}/${lessonCount}`;
              const sectionComplete =
                lessonCount > 0 && completedLessons === lessonCount;
              const isOpen =
                expanded.includes(section.id) ||
                Boolean(activeLessonSearch && matchingLessons.length > 0);
              if (
                activeLessonSearch &&
                !section.title
                  .toLowerCase()
                  .includes(activeLessonSearch.toLowerCase()) &&
                matchingLessons.length === 0
              )
                return null;
              return (
                <section
                  key={section.id}
                  ref={
                    section.id === currentSection.id
                      ? currentSectionRef
                      : undefined
                  }
                  // The line between sections is a faint one in the panel,
                  // where the headings are far apart. The mini player's rows
                  // are dense, so its line is half as thick: a full pixel
                  // there is two on a scaled screen, and reads as a bar.
                  className={`learning-curriculum__section relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] ${
                    hideHero
                      ? "after:origin-bottom after:scale-y-50 after:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]"
                      : "after:bg-[color-mix(in_srgb,var(--text)_7%,transparent)]"
                  }`}
                  data-expanded={isOpen}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpen}
                    className="learning-curriculum__section-toggle"
                  >
                    {hideHero ? (
                      <>
                        <span
                          className={`learning-curriculum__section-arrow${isOpen ? " is-open" : ""}`}
                          aria-hidden="true"
                        >
                          <CaretDown size={17} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          Section {section.id}: {section.title}
                        </span>
                        <span className="learning-curriculum__section-progress">
                          {sectionProgress}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold tracking-[0.1em] uppercase text-(--muted)">
                            Section {section.id} · {lessonCount}{" "}
                            {lessonCount === 1 ? "lesson" : "lessons"}
                            {sectionDuration ? (
                              <>
                                {" · "}
                                <span className="normal-case tabular-nums">
                                  {sectionDuration}
                                </span>
                              </>
                            ) : null}
                          </span>
                          <span className="mt-2 block truncate text-[0.95rem]/[1.3] font-semibold">
                            {section.title}
                          </span>
                        </span>
                        <span className="sr-only">
                          {completedLessons} of {lessonCount} lessons completed
                        </span>
                        {/* The count was only read out, never shown; it is
                            shown here the way the mini player's list shows
                            it. */}
                        <span
                          className="learning-curriculum__section-progress"
                          aria-hidden="true"
                        >
                          {sectionProgress}
                        </span>
                        <span
                          className={`learning-curriculum__section-arrow text-(--muted)${isOpen ? " is-open" : ""}`}
                          aria-hidden="true"
                        >
                          <CaretDown size={16} weight="bold" />
                        </span>
                        {completedLessons > 0 && !sectionComplete ? (
                          <CurriculumProgressBar
                            percent={(completedLessons / lessonCount) * 100}
                          />
                        ) : null}
                      </>
                    )}
                  </button>
                  {matchingLessons.length > 0 && (
                    <div
                      className={`learning-curriculum__section-lessons ${isOpen ? "is-open" : ""}`}
                      aria-hidden={!isOpen ? true : undefined}
                      inert={!isOpen ? true : undefined}
                      data-curriculum-section-panel={section.id}
                      onTransitionEnd={(event) => {
                        if (event.target === event.currentTarget) {
                          handleCollapseTransitionEnd(section.id);
                        }
                      }}
                    >
                      <div className="learning-curriculum__section-lessons-inner">
                        <ClosingSectionLessons open={isOpen}>
                          <CurriculumLessonRows
                            sectionId={section.id}
                            sectionTitle={section.title}
                            // The section's own list when nothing is being
                            // searched for: the filtered one is a new list
                            // each time, and would have every section's
                            // lessons render again with the panel.
                            lessons={
                              activeLessonSearch
                                ? matchingLessons
                                : section.lessons
                            }
                            lessonNumberBase={getLessonNumberBase(section)}
                            selectedLesson={selectedLesson}
                            lessonProgress={lessonProgress}
                            onSelectLesson={onSelectLesson}
                            isLessonAvailable={isLessonAvailable}
                            lockedLessonNumbers={lockedLessonNumbers}
                            onClose={onClose}
                            activeLessonRef={activeLessonRef}
                            compact={hideHero}
                            lessonResources={lessonResources}
                            resourceCourseKey={resourceCourseKey}
                            quizLessonNumbers={quizLessonNumbers}
                            activeQuizLesson={activeQuizLesson}
                            onOpenLessonQuiz={onOpenLessonQuiz}
                            portalContainer={contextMenuPortalHostRef}
                          />
                        </ClosingSectionLessons>
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </aside>

      <CurriculumSectionActionsMenuContent
        sectionIds={sectionIds}
        expandedSectionIds={expanded}
        onExpandAllSections={() => setExpanded(sectionIds)}
        onCollapseAllSections={() => setExpanded([])}
        onOpenCourseOverview={onOpenCourseOverview}
        portalContainer={contextMenuPortalHostRef}
      />
    </ContextMenu>
  );
});
