import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import "../styles/features/course-wizard.css";
import { useLocation, useNavigate, useParams } from "react-router";
import { createPortal } from "react-dom";
import { Checkbox } from "../components/Checkbox";
import { CenteredLoadingSpinner } from "../components/LoadingSpinner";
import { createDiscussionDraft } from "../learning/discussion-editor/types";
import { CourseQuizPricingCard } from "./CourseQuizPricingCard";
import { CourseStaticPageRefreshNotice } from "./CourseStaticPageRefreshNotice";
import {
  LessonResourceManager,
  toLessonResourceItem,
  type LessonResourceItem,
} from "./lesson-resources/LessonResourceManager";
import {
  CourseDescriptionEditor,
  LessonDescriptionEditor,
} from "./CourseDescriptionEditor";
import {
  LessonContentTypeIcon,
  LessonStudioEditor,
  type LessonEditorDraft,
  type StudioLessonContentType,
} from "./curriculum";
import { VirtualizedLessonList } from "./curriculum/VirtualizedLessonList";
import { usePageBeforeEditor } from "./usePageBeforeEditor";

const DiscussionMarkdown = lazy(() =>
  import("../learning/discussion-editor/DiscussionMarkdown").then((module) => ({
    default: module.DiscussionMarkdown,
  })),
);
const LessonVideoUpload = lazy(() =>
  import("./lesson-video-upload/LessonVideoUpload").then((module) => ({
    default: module.LessonVideoUpload,
  })),
);
const QuizAuthoringPanel = lazy(() =>
  import("../quizzes/QuizAuthoringPanel").then((module) => ({
    default: module.QuizAuthoringPanel,
  })),
);
import { ToastNotification } from "../ToastNotification";
import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { ArrowUpRightIcon as ArrowUpRight } from "@phosphor-icons/react/ArrowUpRight";
import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretLeftIcon as CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon as CaretRight } from "@phosphor-icons/react/CaretRight";
import { CertificateIcon as Certificate } from "@phosphor-icons/react/Certificate";
import { ChartBarIcon as ChartBar } from "@phosphor-icons/react/ChartBar";
import { ChatCircleTextIcon as ChatCircleText } from "@phosphor-icons/react/ChatCircleText";
import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { CircleNotchIcon as CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { ClockIcon as Clock } from "@phosphor-icons/react/Clock";
import { DotsSixVerticalIcon as DotsSixVertical } from "@phosphor-icons/react/DotsSixVertical";
import { DownloadSimpleIcon as DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { EyeIcon as Eye } from "@phosphor-icons/react/Eye";
import { EyeSlashIcon as EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { FileTextIcon as FileText } from "@phosphor-icons/react/FileText";
import { ImageIcon } from "@phosphor-icons/react/Image";
import { InfoIcon as Info } from "@phosphor-icons/react/Info";
import { LightningIcon as Lightning } from "@phosphor-icons/react/Lightning";
import { NotePencilIcon as NotePencil } from "@phosphor-icons/react/NotePencil";
import { PencilSimpleIcon as PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { PlayCircleIcon as PlayCircle } from "@phosphor-icons/react/PlayCircle";
import { PlusIcon as Plus } from "@phosphor-icons/react/Plus";
import { PuzzlePieceIcon as PuzzlePiece } from "@phosphor-icons/react/PuzzlePiece";
import { QuestionIcon as Question } from "@phosphor-icons/react/Question";
import { TagIcon as Tag } from "@phosphor-icons/react/Tag";
import { TrashIcon as Trash } from "@phosphor-icons/react/Trash";
import { UploadSimpleIcon as UploadSimple } from "@phosphor-icons/react/UploadSimple";
import { UserPlusIcon as UserPlus } from "@phosphor-icons/react/UserPlus";
import { VideoIcon as Video } from "@phosphor-icons/react/Video";
import { WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/WarningCircle";
import { XIcon as X } from "@phosphor-icons/react/X";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/BookOpen";
import ISO6391 from "iso-639-1";
import { ThemedSelect } from "../ThemedSelect";
import { SettingsToggle } from "../settings/SettingsControls";
import type { NavigateTo } from "../routing/navigation";
import { getCourseEditorPath } from "./courseEditorRouting";
import {
  categoryChangeToSend,
  draftCategoryAfterReload,
} from "./basicsCategoryDraft";
import { basicsChangeToSend, draftValueAfterReload } from "./basicsDraftChange";
import { handleRovingTabKeyDown } from "../accessibility/rovingTabFocus";
import {
  getNumberShortcutIndex,
  isEditingShortcutTarget,
} from "../keyboardShortcuts";
import { SwipeableTabPanel } from "../navigation/SwipeableTabPanel";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import {
  coursesService,
  useCategories,
  useCourseEditor,
  useCoursePreview,
  useCourseValidation,
  useCreateCategory,
  useCreateCourse,
  useCreateCourseInclude,
  useCreateLesson,
  useCreateLessonResource,
  useCreateSection,
  useDeleteCategory,
  useDeleteCourseInclude,
  useDeleteLesson,
  useDeleteLessonResource,
  useDeleteSection,
  useReorderCourseIncludes,
  useReorderLessons,
  useReorderSections,
  useUpdateCourseBasics,
  useUpdateCourseInclude,
  useUpdateLesson,
  useUpdateSection,
  useUpsertAccessRules,
  useUpsertPricing,
  useUpsertSettings,
  usePublishCourse,
  useUnpublishCourse,
} from "../services/courses";
import {
  getCourseThumbnailCdnUrl,
  waitForCourseThumbnailCdnUrl,
} from "./courseMedia";
import { useIsMutating } from "@tanstack/react-query";
import type {
  CourseEditorDataResponse,
  CourseIncludeItem,
  CourseValidationArea,
  CreateLessonResourceRequest,
  LessonResource,
} from "@veolms/contracts";
import { MEDIA_MAX_SIZES } from "@veolms/contracts";
import {
  CourseOverviewPage,
  CourseOverviewSkeleton,
} from "./CourseOverviewPage";
import type {
  CourseInclude,
  CourseOverviewPricingProps,
} from "./CourseOverviewPage";
import type { Course, CourseLevel, CourseCategory } from "./catalogue";
import { formatDuration, resolveCourseDurationSeconds } from "./courseAdapter";
import { mediaService } from "../services/media";
import { clearVideoPlaybackBootstrapCache } from "../learning/videoPlaybackBootstrap";
import {
  EMPTY_CATEGORIES,
  type ThumbnailUploadStatus,
  type ChecklistState,
  type BasicsFormState,
  initialBasicsState,
  normalizeBasicsState,
  getThumbnailUploadErrorMessage,
  isBasicsMetaEqual,
  isBasicsEqual,
} from "./course-editor/basicsState";
import {
  type StoredLessonEditorDraft,
  readLessonEditorDraft,
  writeLessonEditorDraft,
  clearLessonEditorDraft,
} from "./course-editor/lessonEditorDraft";
import {
  LessonDescriptionPreview,
  LessonDropIndicator,
  MemoizedLessonCard,
} from "./course-editor/MemoizedLessonCard";
import {
  type CurriculumLessonItem,
  getLessonMediaInfo,
  getCourseWideLessonNumber,
  type CurriculumSectionItem,
  type DraggedLessonState,
  type LessonDropTarget,
  isLessonDirty,
} from "./course-editor/curriculumItems";
import {
  type CourseWizardStepId,
  type WizardStepDefinition,
  WIZARD_STEPS,
  WIZARD_STEP_IDS,
  COURSE_WIZARD_ARROW_KEY_OWNER_SELECTOR,
  getAdjacentWizardSteps,
  parseWizardTab,
} from "./course-editor/wizardSteps";
import {
  type BasicsFieldKey,
  BasicsFieldStatusIndicator,
  type AccessRulesControlKey,
  AccessRulesControlStatusIndicator,
  type PricingControlKey,
  PricingControlStatusIndicator,
  ExtrasControlStatusIndicator,
  CurriculumItemStatusIndicator,
} from "./course-editor/statusIndicators";
import {
  type AccessType,
  type AccessDurationMode,
  type DurationUnit,
  type AccessRulesFormState,
  initialAccessRulesState,
  normalizeAccessRulesState,
  isAccessRuleConfigEqual,
  isAccessRulesEqual,
} from "./course-editor/accessRulesState";
import {
  type PricingFormState,
  initialPricingState,
  normalizePricingState,
  isPricingEqual,
  getCurrencyOptions,
  getCurrencySymbol,
  validatePricing,
  buildPricingPayload,
} from "./course-editor/pricingState";
import {
  type ExtrasFormState,
  initialExtrasState,
  normalizeExtrasState,
  isExtrasEqual,
  deriveSuggestedInclusions,
  isManualIncludesEqual,
} from "./course-editor/extrasState";
import { checkIsCurriculumDirty } from "./course-editor/curriculumDirty";
import {
  setCustomDragImage,
  sectionGhostHtml,
  lessonGhostHtml,
  inclusionGhostHtml,
} from "./course-editor/dragGhosts";
import { buildLocalPreviewData } from "./course-editor/localPreview";
import { CourseWizardSkeleton } from "./course-editor/CourseWizardSkeleton";
import { PricingStepPanel } from "./course-editor/PricingStepPanel";
import { AccessRulesStepPanel } from "./course-editor/AccessRulesStepPanel";
import { PublishStepPanel } from "./course-editor/PublishStepPanel";
import type {
  CertificateIssuanceType,
  ExtrasState,
  PersistLessonOptions,
  PublishState,
} from "./course-editor/editorLocalTypes";
import { ExtrasStepPanel } from "./course-editor/ExtrasStepPanel";
import { BasicsStepPanel } from "./course-editor/BasicsStepPanel";
import { CurriculumStepPanel } from "./course-editor/CurriculumStepPanel";
export {
  type BasicsFormState,
  initialBasicsState,
  normalizeBasicsState,
  isBasicsMetaEqual,
  isBasicsSettingsEqual,
  isBasicsEqual,
} from "./course-editor/basicsState";
export {
  type CourseWizardStepId,
  type WizardStepDefinition,
  WIZARD_STEPS,
  WIZARD_STEP_IDS,
  parseWizardTab,
} from "./course-editor/wizardSteps";
export {
  type BasicsFieldKey,
  BasicsFieldStatusIndicator,
  type AccessRulesControlKey,
  AccessRulesControlStatusIndicator,
  type PricingControlKey,
  PricingControlStatusIndicator,
  type ExtrasControlKey,
  ExtrasControlStatusIndicator,
  type CurriculumItemKey,
  CurriculumItemStatusIndicator,
  type PublishControlKey,
  PublishControlStatusIndicator,
} from "./course-editor/statusIndicators";
export {
  formatIsoToDatetimeLocal,
  formatDatetimeLocalToIso,
  type AccessType,
  type AccessDurationMode,
  type DurationUnit,
  type AccessRulesFormState,
  initialAccessRulesState,
  normalizeAccessRulesState,
  isAccessRuleConfigEqual,
  isAccessSettingsEqual,
  isAccessRulesEqual,
} from "./course-editor/accessRulesState";
export {
  type PricingType,
  type PricingFormState,
  type PricingState,
  initialPricingState,
  derivePricingType,
  normalizePricingState,
  hasDiscountBadge,
  isPricingEqual,
  getCurrencyOptions,
  getCurrencySymbol,
  validatePricing,
  buildPricingPayload,
} from "./course-editor/pricingState";
export {
  type ExtrasFormState,
  initialExtrasState,
  normalizeExtrasState,
  isExtrasEqual,
  type AutoIncludeItem,
  deriveAutoIncludes,
  deriveSuggestedInclusions,
  isManualIncludesEqual,
} from "./course-editor/extrasState";
export { checkIsCurriculumDirty } from "./course-editor/curriculumDirty";
export {
  type BuildLocalPreviewParams,
  buildLocalPreviewData,
} from "./course-editor/localPreview";
export { CourseWizardSkeleton } from "./course-editor/CourseWizardSkeleton";

const getCurriculumLessonKey = (lesson: CurriculumLessonItem) => lesson.id;

export interface CourseCreatePageProps {
  courseId?: string;
  editCourseId?: string;
  onNavigatePage?: NavigateTo;
  bottomNavHidden?: boolean;
}

export function CourseCreatePage({
  courseId: propCourseId,
  editCourseId: propEditCourseId,
  onNavigatePage,
  bottomNavHidden = false,
}: CourseCreatePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId: routeCourseId, editTab: routeEditTab } = useParams<{
    courseId?: string;
    editTab?: string;
  }>();
  const searchParams = useMemo(
    () => new URLSearchParams(location?.search ?? ""),
    [location?.search],
  );
  const activeEditId =
    propCourseId ||
    propEditCourseId ||
    routeCourseId ||
    searchParams.get("edit") ||
    searchParams.get("courseId") ||
    null;

  const requestedSectionId = searchParams.get("sectionId");
  const requestedLessonId = searchParams.get("lessonId");
  const routeRequestedStep =
    parseWizardTab(routeEditTab) ||
    parseWizardTab(searchParams.get("tab")) ||
    parseWizardTab(searchParams.get("step"));
  const initialStep = routeRequestedStep || "basics";
  const editorRouteIdentity = `${activeEditId || "create"}:${routeRequestedStep || "basics"}`;
  const [activeStep, setActiveStep] = useState<CourseWizardStepId>(initialStep);
  const pendingWizardNavigationRef = useRef<CourseWizardStepId | null>(null);
  const [slideDirection, setSlideDirection] = useState<"right" | "left">(
    "right",
  );
  // Keep the active wizard panel and its immediate neighbors warm for smooth
  // tab navigation. Heavy lesson editors are mounted only when opened below.
  const [mountedTabs, setMountedTabs] = useState<Set<CourseWizardStepId>>(() =>
    getAdjacentWizardSteps(initialStep),
  );

  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const stepsNavRef = useRef<HTMLElement | null>(null);
  const [mountedLessonEditorIds, setMountedLessonEditorIds] = useState<
    string[]
  >([]);
  const [editingLessonTarget, setEditingLessonTarget] = useState<{
    sectionId: string;
    lessonId: string;
  } | null>(null);
  const previousEditorRouteIdentityRef = useRef(editorRouteIdentity);

  // Automatically reset lesson editor if navigating away from curriculum step
  useEffect(() => {
    if (activeStep !== "curriculum") {
      setEditingLessonTarget(null);
    }
  }, [activeStep]);

  useEffect(() => {
    setMountedLessonEditorIds([]);
  }, [activeEditId]);

  const rememberLessonEditor = useCallback((lessonId: string) => {
    setMountedLessonEditorIds((previous) => {
      const next = [
        ...previous.filter((mountedLessonId) => mountedLessonId !== lessonId),
        lessonId,
      ];
      return next.slice(-3);
    });
  }, []);

  const navigateToStepRef = useRef<
    (destination: CourseWizardStepId) => Promise<void>
  >((async () => {}) as any);
  const [isNavMouseDown, setIsNavMouseDown] = useState(false);
  const [navStartX, setNavStartX] = useState(0);
  const [navScrollLeft, setNavScrollLeft] = useState(0);

  const handleNavMouseDown = (e: React.MouseEvent) => {
    if (!stepsNavRef.current) return;
    setIsNavMouseDown(true);
    setNavStartX(e.pageX - stepsNavRef.current.offsetLeft);
    setNavScrollLeft(stepsNavRef.current.scrollLeft);
  };

  const handleNavMouseLeave = () => {
    setIsNavMouseDown(false);
  };

  const handleNavMouseUp = () => {
    setIsNavMouseDown(false);
  };

  const handleNavMouseMove = (e: React.MouseEvent) => {
    if (!isNavMouseDown || !stepsNavRef.current) return;
    e.preventDefault();
    const x = e.pageX - stepsNavRef.current.offsetLeft;
    const walk = (x - navStartX) * 1.5;
    stepsNavRef.current.scrollLeft = navScrollLeft - walk;
  };

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeStep];
      if (!activeEl) return;
      const nav = stepsNavRef.current;
      if (nav) {
        const style = getComputedStyle(activeEl);
        const indicatorToken = style
          .getPropertyValue("--page-tab-active-indicator")
          .trim();
        const toneToken = style.getPropertyValue("--page-tab-tone").trim();
        const color =
          indicatorToken.includes("--page-tab-tone") ||
          indicatorToken === "var(--page-tab-tone)"
            ? toneToken
            : indicatorToken || "var(--accent)";

        nav.style.setProperty(
          "--page-tab-indicator-left",
          `${activeEl.offsetLeft}px`,
        );
        nav.style.setProperty(
          "--page-tab-indicator-width",
          `${activeEl.offsetWidth}px`,
        );
        nav.style.setProperty("--page-tab-indicator-color", color);

        const navWidth = nav.offsetWidth;
        const elLeft = activeEl.offsetLeft;
        const elWidth = activeEl.offsetWidth;
        if (
          elLeft < nav.scrollLeft ||
          elLeft + elWidth > nav.scrollLeft + navWidth
        ) {
          nav.scrollTo({
            left: elLeft - navWidth / 2 + elWidth / 2,
            behavior: "smooth",
          });
        }
      }
    };
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);

    const observer = new MutationObserver(updateIndicator);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-page-tab-colors",
        "data-theme",
        "data-palette",
        "data-sidebar-icon-style",
      ],
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateIndicator);
      observer.disconnect();
    };
  }, [activeStep]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.courseWizardActive = "true";
    }
    return () => {
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.courseWizardActive;
      }
    };
  }, []);

  useEffect(() => {
    const scrollport = document.getElementById("courses-main-scrollport");
    if (scrollport) {
      scrollport.scrollTop = 0;
    }
    const tabContent = document.getElementById("course-wizard-tab-panel");
    if (tabContent) {
      tabContent.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [activeStep]);

  useEffect(() => {
    setMountedTabs(getAdjacentWizardSteps(activeStep));
  }, [activeStep]);

  useEffect(() => {
    const navigateWizardTab = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditingShortcutTarget(event.target))
        return;

      let destination: WizardStepDefinition | undefined;
      if (event.altKey) {
        const index = getNumberShortcutIndex(event);
        destination = index === null ? undefined : WIZARD_STEPS[index];
      } else if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        !(
          event.target instanceof Element &&
          event.target.closest(COURSE_WIZARD_ARROW_KEY_OWNER_SELECTOR)
        )
      ) {
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const currentIndex = WIZARD_STEP_IDS.indexOf(activeStep);
        const nextIndex =
          (currentIndex + offset + WIZARD_STEPS.length) % WIZARD_STEPS.length;
        destination = WIZARD_STEPS[nextIndex];
      }

      if (!destination) return;
      event.preventDefault();
      void navigateToStepRef.current(destination.id);
    };

    document.addEventListener("keydown", navigateWizardTab);
    return () => document.removeEventListener("keydown", navigateWizardTab);
  }, [activeStep]);

  // Keep the URL as the canonical source for the active editor step. Legacy
  // query-string URLs are replaced with the same route structure used by new
  // create and edit links.
  useEffect(() => {
    const canonicalPath = getCourseEditorPath({
      mode: activeEditId ? "edit" : "create",
      courseId: activeEditId,
      step: activeStep,
      sectionId: activeStep === "curriculum" ? requestedSectionId : null,
      lessonId: activeStep === "curriculum" ? requestedLessonId : null,
    });
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === canonicalPath) return;

    // Let the route-to-state effect below settle when the user navigates to a
    // different course or enters the editor through a different tab URL.
    if (previousEditorRouteIdentityRef.current !== editorRouteIdentity) {
      return;
    }

    const hasLegacyQueryParams =
      searchParams.has("edit") ||
      searchParams.has("courseId") ||
      searchParams.has("tab") ||
      searchParams.has("step");
    const shouldReplace =
      location.pathname === "/courses/create" || hasLegacyQueryParams;
    void navigate(canonicalPath, { replace: shouldReplace });
  }, [
    activeEditId,
    activeStep,
    editorRouteIdentity,
    location.pathname,
    location.search,
    navigate,
    requestedLessonId,
    requestedSectionId,
    searchParams,
  ]);

  useEffect(() => {
    if (previousEditorRouteIdentityRef.current === editorRouteIdentity) {
      return;
    }
    previousEditorRouteIdentityRef.current = editorRouteIdentity;
    setActiveStep(initialStep);
    setEditingLessonTarget(null);
  }, [editorRouteIdentity, initialStep]);

  // Basics server-confirmed baseline and local draft states
  const [serverBasics, setServerBasics] =
    useState<BasicsFormState>(initialBasicsState);
  const [basicsDraft, setBasicsDraft] =
    useState<BasicsFormState>(initialBasicsState);

  // Derived isDirty for Basics
  const isBasicsDirty = useMemo(
    () => !isBasicsEqual(basicsDraft, serverBasics),
    [basicsDraft, serverBasics],
  );
  const isBasicsDirtyRef = useRef(isBasicsDirty);
  isBasicsDirtyRef.current = isBasicsDirty;

  const courseTitle = basicsDraft.title;
  const shortDescription = basicsDraft.shortDescription;
  const courseDescription = basicsDraft.description;
  const categoryId = basicsDraft.categoryId;
  const difficultyLevel = basicsDraft.difficulty;
  const language = basicsDraft.language;
  const instructorAlias = basicsDraft.instructorAlias;
  const showInstructorName = basicsDraft.showInstructorName;

  const serverBasicsRef = useRef<BasicsFormState>(serverBasics);
  serverBasicsRef.current = serverBasics;
  const basicsDraftRef = useRef<BasicsFormState>(basicsDraft);
  basicsDraftRef.current = basicsDraft;

  const setCourseTitle = (title: string) => {
    setBasicsDraft((prev) => ({ ...prev, title }));
    basicsDraftRef.current = { ...basicsDraftRef.current, title };
  };
  const setShortDescription = (shortDescription: string) => {
    setBasicsDraft((prev) => ({ ...prev, shortDescription }));
    basicsDraftRef.current = { ...basicsDraftRef.current, shortDescription };
  };
  const setCourseDescription = (description: string) => {
    setBasicsDraft((prev) => ({ ...prev, description }));
    basicsDraftRef.current = { ...basicsDraftRef.current, description };
  };
  const setCategoryId = (categoryId: string) => {
    setBasicsDraft((prev) => ({ ...prev, categoryId }));
    basicsDraftRef.current = { ...basicsDraftRef.current, categoryId };
  };
  const setInstructorAlias = (instructorAlias: string) => {
    setBasicsDraft((prev) => ({ ...prev, instructorAlias }));
    basicsDraftRef.current = { ...basicsDraftRef.current, instructorAlias };
  };
  const setShowInstructorName = (showInstructorName: boolean) => {
    setBasicsDraft((prev) => ({ ...prev, showInstructorName }));
    basicsDraftRef.current = { ...basicsDraftRef.current, showInstructorName };
  };

  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    activeEditId,
  );
  const [courseVersion, setCourseVersion] = useState<number>(1);
  const courseVersionRef = useRef<number>(courseVersion);
  courseVersionRef.current = courseVersion;
  const currentCourseIdRef = useRef<string | null>(currentCourseId);

  useEffect(() => {
    setCurrentCourseId(activeEditId);
    currentCourseIdRef.current = activeEditId;
    setCourseVersion(1);
    courseVersionRef.current = 1;
  }, [activeEditId]);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailMediaId, setThumbnailMediaId] = useState<
    string | null | undefined
  >(undefined);
  // The upload state is kept for concurrency, rollback, and server-refresh
  // protection. The selected file is shown immediately, so upload progress is
  // intentionally not rendered in the course editor.
  const [thumbnailUploadStatus, setThumbnailUploadStatus] =
    useState<ThumbnailUploadStatus>("idle");
  const [thumbnailUploadError, setThumbnailUploadError] = useState<
    string | null
  >(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailMediaIdRef = useRef<string | null>(null);
  const thumbnailUploadStatusRef = useRef<ThumbnailUploadStatus>("idle");
  thumbnailUploadStatusRef.current = thumbnailUploadStatus;
  const thumbnailDirtyRef = useRef(false);
  const thumbnailObjectUrlRef = useRef<string | null>(null);
  const thumbnailUploadAbortControllerRef = useRef<AbortController | null>(
    null,
  );
  const thumbnailRequestIdRef = useRef(0);
  const thumbnailMountedRef = useRef(true);
  const isThumbnailBusy =
    thumbnailUploadStatus === "uploading" ||
    thumbnailUploadStatus === "confirming" ||
    thumbnailUploadStatus === "processing" ||
    thumbnailUploadStatus === "saving";

  useEffect(() => {
    thumbnailMountedRef.current = true;
    return () => {
      thumbnailMountedRef.current = false;
      thumbnailUploadAbortControllerRef.current?.abort();
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      }
    };
  }, []);

  const [videoTrailer, setVideoTrailer] = useState<string | null>(null);
  const videoTrailerInputRef = useRef<HTMLInputElement | null>(null);

  async function handleThumbnailFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isThumbnailBusy) return;

    const contentType = file.type.toLowerCase();
    if (!contentType.startsWith("image/")) {
      setThumbnailUploadError("Please choose an image file for the thumbnail.");
      setThumbnailUploadStatus("error");
      return;
    }
    if (file.size <= 0) {
      setThumbnailUploadError("The selected thumbnail is empty.");
      setThumbnailUploadStatus("error");
      return;
    }
    if (file.size > MEDIA_MAX_SIZES.image) {
      setThumbnailUploadError("Thumbnail images must be 10 MB or smaller.");
      setThumbnailUploadStatus("error");
      return;
    }

    const targetCourseId = currentCourseIdRef.current || currentCourseId;
    if (!targetCourseId) {
      setThumbnailUploadError(
        "Save the course title before uploading a thumbnail.",
      );
      setThumbnailUploadStatus("error");
      return;
    }

    const requestId = ++thumbnailRequestIdRef.current;
    const previousThumbnail = thumbnail;
    const previousMediaId = thumbnailMediaIdRef.current;
    const previousObjectUrl = thumbnailObjectUrlRef.current;
    const imageUrl = URL.createObjectURL(file);

    thumbnailObjectUrlRef.current = imageUrl;
    thumbnailDirtyRef.current = true;
    setThumbnail(imageUrl);
    setThumbnailUploadError(null);
    setThumbnailUploadStatus("uploading");

    const requestIsActive = () =>
      thumbnailMountedRef.current &&
      thumbnailRequestIdRef.current === requestId;

    const restorePreviousThumbnail = () => {
      if (!requestIsActive()) return;
      URL.revokeObjectURL(imageUrl);
      thumbnailObjectUrlRef.current = previousObjectUrl;
      thumbnailMediaIdRef.current = previousMediaId;
      setThumbnail(previousThumbnail);
      setThumbnailMediaId(previousMediaId);
      thumbnailDirtyRef.current = false;
    };

    const uploadAbortController = new AbortController();
    thumbnailUploadAbortControllerRef.current = uploadAbortController;

    try {
      if (!(await flushBasicsPersistence()) || !requestIsActive()) {
        throw new Error(
          "Save the course details before uploading a thumbnail.",
        );
      }

      const presigned = await mediaService.presignMediaUpload({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        type: "image",
        visibility: "public",
      });

      if (!requestIsActive()) return;

      await mediaService.uploadFileToPresignedUrl(
        presigned.uploadUrl,
        file,
        undefined,
        uploadAbortController.signal,
      );

      if (!requestIsActive()) return;
      setThumbnailUploadStatus("confirming");
      const confirmation = await mediaService.confirmUpload(
        presigned.mediaAssetId,
      );

      if (!requestIsActive()) return;
      setThumbnailUploadStatus("processing");
      const processedThumbnailUrl = await waitForCourseThumbnailCdnUrl(
        presigned.mediaAssetId,
        { signal: uploadAbortController.signal },
      );

      if (!requestIsActive()) return;
      setThumbnailUploadStatus("saving");

      const updated = await updateBasicsMutation.mutateAsync({
        id: targetCourseId,
        payload: {
          thumbnailMediaId: presigned.mediaAssetId,
          version: courseVersionRef.current,
        },
      });

      if (!requestIsActive()) return;

      setCourseVersion(updated.version);
      courseVersionRef.current = updated.version;
      thumbnailMediaIdRef.current = presigned.mediaAssetId;
      setThumbnailMediaId(presigned.mediaAssetId);
      setThumbnail(processedThumbnailUrl);
      thumbnailDirtyRef.current = false;
      setThumbnailUploadStatus("idle");
      setThumbnailUploadError(null);

      if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
      thumbnailObjectUrlRef.current = null;
    } catch (error: unknown) {
      if (
        !requestIsActive() ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }

      restorePreviousThumbnail();
      setThumbnailUploadStatus("error");
      setThumbnailUploadError(getThumbnailUploadErrorMessage(error));
    } finally {
      if (thumbnailUploadAbortControllerRef.current === uploadAbortController) {
        thumbnailUploadAbortControllerRef.current = null;
      }
    }
  }

  const triggerThumbnailUpload = () => {
    thumbnailInputRef.current?.click();
  };

  async function handleRemoveThumbnail(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }

    if (isThumbnailBusy) return;

    const previousThumbnail = thumbnail;
    const previousMediaId = thumbnailMediaIdRef.current;
    const previousObjectUrl = thumbnailObjectUrlRef.current;
    const targetCourseId = currentCourseIdRef.current || currentCourseId;

    if (!targetCourseId || !previousMediaId) {
      if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
      thumbnailObjectUrlRef.current = null;
      thumbnailDirtyRef.current = false;
      thumbnailMediaIdRef.current = null;
      setThumbnailMediaId(null);
      setThumbnail(null);
      setThumbnailUploadError(null);
      setThumbnailUploadStatus("idle");
      return;
    }

    const requestId = ++thumbnailRequestIdRef.current;
    thumbnailDirtyRef.current = true;
    setThumbnail(null);
    setThumbnailMediaId(null);
    setThumbnailUploadError(null);
    setThumbnailUploadStatus("saving");

    try {
      if (!(await flushBasicsPersistence())) {
        throw new Error(
          "Save the course details before removing the thumbnail.",
        );
      }

      const updated = await updateBasicsMutation.mutateAsync({
        id: targetCourseId,
        payload: {
          thumbnailMediaId: null,
          version: courseVersionRef.current,
        },
      });

      if (
        !thumbnailMountedRef.current ||
        thumbnailRequestIdRef.current !== requestId
      ) {
        return;
      }

      setCourseVersion(updated.version);
      courseVersionRef.current = updated.version;
      thumbnailMediaIdRef.current = null;
      thumbnailDirtyRef.current = false;
      setThumbnailUploadStatus("idle");
      setThumbnailUploadError(null);
      if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
      thumbnailObjectUrlRef.current = null;
    } catch (error: unknown) {
      if (
        !thumbnailMountedRef.current ||
        thumbnailRequestIdRef.current !== requestId
      ) {
        return;
      }

      thumbnailDirtyRef.current = false;
      thumbnailMediaIdRef.current = previousMediaId;
      setThumbnailMediaId(previousMediaId);
      setThumbnail(previousThumbnail);
      setThumbnailUploadStatus("error");
      setThumbnailUploadError(
        error instanceof Error
          ? error.message
          : "Thumbnail removal failed. Please try again.",
      );
    }
  }

  const handleVideoTrailerFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setVideoTrailer(videoUrl);
    }
  };

  const handleTrailerMediaAttached = async (
    mediaAssetId: string,
  ): Promise<boolean> => {
    if (!currentCourseId || !editorData?.course) return false;

    try {
      await updateBasicsMutation.mutateAsync({
        id: currentCourseId,
        payload: {
          trailerMediaId: mediaAssetId,
          version: editorData.course.version,
        },
      });
      await refetchEditor();
      return true;
    } catch {
      return false;
    }
  };

  const triggerVideoTrailerUpload = () => {
    videoTrailerInputRef.current?.click();
  };

  const handleRemoveVideoTrailer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoTrailer(null);
    if (videoTrailerInputRef.current) {
      videoTrailerInputRef.current.value = "";
    }
  };

  // Immediate persistence states for Basics interactive controls
  const [savingBasicsControls, setSavingBasicsControls] = useState<Set<string>>(
    () => new Set(),
  );
  const savingBasicsControlsRef = useRef<Set<string>>(new Set());
  const basicsVersionRef = useRef<number>(0);
  const inFlightBasicsControlsRef = useRef<Record<string, number>>({
    title: 0,
    shortDescription: 0,
    courseDescription: 0,
    instructorAlias: 0,
    showInstructorName: 0,
  });
  const inFlightBasicsPromiseRef = useRef<Promise<unknown> | null>(null);
  /**
   * Shared in-flight new-course creation promise.
   * Registered BEFORE the first await so every concurrent caller joins the
   * same POST /courses request instead of firing a new one.
   * Cleared in the finally block after success or failure.
   */
  const inFlightCourseCreationPromiseRef = useRef<Promise<{
    id: string;
    version: number;
    title: string;
    instructorAlias?: string | null;
  }> | null>(null);

  /**
   * 1-second debounce timer for initial new-course title creation.
   * Cleared whenever the user presses Enter, blurs, navigates, saves, or unmounts.
   */
  const titleCreationDebounceTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const cancelTitleCreationDebounce = () => {
    if (titleCreationDebounceTimerRef.current) {
      clearTimeout(titleCreationDebounceTimerRef.current);
      titleCreationDebounceTimerRef.current = null;
    }
  };

  const markBasicsControlSaving = (controlKey: string, isSaving: boolean) => {
    if (isSaving) {
      savingBasicsControlsRef.current.add(controlKey);
    } else {
      savingBasicsControlsRef.current.delete(controlKey);
    }
    setSavingBasicsControls(new Set(savingBasicsControlsRef.current));
  };

  const isBasicsControlSaving = (controlKey: string) =>
    savingBasicsControlsRef.current.has(controlKey) ||
    (inFlightBasicsControlsRef.current[controlKey] ?? 0) > 0;

  const [basicsFieldStatus, setBasicsFieldStatus] = useState<
    Partial<Record<BasicsFieldKey, "saved" | "failed" | null>>
  >({});
  const basicsFieldTimersRef = useRef<
    Partial<Record<BasicsFieldKey, ReturnType<typeof setTimeout>>>
  >({});
  const [basicsSaveFailed, setBasicsSaveFailed] = useState(false);
  const [showBasicsSavedBriefly, setShowBasicsSavedBriefly] = useState(false);
  const basicsSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerBasicsSavedBriefly = () => {
    if (basicsSavedBrieflyTimerRef.current) {
      clearTimeout(basicsSavedBrieflyTimerRef.current);
    }
    setShowBasicsSavedBriefly(true);
    basicsSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowBasicsSavedBriefly(false);
      basicsSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const basicsFieldTimers = basicsFieldTimersRef.current;
    return () => {
      if (titleCreationDebounceTimerRef.current) {
        clearTimeout(titleCreationDebounceTimerRef.current);
        titleCreationDebounceTimerRef.current = null;
      }
      Object.values(basicsFieldTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (basicsSavedBrieflyTimerRef.current) {
        clearTimeout(basicsSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const clearBasicsFieldStatus = (fieldKey: BasicsFieldKey) => {
    if (basicsFieldTimersRef.current[fieldKey]) {
      clearTimeout(basicsFieldTimersRef.current[fieldKey]);
      delete basicsFieldTimersRef.current[fieldKey];
    }
    setBasicsFieldStatus((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setBasicsSaveFailed(false);
    if (basicsSavedBrieflyTimerRef.current) {
      clearTimeout(basicsSavedBrieflyTimerRef.current);
      basicsSavedBrieflyTimerRef.current = null;
    }
    setShowBasicsSavedBriefly(false);
  };

  const markBasicsFieldSaved = (fieldKey: BasicsFieldKey) => {
    if (basicsFieldTimersRef.current[fieldKey]) {
      clearTimeout(basicsFieldTimersRef.current[fieldKey]);
      delete basicsFieldTimersRef.current[fieldKey];
    }
    setBasicsFieldStatus((prev) => ({ ...prev, [fieldKey]: "saved" }));
    setBasicsSaveFailed(false);
    triggerBasicsSavedBriefly();

    basicsFieldTimersRef.current[fieldKey] = setTimeout(() => {
      setBasicsFieldStatus((prev) => {
        if (prev[fieldKey] !== "saved") return prev;
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
      delete basicsFieldTimersRef.current[fieldKey];
    }, 1500);
  };

  const markBasicsFieldFailed = (fieldKey: BasicsFieldKey) => {
    if (basicsFieldTimersRef.current[fieldKey]) {
      clearTimeout(basicsFieldTimersRef.current[fieldKey]);
      delete basicsFieldTimersRef.current[fieldKey];
    }
    setBasicsFieldStatus((prev) => ({ ...prev, [fieldKey]: "failed" }));
    setBasicsSaveFailed(true);
    if (basicsSavedBrieflyTimerRef.current) {
      clearTimeout(basicsSavedBrieflyTimerRef.current);
      basicsSavedBrieflyTimerRef.current = null;
    }
    setShowBasicsSavedBriefly(false);
  };

  const getBasicsFieldDisplayStatus = (
    fieldKey: BasicsFieldKey,
  ): "saving" | "saved" | "failed" | null => {
    if (
      savingBasicsControls.has(fieldKey) ||
      (inFlightBasicsControlsRef.current[fieldKey] ?? 0) > 0 ||
      (!currentCourseId &&
        fieldKey === "title" &&
        createCourseMutation.isPending)
    ) {
      return "saving";
    }
    return basicsFieldStatus[fieldKey] ?? null;
  };

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategoryError, setAddCategoryError] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isEditing = Boolean(activeEditId);
  const isCourseTitleFilled = Boolean(courseTitle.trim());
  const [
    isInitialCurriculumBootstrapInProgress,
    setIsInitialCurriculumBootstrapInProgress,
  ] = useState(false);
  const isInitialCurriculumBootstrapInProgressRef = useRef(false);
  isInitialCurriculumBootstrapInProgressRef.current =
    isInitialCurriculumBootstrapInProgress;

  // Downstream tabs and fields are unlocked ONLY after a confirmed server-side
  // course ID exists AND initial curriculum bootstrap (Introduction section + lesson) has completed.
  const isDownstreamUnlocked =
    Boolean(currentCourseId) && !isInitialCurriculumBootstrapInProgress;

  useEffect(() => {
    currentCourseIdRef.current = currentCourseId;
  }, [currentCourseId]);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);

  useEffect(() => {
    if (!currentCourseId && !isCourseTitleFilled && activeStep === "basics") {
      titleInputRef.current?.focus();
    }
  }, [currentCourseId, isCourseTitleFilled, activeStep]);

  // Keep state synced if URL params change (e.g. popstate / back-forward navigation)
  useEffect(() => {
    const tabFromUrl =
      parseWizardTab(routeEditTab) ||
      parseWizardTab(searchParams.get("tab")) ||
      parseWizardTab(searchParams.get("step"));
    const pendingWizardNavigation = pendingWizardNavigationRef.current;
    if (pendingWizardNavigation) {
      if (tabFromUrl === pendingWizardNavigation) {
        pendingWizardNavigationRef.current = null;
      } else {
        return;
      }
    }
    if (
      tabFromUrl &&
      tabFromUrl !== activeStep &&
      (isDownstreamUnlocked || Boolean(activeEditId) || tabFromUrl === "basics")
    ) {
      setActiveStep(tabFromUrl);
    }
  }, [
    searchParams,
    routeEditTab,
    isDownstreamUnlocked,
    activeEditId,
    activeStep,
  ]);

  const {
    data: serverCategories = EMPTY_CATEGORIES,
    isLoading: isLoadingCategories,
  } = useCategories();
  const {
    data: editorData,
    isLoading: isLoadingEditor,
    isFetching: isFetchingEditor,
    isError: isEditorError,
    error: editorError,
    refetch: refetchEditor,
  } = useCourseEditor(currentCourseId);
  const isInitialLoadingCourse =
    isEditing && (isLoadingEditor || isFetchingEditor) && !editorData;
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useCoursePreview(currentCourseId, {
    enabled: isPreviewModalOpen && Boolean(currentCourseId),
  });
  const {
    data: serverValidation,
    refetch: refetchValidation,
    isFetching: isValidating,
  } = useCourseValidation(currentCourseId, {
    enabled: activeStep === "publish",
  });
  const createCourseMutation = useCreateCourse();
  const updateBasicsMutation = useUpdateCourseBasics();
  const createSectionMutation = useCreateSection();
  const updateSectionMutation = useUpdateSection();
  const deleteSectionMutation = useDeleteSection();
  const reorderSectionsMutation = useReorderSections();
  const createLessonMutation = useCreateLesson();
  const createLessonResourceMutation = useCreateLessonResource();
  const updateLessonMutation = useUpdateLesson();
  const deleteLessonMutation = useDeleteLesson();
  const deleteLessonResourceMutation = useDeleteLessonResource();
  const reorderLessonsMutation = useReorderLessons();
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [creatingLessonSectionId, setCreatingLessonSectionId] = useState<
    string | null
  >(null);
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [reorderingLessonsSectionId, setReorderingLessonsSectionId] = useState<
    string | null
  >(null);
  const [isReorderingSections, setIsReorderingSections] =
    useState<boolean>(false);
  const [isReorderingIncludes, setIsReorderingIncludes] =
    useState<boolean>(false);
  const [updatingSectionId, setUpdatingSectionId] = useState<string | null>(
    null,
  );
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(
    null,
  );
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const upsertAccessRulesMutation = useUpsertAccessRules();
  const upsertSettingsMutation = useUpsertSettings();
  const upsertPricingMutation = useUpsertPricing();
  const createIncludeMutation = useCreateCourseInclude();
  const updateIncludeMutation = useUpdateCourseInclude();
  const deleteIncludeMutation = useDeleteCourseInclude();
  const reorderIncludesMutation = useReorderCourseIncludes();
  const publishCourseMutation = usePublishCourse();
  const unpublishCourseMutation = useUnpublishCourse();

  // Footer Action Loading States
  const [actionLoading, setActionLoading] = useState<
    "draft" | "save" | "publish" | "unpublish" | "validate" | null
  >(null);
  const saveActionInFlightRef = useRef(false);

  // Page-specific in-flight save states
  const [isSavingBasics, setIsSavingBasics] = useState(false);
  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const [isSavingAccessRules, setIsSavingAccessRules] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isSavingExtras, setIsSavingExtras] = useState(false);
  const [isSavingPublish, setIsSavingPublish] = useState(false);

  const isBasicsSaving = isSavingBasics;
  const isCurriculumSaving = isSavingCurriculum;
  const isAccessRulesSaving = isSavingAccessRules;
  const isPricingSaving = isSavingPricing;
  const isExtrasSaving = isSavingExtras;
  const isPublishSaving = isSavingPublish;

  const isInitialCourseCreationPending =
    (!currentCourseId || isInitialCurriculumBootstrapInProgress) &&
    (createCourseMutation.isPending ||
      isInitialCurriculumBootstrapInProgress ||
      isSavingBasics ||
      savingBasicsControls.has("title"));

  const isAnyBasicsSaving =
    savingBasicsControls.size > 0 ||
    isSavingBasics ||
    Boolean(inFlightBasicsPromiseRef.current) ||
    (inFlightBasicsControlsRef.current.title ?? 0) > 0 ||
    (inFlightBasicsControlsRef.current.shortDescription ?? 0) > 0 ||
    (inFlightBasicsControlsRef.current.courseDescription ?? 0) > 0 ||
    (inFlightBasicsControlsRef.current.instructorAlias ?? 0) > 0 ||
    (inFlightBasicsControlsRef.current.showInstructorName ?? 0) > 0;

  const hasBasicsFieldFailed =
    basicsSaveFailed ||
    Object.values(basicsFieldStatus).some((status) => status === "failed");

  const basicsOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyBasicsSaving) return "saving";
    if (hasBasicsFieldFailed) return "failed";
    if (showBasicsSavedBriefly) return "saved";
    return null;
  }, [isAnyBasicsSaving, hasBasicsFieldFailed, showBasicsSavedBriefly]);

  const isMutatingCount = useIsMutating();

  const isAnyApiInProgress =
    isMutatingCount > 0 ||
    actionLoading !== null ||
    isBasicsSaving ||
    isCurriculumSaving ||
    isAccessRulesSaving ||
    isPricingSaving ||
    isExtrasSaving ||
    isPublishSaving ||
    isCreatingSection ||
    creatingLessonSectionId !== null ||
    savingLessonId !== null ||
    deletingLessonId !== null ||
    isReorderingSections ||
    reorderingLessonsSectionId !== null ||
    isReorderingIncludes ||
    reorderIncludesMutation.isPending ||
    updatingSectionId !== null ||
    deletingSectionId !== null ||
    createCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    publishCourseMutation.isPending ||
    unpublishCourseMutation.isPending ||
    isValidating ||
    isThumbnailBusy ||
    isPreviewLoading;

  const selectedCategoryName = useMemo(() => {
    return serverCategories.find((c) => c.id === categoryId)?.name || "";
  }, [serverCategories, categoryId]);

  const handleOpenAddCategoryModal = () => {
    setNewCategoryName("");
    setAddCategoryError("");
    setIsAddCategoryModalOpen(true);
  };

  const handleCloseAddCategoryModal = () => {
    if (createCategoryMutation.isPending || deleteCategoryMutation.isPending)
      return;
    setIsAddCategoryModalOpen(false);
    setNewCategoryName("");
    setAddCategoryError("");
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setAddCategoryError("Please enter a category name.");
      return;
    }

    const isDuplicate = serverCategories.some(
      (cat) => cat.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setAddCategoryError("This category already exists.");
      return;
    }

    try {
      const created = await createCategoryMutation.mutateAsync({
        name: trimmed,
      });
      setCategoryId(created.id);
      setNewCategoryName("");
      setAddCategoryError("");
      setToastMessage(`Category "${created.name}" created successfully.`);
    } catch {
      setAddCategoryError("Failed to create category. Please try again.");
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const targetName = categoryToDelete.name;
    const targetId = categoryToDelete.id;
    try {
      await deleteCategoryMutation.mutateAsync(targetId);
      if (categoryId === targetId) {
        setCategoryId("");
      }
      setToastMessage(`Category "${targetName}" deleted successfully.`);
    } catch {
      setToastMessage(`Failed to delete category "${targetName}".`);
    } finally {
      setCategoryToDelete(null);
    }
  };

  const languageOptions = useMemo(() => {
    const codes = ISO6391.getAllCodes();
    const options: Array<
      readonly [string, string, { searchKeywords?: string }?]
    > = [["", "Select language"]];
    for (const code of codes) {
      const name = ISO6391.getName(code);
      if (name) {
        options.push([
          code,
          name,
          { searchKeywords: `${code} ${name} ${ISO6391.getNativeName(code)}` },
        ]);
      }
    }
    return options;
  }, []);

  const currencyOptions = useMemo(() => getCurrencyOptions(), []);

  const handleBackToCourses = useCallback(() => {
    if (onNavigatePage) {
      onNavigatePage("courses");
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
  }, [onNavigatePage]);
  const handleBack = usePageBeforeEditor(handleBackToCourses);

  // Curriculum Step state
  const [sections, setSections] = useState<CurriculumSectionItem[]>([]);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const sectionHeaderElementsRef = useRef(new Map<string, HTMLDivElement>());
  const pendingAddedSectionScrollRef = useRef<string | null>(null);
  const lastSectionScrollRequestRef = useRef<string | null>(null);
  const sectionScrollDelayRef = useRef(300);
  const lessonTitleDraftsRef = useRef<Map<string, string>>(new Map());

  const scrollSectionHeaderIntoView = useCallback((sectionId: string) => {
    const header = sectionHeaderElementsRef.current.get(sectionId);
    if (!header || typeof window === "undefined") return false;

    let scrollport: HTMLElement | null = null;
    for (
      let parent = header.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay") &&
        parent.scrollHeight > parent.clientHeight + 1
      ) {
        scrollport = parent;
        break;
      }
    }

    const headerTop = header.getBoundingClientRect().top;
    if (scrollport) {
      const scrollportTop = scrollport.getBoundingClientRect().top;
      const top = scrollport.scrollTop + headerTop - scrollportTop;
      const previousBehavior = scrollport.style.scrollBehavior;
      scrollport.style.scrollBehavior = "auto";
      scrollport.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      scrollport.style.scrollBehavior = previousBehavior;
      return true;
    }

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({
      top: Math.max(0, window.scrollY + headerTop),
      behavior: "auto",
    });
    root.style.scrollBehavior = previousBehavior;
    return true;
  }, []);

  useEffect(() => {
    const sectionId = pendingAddedSectionScrollRef.current;
    if (!sectionId || !sections.some((section) => section.id === sectionId)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        pendingAddedSectionScrollRef.current === sectionId &&
        scrollSectionHeaderIntoView(sectionId)
      ) {
        pendingAddedSectionScrollRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sections, scrollSectionHeaderIntoView]);

  useEffect(() => {
    if (activeStep !== "curriculum" || !requestedSectionId) {
      lastSectionScrollRequestRef.current = null;
      sectionScrollDelayRef.current = 300;
      return;
    }

    const currentSections = sectionsRef.current;
    const targetIndex = currentSections.findIndex(
      (section) => section.id === requestedSectionId,
    );
    const targetAlreadyExpanded = currentSections.some(
      (section) => section.id === requestedSectionId && section.isExpanded,
    );
    if (targetIndex >= 0 && !targetAlreadyExpanded) {
      sectionScrollDelayRef.current = currentSections.some(
        (section, index) =>
          index < targetIndex &&
          section.id !== requestedSectionId &&
          section.isExpanded,
      )
        ? 300
        : 0;
    } else if (targetIndex < 0) {
      sectionScrollDelayRef.current = 300;
    }

    setSections((previous) => {
      let changed = false;
      const next = previous.map((section) => {
        const shouldExpand = section.id === requestedSectionId;
        if (section.isExpanded === shouldExpand) {
          return section;
        }
        changed = true;
        return { ...section, isExpanded: shouldExpand };
      });
      sectionsRef.current = changed ? next : previous;
      return changed ? next : previous;
    });
  }, [activeStep, requestedSectionId, sections.length]);

  useEffect(() => {
    if (activeStep !== "curriculum" || !requestedSectionId) return;
    const requestKey = `${activeEditId ?? "create"}:${requestedSectionId}`;
    if (lastSectionScrollRequestRef.current === requestKey) return;

    const delay = sectionScrollDelayRef.current;
    let frame = 0;
    let retryTimer = 0;
    let attempts = 0;
    const tryScrollToRequestedSection = () => {
      frame = window.requestAnimationFrame(() => {
        if (scrollSectionHeaderIntoView(requestedSectionId)) {
          lastSectionScrollRequestRef.current = requestKey;
        } else if (attempts++ < 20) {
          retryTimer = window.setTimeout(tryScrollToRequestedSection, 50);
        }
      });
    };
    const timeout = window.setTimeout(tryScrollToRequestedSection, delay);

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(retryTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [
    activeEditId,
    activeStep,
    requestedSectionId,
    scrollSectionHeaderIntoView,
  ]);

  const isCollapsingSectionRef = useRef(false);
  const inFlightLessonSavesRef = useRef<Map<string, Promise<boolean>>>(
    new Map(),
  );
  const isSavingAllDirtyLessonsRef = useRef(false);
  const isCurriculumDirty = useMemo(
    () => checkIsCurriculumDirty(sections),
    [sections],
  );
  const dragInitialSectionsStateRef = useRef<{
    sectionIds: string[];
    previousSections: CurriculumSectionItem[];
  } | null>(null);
  const dragInitialLessonStateRef = useRef<{
    sectionId: string;
    lessonIds: string[];
    previousLessons: CurriculumLessonItem[];
  } | null>(null);

  // Immediate persistence states for Curriculum interactive items
  const [curriculumItemStatus, setCurriculumItemStatus] = useState<
    Record<string, "saved" | "failed" | null>
  >({});
  const curriculumItemTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const [curriculumSaveFailed, setCurriculumSaveFailed] = useState(false);
  const [showCurriculumSavedBriefly, setShowCurriculumSavedBriefly] =
    useState(false);
  const curriculumSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerCurriculumSavedBriefly = () => {
    if (curriculumSavedBrieflyTimerRef.current) {
      clearTimeout(curriculumSavedBrieflyTimerRef.current);
    }
    setShowCurriculumSavedBriefly(true);
    curriculumSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowCurriculumSavedBriefly(false);
      curriculumSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const curriculumItemTimers = curriculumItemTimersRef.current;
    return () => {
      Object.values(curriculumItemTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (curriculumSavedBrieflyTimerRef.current) {
        clearTimeout(curriculumSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const clearCurriculumItemStatus = (itemId: string) => {
    if (curriculumItemTimersRef.current[itemId]) {
      clearTimeout(curriculumItemTimersRef.current[itemId]);
      delete curriculumItemTimersRef.current[itemId];
    }
    setCurriculumItemStatus((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setCurriculumSaveFailed(false);
    if (curriculumSavedBrieflyTimerRef.current) {
      clearTimeout(curriculumSavedBrieflyTimerRef.current);
      curriculumSavedBrieflyTimerRef.current = null;
    }
    setShowCurriculumSavedBriefly(false);
  };

  const markCurriculumItemSaved = (itemId: string) => {
    if (curriculumItemTimersRef.current[itemId]) {
      clearTimeout(curriculumItemTimersRef.current[itemId]);
      delete curriculumItemTimersRef.current[itemId];
    }
    setCurriculumItemStatus((prev) => ({ ...prev, [itemId]: "saved" }));
    setCurriculumSaveFailed(false);
    triggerCurriculumSavedBriefly();

    curriculumItemTimersRef.current[itemId] = setTimeout(() => {
      setCurriculumItemStatus((prev) => {
        if (prev[itemId] !== "saved") return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      delete curriculumItemTimersRef.current[itemId];
    }, 1500);
  };

  const markCurriculumItemFailed = (itemId: string) => {
    if (curriculumItemTimersRef.current[itemId]) {
      clearTimeout(curriculumItemTimersRef.current[itemId]);
      delete curriculumItemTimersRef.current[itemId];
    }
    setCurriculumItemStatus((prev) => ({ ...prev, [itemId]: "failed" }));
    setCurriculumSaveFailed(true);
    if (curriculumSavedBrieflyTimerRef.current) {
      clearTimeout(curriculumSavedBrieflyTimerRef.current);
      curriculumSavedBrieflyTimerRef.current = null;
    }
    setShowCurriculumSavedBriefly(false);
  };

  const getCurriculumItemDisplayStatus = (
    itemId: string,
  ): "saving" | "saved" | "failed" | null => {
    if (
      updatingSectionId === itemId ||
      savingLessonId === itemId ||
      inFlightLessonSavesRef.current.has(itemId)
    ) {
      return "saving";
    }
    return curriculumItemStatus[itemId] ?? null;
  };

  const isAnyCurriculumSaving =
    isSavingCurriculum ||
    isCreatingSection ||
    updatingSectionId !== null ||
    deletingSectionId !== null ||
    isReorderingSections ||
    creatingLessonSectionId !== null ||
    savingLessonId !== null ||
    deletingLessonId !== null ||
    reorderingLessonsSectionId !== null ||
    inFlightLessonSavesRef.current.size > 0 ||
    sections.some(
      (s) => s.isPendingCreation || s.lessons.some((l) => l.isPendingCreation),
    );

  const hasCurriculumItemFailed =
    curriculumSaveFailed ||
    Object.values(curriculumItemStatus).some((status) => status === "failed");

  const curriculumOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyCurriculumSaving) return "saving";
    if (hasCurriculumItemFailed) return "failed";
    if (showCurriculumSavedBriefly) return "saved";
    return null;
  }, [
    isAnyCurriculumSaving,
    hasCurriculumItemFailed,
    showCurriculumSavedBriefly,
  ]);

  // Access Rules Step server-confirmed and draft states
  const [accessRulesExists, setAccessRulesExists] = useState(false);
  const [serverAccessRules, setServerAccessRules] =
    useState<AccessRulesFormState>(initialAccessRulesState);
  const [accessRulesDraft, setAccessRulesDraft] =
    useState<AccessRulesFormState>(initialAccessRulesState);
  const accessRulesDraftRef = useRef(accessRulesDraft);
  accessRulesDraftRef.current = accessRulesDraft;
  const isAccessRulesDirty = useMemo(
    () => !isAccessRulesEqual(accessRulesDraft, serverAccessRules),
    [accessRulesDraft, serverAccessRules],
  );
  const isAccessRulesDirtyRef = useRef(isAccessRulesDirty);
  isAccessRulesDirtyRef.current = isAccessRulesDirty;

  const needsAccessRulesSave =
    isAccessRulesDirty && Boolean(accessRulesDraft.durationMode);
  const accessRules = accessRulesDraft;
  const setAccessRules = setAccessRulesDraft;

  // Immediate persistence states for Access Rules interactive controls
  const [savingAccessControls, setSavingAccessControls] = useState<Set<string>>(
    () => new Set(),
  );
  const savingAccessControlsRef = useRef<Set<string>>(new Set());
  const accessControlVersionsRef = useRef<{
    accessType: number;
    durationMode: number;
    fixedDuration: number;
    enableQA: number;
    enableComments: number;
    enableDownloads: number;
    enableNotes: number;
  }>({
    accessType: 0,
    durationMode: 0,
    fixedDuration: 0,
    enableQA: 0,
    enableComments: 0,
    enableDownloads: 0,
    enableNotes: 0,
  });
  const inFlightAccessControlsRef = useRef<Record<string, number>>({
    accessType: 0,
    durationMode: 0,
    fixedDuration: 0,
    enableQA: 0,
    enableComments: 0,
    enableDownloads: 0,
    enableNotes: 0,
  });
  const fixedDurationDebounceTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const inFlightDurationPromiseRef = useRef<Promise<unknown> | null>(null);

  const markAccessControlSaving = (controlKey: string, isSaving: boolean) => {
    if (isSaving) {
      savingAccessControlsRef.current.add(controlKey);
    } else {
      savingAccessControlsRef.current.delete(controlKey);
    }
    setSavingAccessControls(new Set(savingAccessControlsRef.current));
  };

  const isAccessControlSaving = (controlKey: string) =>
    savingAccessControlsRef.current.has(controlKey) ||
    (inFlightAccessControlsRef.current[controlKey] ?? 0) > 0;

  const [accessControlStatus, setAccessControlStatus] = useState<
    Partial<Record<AccessRulesControlKey, "saved" | "failed" | null>>
  >({});
  const accessControlTimersRef = useRef<
    Partial<Record<AccessRulesControlKey, ReturnType<typeof setTimeout>>>
  >({});
  const [accessRulesSaveFailed, setAccessRulesSaveFailed] = useState(false);
  const [showAccessRulesSavedBriefly, setShowAccessRulesSavedBriefly] =
    useState(false);
  const accessRulesSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerAccessRulesSavedBriefly = () => {
    if (accessRulesSavedBrieflyTimerRef.current) {
      clearTimeout(accessRulesSavedBrieflyTimerRef.current);
    }
    setShowAccessRulesSavedBriefly(true);
    accessRulesSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowAccessRulesSavedBriefly(false);
      accessRulesSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const accessControlTimers = accessControlTimersRef.current;
    return () => {
      Object.values(accessControlTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (accessRulesSavedBrieflyTimerRef.current) {
        clearTimeout(accessRulesSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const clearAccessControlStatus = (controlKey: AccessRulesControlKey) => {
    if (accessControlTimersRef.current[controlKey]) {
      clearTimeout(accessControlTimersRef.current[controlKey]);
      delete accessControlTimersRef.current[controlKey];
    }
    setAccessControlStatus((prev) => {
      if (!prev[controlKey]) return prev;
      const next = { ...prev };
      delete next[controlKey];
      return next;
    });
    setAccessRulesSaveFailed(false);
    if (accessRulesSavedBrieflyTimerRef.current) {
      clearTimeout(accessRulesSavedBrieflyTimerRef.current);
      accessRulesSavedBrieflyTimerRef.current = null;
    }
    setShowAccessRulesSavedBriefly(false);
  };

  const markAccessControlSaved = (controlKey: AccessRulesControlKey) => {
    if (accessControlTimersRef.current[controlKey]) {
      clearTimeout(accessControlTimersRef.current[controlKey]);
      delete accessControlTimersRef.current[controlKey];
    }
    setAccessControlStatus((prev) => ({ ...prev, [controlKey]: "saved" }));
    setAccessRulesSaveFailed(false);
    triggerAccessRulesSavedBriefly();

    accessControlTimersRef.current[controlKey] = setTimeout(() => {
      setAccessControlStatus((prev) => {
        if (prev[controlKey] !== "saved") return prev;
        const next = { ...prev };
        delete next[controlKey];
        return next;
      });
      delete accessControlTimersRef.current[controlKey];
    }, 1500);
  };

  const markAccessControlFailed = (controlKey: AccessRulesControlKey) => {
    if (accessControlTimersRef.current[controlKey]) {
      clearTimeout(accessControlTimersRef.current[controlKey]);
      delete accessControlTimersRef.current[controlKey];
    }
    setAccessControlStatus((prev) => ({ ...prev, [controlKey]: "failed" }));
    setAccessRulesSaveFailed(true);
    if (accessRulesSavedBrieflyTimerRef.current) {
      clearTimeout(accessRulesSavedBrieflyTimerRef.current);
      accessRulesSavedBrieflyTimerRef.current = null;
    }
    setShowAccessRulesSavedBriefly(false);
  };

  const getAccessControlDisplayStatus = (
    controlKey: AccessRulesControlKey,
  ): "saving" | "saved" | "failed" | null => {
    if (
      savingAccessControls.has(controlKey) ||
      (inFlightAccessControlsRef.current[controlKey] ?? 0) > 0
    ) {
      return "saving";
    }
    return accessControlStatus[controlKey] ?? null;
  };

  const isAnyAccessRulesSaving =
    savingAccessControls.size > 0 ||
    isSavingAccessRules ||
    (inFlightAccessControlsRef.current.accessType ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.durationMode ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.fixedDuration ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.enableQA ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.enableComments ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.enableDownloads ?? 0) > 0 ||
    (inFlightAccessControlsRef.current.enableNotes ?? 0) > 0;

  const hasAccessControlFailed =
    accessRulesSaveFailed ||
    Object.values(accessControlStatus).some((status) => status === "failed");

  const accessRulesOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyAccessRulesSaving) return "saving";
    if (hasAccessControlFailed) return "failed";
    if (showAccessRulesSavedBriefly) return "saved";
    return null;
  }, [
    isAnyAccessRulesSaving,
    hasAccessControlFailed,
    showAccessRulesSavedBriefly,
  ]);

  useEffect(() => {
    return () => {
      if (fixedDurationDebounceTimerRef.current) {
        clearTimeout(fixedDurationDebounceTimerRef.current);
      }
    };
  }, []);

  // Pricing Step server-confirmed and draft states
  const [serverPricing, setServerPricing] =
    useState<PricingFormState>(initialPricingState);
  const serverPricingRef = useRef(serverPricing);
  serverPricingRef.current = serverPricing;

  const [pricingDraft, setPricingDraft] =
    useState<PricingFormState>(initialPricingState);
  const pricingDraftRef = useRef(pricingDraft);
  pricingDraftRef.current = pricingDraft;

  const isPricingDirty = useMemo(
    () => !isPricingEqual(pricingDraft, serverPricing),
    [pricingDraft, serverPricing],
  );
  const isPricingDirtyRef = useRef(isPricingDirty);
  isPricingDirtyRef.current = isPricingDirty;

  // Normalised on every render so the type always follows the price typed.
  const pricing = useMemo(
    () => normalizePricingState(pricingDraft),
    [pricingDraft],
  );
  const [pricingValidationError, setPricingValidationError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!pricingValidationError) return;
    const timer = setTimeout(() => {
      setPricingValidationError(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [pricingValidationError]);

  // Immediate persistence states for Pricing interactive controls
  const [savingPricingControls, setSavingPricingControls] = useState<
    Set<string>
  >(() => new Set());
  const savingPricingControlsRef = useRef<Set<string>>(new Set());
  const pricingControlVersionsRef = useRef<{
    pricingType: number;
    currency: number;
    pricingDetails: number;
  }>({
    pricingType: 0,
    currency: 0,
    pricingDetails: 0,
  });
  const pricingVersionRef = useRef<number>(0);
  const inFlightPricingControlsRef = useRef<Record<string, number>>({
    pricingType: 0,
    currency: 0,
    pricingDetails: 0,
  });
  const pricingDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inFlightPricingPromiseRef = useRef<Promise<unknown> | null>(null);

  const markPricingControlSaving = (controlKey: string, isSaving: boolean) => {
    if (isSaving) {
      savingPricingControlsRef.current.add(controlKey);
    } else {
      savingPricingControlsRef.current.delete(controlKey);
    }
    setSavingPricingControls(new Set(savingPricingControlsRef.current));
  };

  const isPricingControlSaving = (controlKey: string) =>
    savingPricingControlsRef.current.has(controlKey) ||
    (inFlightPricingControlsRef.current[controlKey] ?? 0) > 0;

  const lastEditedPricingFieldRef = useRef<
    "sellingPrice" | "originalPrice" | null
  >(null);

  const [pricingControlStatus, setPricingControlStatus] = useState<
    Partial<Record<PricingControlKey, "saved" | "failed" | null>>
  >({});
  const pricingControlTimersRef = useRef<
    Partial<Record<PricingControlKey, ReturnType<typeof setTimeout>>>
  >({});
  const [pricingSaveFailed, setPricingSaveFailed] = useState(false);
  const [showPricingSavedBriefly, setShowPricingSavedBriefly] = useState(false);
  const pricingSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerPricingSavedBriefly = () => {
    if (pricingSavedBrieflyTimerRef.current) {
      clearTimeout(pricingSavedBrieflyTimerRef.current);
    }
    setShowPricingSavedBriefly(true);
    pricingSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowPricingSavedBriefly(false);
      pricingSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const pricingControlTimers = pricingControlTimersRef.current;
    return () => {
      Object.values(pricingControlTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (pricingSavedBrieflyTimerRef.current) {
        clearTimeout(pricingSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const clearPricingControlStatus = (controlKey: PricingControlKey) => {
    if (pricingControlTimersRef.current[controlKey]) {
      clearTimeout(pricingControlTimersRef.current[controlKey]);
      delete pricingControlTimersRef.current[controlKey];
    }
    setPricingControlStatus((prev) => {
      if (!prev[controlKey]) return prev;
      const next = { ...prev };
      delete next[controlKey];
      return next;
    });
    setPricingSaveFailed(false);
    if (pricingSavedBrieflyTimerRef.current) {
      clearTimeout(pricingSavedBrieflyTimerRef.current);
      pricingSavedBrieflyTimerRef.current = null;
    }
    setShowPricingSavedBriefly(false);
  };

  const markPricingControlSaved = (controlKey: PricingControlKey) => {
    if (pricingControlTimersRef.current[controlKey]) {
      clearTimeout(pricingControlTimersRef.current[controlKey]);
      delete pricingControlTimersRef.current[controlKey];
    }
    setPricingControlStatus((prev) => ({ ...prev, [controlKey]: "saved" }));
    setPricingSaveFailed(false);
    triggerPricingSavedBriefly();

    pricingControlTimersRef.current[controlKey] = setTimeout(() => {
      setPricingControlStatus((prev) => {
        if (prev[controlKey] !== "saved") return prev;
        const next = { ...prev };
        delete next[controlKey];
        return next;
      });
      delete pricingControlTimersRef.current[controlKey];
    }, 1500);
  };

  const markPricingControlFailed = (controlKey: PricingControlKey) => {
    if (pricingControlTimersRef.current[controlKey]) {
      clearTimeout(pricingControlTimersRef.current[controlKey]);
      delete pricingControlTimersRef.current[controlKey];
    }
    setPricingControlStatus((prev) => ({ ...prev, [controlKey]: "failed" }));
    setPricingSaveFailed(true);
    if (pricingSavedBrieflyTimerRef.current) {
      clearTimeout(pricingSavedBrieflyTimerRef.current);
      pricingSavedBrieflyTimerRef.current = null;
    }
    setShowPricingSavedBriefly(false);
  };

  const getPricingControlDisplayStatus = (
    controlKey: PricingControlKey,
  ): "saving" | "saved" | "failed" | null => {
    if (controlKey === "sellingPrice" || controlKey === "originalPrice") {
      const isDetailsSaving =
        savingPricingControls.has("pricingDetails") ||
        (inFlightPricingControlsRef.current.pricingDetails ?? 0) > 0;
      if (
        isDetailsSaving &&
        (lastEditedPricingFieldRef.current === controlKey ||
          !lastEditedPricingFieldRef.current)
      ) {
        return "saving";
      }
      return pricingControlStatus[controlKey] ?? null;
    }
    if (
      savingPricingControls.has(controlKey) ||
      (inFlightPricingControlsRef.current[controlKey] ?? 0) > 0
    ) {
      return "saving";
    }
    return pricingControlStatus[controlKey] ?? null;
  };

  const isAnyPricingSaving =
    savingPricingControls.size > 0 ||
    isSavingPricing ||
    (inFlightPricingControlsRef.current.pricingType ?? 0) > 0 ||
    (inFlightPricingControlsRef.current.currency ?? 0) > 0 ||
    (inFlightPricingControlsRef.current.pricingDetails ?? 0) > 0;

  const hasPricingControlFailed =
    pricingSaveFailed ||
    Object.values(pricingControlStatus).some((status) => status === "failed");

  const pricingOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyPricingSaving) return "saving";
    if (hasPricingControlFailed) return "failed";
    if (showPricingSavedBriefly) return "saved";
    return null;
  }, [isAnyPricingSaving, hasPricingControlFailed, showPricingSavedBriefly]);

  useEffect(() => {
    return () => {
      if (pricingDebounceTimerRef.current) {
        clearTimeout(pricingDebounceTimerRef.current);
      }
    };
  }, []);

  // Course Life Cycle state
  const [isPublished, setIsPublished] = useState<boolean>(false);

  // Publish Step state
  const [publishSettings, setPublishSettings] = useState<PublishState>({
    visibility: "public",
    scheduleOption: "now",
    scheduleDate: "2026-08-20",
    scheduleTime: "10:00",
  });
  const [expandedValidationArea, setExpandedValidationArea] =
    useState<CourseValidationArea | null>(null);

  // Course Overview Live Full Preview Modal State
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] =
    useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewModalOpen) {
        setIsPreviewModalOpen(false);
      }
    };
    if (isPreviewModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewModalOpen]);

  const [publishValidationError, setPublishValidationError] = useState<
    string | null
  >(null);

  // Auto-hide validation error message after 3.5 seconds
  useEffect(() => {
    if (!publishValidationError) return;
    const timer = setTimeout(() => {
      setPublishValidationError(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [publishValidationError]);

  // Immediate persistence states for Publish interactive controls
  const [publishControlStatus, setPublishControlStatus] = useState<
    Record<string, "saving" | "saved" | "failed" | null>
  >({});
  const publishControlTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const [publishSaveFailed, setPublishSaveFailed] = useState(false);
  const [showPublishSavedBriefly, setShowPublishSavedBriefly] = useState(false);
  const publishSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerPublishSavedBriefly = () => {
    if (publishSavedBrieflyTimerRef.current) {
      clearTimeout(publishSavedBrieflyTimerRef.current);
    }
    setShowPublishSavedBriefly(true);
    publishSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowPublishSavedBriefly(false);
      publishSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const publishControlTimers = publishControlTimersRef.current;
    return () => {
      Object.values(publishControlTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (publishSavedBrieflyTimerRef.current) {
        clearTimeout(publishSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const isAnyPublishSaving =
    isSavingPublish ||
    Object.values(publishControlStatus).some((status) => status === "saving");

  const hasPublishControlFailed =
    publishSaveFailed ||
    Object.values(publishControlStatus).some((status) => status === "failed");

  const publishOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyPublishSaving) return "saving";
    if (hasPublishControlFailed) return "failed";
    if (showPublishSavedBriefly) return "saved";
    return null;
  }, [isAnyPublishSaving, hasPublishControlFailed, showPublishSavedBriefly]);

  // Extras Step server-confirmed and draft states
  const [serverExtras, setServerExtras] =
    useState<ExtrasFormState>(initialExtrasState);
  const [serverIncludes, setServerIncludes] = useState<CourseIncludeItem[]>([]);
  const [manualIncludesDraft, setManualIncludesDraft] = useState<
    Array<{ id: string; text: string; isPendingCreation?: boolean }>
  >([]);
  const manualIncludesDraftRef = useRef(manualIncludesDraft);
  manualIncludesDraftRef.current = manualIncludesDraft;
  const dragInitialIncludesStateRef = useRef<{
    includeIds: string[];
    previousIncludes: Array<{
      id: string;
      text: string;
      isPendingCreation?: boolean;
    }>;
  } | null>(null);
  const deletingIncludeIdsRef = useRef<Set<string>>(new Set());
  const [deletingIncludeIds, setDeletingIncludeIds] = useState<Set<string>>(
    new Set(),
  );
  const savingIncludeIdsRef = useRef<Set<string>>(new Set());
  const [savingIncludeIds, setSavingIncludeIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSavingCertificate, setIsSavingCertificate] = useState(false);
  const isSavingCertificateRef = useRef(false);

  const [extrasControlStatus, setExtrasControlStatus] = useState<
    Record<string, "saved" | "failed" | null>
  >({});
  const extrasControlTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const [extrasSaveFailed, setExtrasSaveFailed] = useState(false);
  const [showExtrasSavedBriefly, setShowExtrasSavedBriefly] = useState(false);
  const extrasSavedBrieflyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const triggerExtrasSavedBriefly = () => {
    if (extrasSavedBrieflyTimerRef.current) {
      clearTimeout(extrasSavedBrieflyTimerRef.current);
    }
    setShowExtrasSavedBriefly(true);
    extrasSavedBrieflyTimerRef.current = setTimeout(() => {
      setShowExtrasSavedBriefly(false);
      extrasSavedBrieflyTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    // The record is only ever mutated, never replaced: timers added after
    // this point are in it when the cleanup runs.
    const extrasControlTimers = extrasControlTimersRef.current;
    return () => {
      Object.values(extrasControlTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (extrasSavedBrieflyTimerRef.current) {
        clearTimeout(extrasSavedBrieflyTimerRef.current);
      }
    };
  }, []);

  const clearExtrasControlStatus = (controlKey: string) => {
    if (extrasControlTimersRef.current[controlKey]) {
      clearTimeout(extrasControlTimersRef.current[controlKey]);
      delete extrasControlTimersRef.current[controlKey];
    }
    setExtrasControlStatus((prev) => {
      if (!prev[controlKey]) return prev;
      const next = { ...prev };
      delete next[controlKey];
      return next;
    });
    setExtrasSaveFailed(false);
    if (extrasSavedBrieflyTimerRef.current) {
      clearTimeout(extrasSavedBrieflyTimerRef.current);
      extrasSavedBrieflyTimerRef.current = null;
    }
    setShowExtrasSavedBriefly(false);
  };

  const markExtrasControlSaved = (controlKey: string) => {
    if (extrasControlTimersRef.current[controlKey]) {
      clearTimeout(extrasControlTimersRef.current[controlKey]);
      delete extrasControlTimersRef.current[controlKey];
    }
    setExtrasControlStatus((prev) => ({ ...prev, [controlKey]: "saved" }));
    setExtrasSaveFailed(false);
    triggerExtrasSavedBriefly();

    extrasControlTimersRef.current[controlKey] = setTimeout(() => {
      setExtrasControlStatus((prev) => {
        if (prev[controlKey] !== "saved") return prev;
        const next = { ...prev };
        delete next[controlKey];
        return next;
      });
      delete extrasControlTimersRef.current[controlKey];
    }, 1500);
  };

  const markExtrasControlFailed = (controlKey: string) => {
    if (extrasControlTimersRef.current[controlKey]) {
      clearTimeout(extrasControlTimersRef.current[controlKey]);
      delete extrasControlTimersRef.current[controlKey];
    }
    setExtrasControlStatus((prev) => ({ ...prev, [controlKey]: "failed" }));
    setExtrasSaveFailed(true);
    if (extrasSavedBrieflyTimerRef.current) {
      clearTimeout(extrasSavedBrieflyTimerRef.current);
      extrasSavedBrieflyTimerRef.current = null;
    }
    setShowExtrasSavedBriefly(false);
  };

  const getExtrasControlDisplayStatus = (
    controlKey: string,
  ): "saving" | "saved" | "failed" | null => {
    if (controlKey === "enableCertificate") {
      if (isSavingCertificate) return "saving";
      return extrasControlStatus["enableCertificate"] ?? null;
    }
    if (controlKey === "inclusions") {
      if (
        isReorderingIncludes ||
        reorderIncludesMutation.isPending ||
        savingIncludeIds.size > 0 ||
        deletingIncludeIds.size > 0 ||
        createIncludeMutation.isPending ||
        manualIncludesDraft.some((m) => m.isPendingCreation)
      ) {
        return "saving";
      }
      return extrasControlStatus["inclusions"] ?? null;
    }
    // Specific inclusion ID:
    if (
      savingIncludeIds.has(controlKey) ||
      deletingIncludeIds.has(controlKey) ||
      manualIncludesDraft.some(
        (m) => m.id === controlKey && m.isPendingCreation,
      )
    ) {
      return "saving";
    }
    return extrasControlStatus[controlKey] ?? null;
  };

  const isAnyExtrasSaving =
    isSavingExtras ||
    isSavingCertificate ||
    savingIncludeIds.size > 0 ||
    deletingIncludeIds.size > 0 ||
    isReorderingIncludes ||
    reorderIncludesMutation.isPending ||
    createIncludeMutation.isPending ||
    manualIncludesDraft.some((m) => m.isPendingCreation);

  const hasExtrasControlFailed =
    extrasSaveFailed ||
    Object.values(extrasControlStatus).some((status) => status === "failed");

  const extrasOverallStatus = useMemo(():
    "saving" | "failed" | "saved" | null => {
    if (isAnyExtrasSaving) return "saving";
    if (hasExtrasControlFailed) return "failed";
    if (showExtrasSavedBriefly) return "saved";
    return null;
  }, [isAnyExtrasSaving, hasExtrasControlFailed, showExtrasSavedBriefly]);

  const [extras, setExtras] = useState<ExtrasState>({
    inclusions: [],
    enableCertificate: false,
    certificateTemplate: "purple-certificate",
    issuanceType: "percentage",
    minCompletionPercentage: 95,
    customRuleText: "Complete all quizzes with > 80% score",
    autoEmailCertificate: true,
  });

  const suggestedInclusions = useMemo<string[]>(() => {
    const hasPreviewLessons = sections.some((s) =>
      s.lessons.some((l) => l.isPreview),
    );
    return deriveSuggestedInclusions({
      durationMode: accessRulesDraft.durationMode,
      fixedDurationValue: accessRulesDraft.fixedDurationValue,
      fixedDurationUnit: accessRulesDraft.fixedDurationUnit,
      enableCertificate: extras.enableCertificate,
      enableDownloads: accessRulesDraft.enableDownloads,
      hasPreviewLessons,
      currentDraft: manualIncludesDraft,
    });
  }, [
    accessRulesDraft.durationMode,
    accessRulesDraft.fixedDurationValue,
    accessRulesDraft.fixedDurationUnit,
    accessRulesDraft.enableDownloads,
    extras.enableCertificate,
    sections,
    manualIncludesDraft,
  ]);

  const isManualIncludesDirty = useMemo(
    () => !isManualIncludesEqual(manualIncludesDraft, serverIncludes),
    [manualIncludesDraft, serverIncludes],
  );

  const isExtrasDirty = useMemo(
    () =>
      !isExtrasEqual(
        { enableCertificate: extras.enableCertificate },
        serverExtras,
      ) || isManualIncludesDirty,
    [extras.enableCertificate, serverExtras, isManualIncludesDirty],
  );
  const isExtrasDirtyRef = useRef(isExtrasDirty);
  isExtrasDirtyRef.current = isExtrasDirty;

  const isStepDirty = (stepId: CourseWizardStepId): boolean => {
    if (stepId === "basics") return isBasicsDirty;
    if (stepId === "curriculum") return isCurriculumDirty;
    if (stepId === "access-rules") return needsAccessRulesSave;
    if (stepId === "pricing") return isPricingDirty;
    if (stepId === "extras") return isExtrasDirty;
    return false;
  };

  const hasUnsavedChanges =
    isBasicsDirty ||
    isCurriculumDirty ||
    needsAccessRulesSave ||
    isPricingDirty ||
    isExtrasDirty;

  // Pre-populate fields when editing an existing course
  useEffect(() => {
    if (editorData?.course) {
      const c = editorData.course;
      const confirmedBasics = normalizeBasicsState({
        title: c.title || "",
        shortDescription: c.shortDescription || "",
        description: c.description || "",
        categoryId: c.categoryId || "",
        difficulty: (c.difficulty as BasicsFormState["difficulty"]) || "",
        language: editorData.settings?.language || "en",
        instructorAlias: c.instructorAlias || "",
        showInstructorName:
          editorData.settings?.showInstructorName !== undefined
            ? editorData.settings.showInstructorName
            : true,
      });
      const previouslyConfirmedCategoryId = serverBasicsRef.current.categoryId;
      const previouslyConfirmedDifficulty = serverBasicsRef.current.difficulty;
      setServerBasics(confirmedBasics);
      serverBasicsRef.current = confirmedBasics;
      setCourseVersion(c.version || 1);
      courseVersionRef.current = c.version || 1;

      const confirmedThumbnailMediaId = c.thumbnailMediaId ?? null;
      if (
        !thumbnailDirtyRef.current &&
        thumbnailUploadStatusRef.current === "idle"
      ) {
        if (thumbnailObjectUrlRef.current) {
          URL.revokeObjectURL(thumbnailObjectUrlRef.current);
          thumbnailObjectUrlRef.current = null;
        }
        thumbnailMediaIdRef.current = confirmedThumbnailMediaId;
        setThumbnailMediaId(confirmedThumbnailMediaId);
        setThumbnail(
          c.thumbnailUrl ??
            getCourseThumbnailCdnUrl(confirmedThumbnailMediaId) ??
            null,
        );
      }

      const isBasicsSavingActive =
        savingBasicsControlsRef.current.size > 0 ||
        Boolean(inFlightBasicsPromiseRef.current);
      if (!isBasicsDirtyRef.current && !isBasicsSavingActive) {
        setBasicsDraft(confirmedBasics);
        basicsDraftRef.current = confirmedBasics;
      } else {
        // The draft is kept for its unsaved edit. A category the creator
        // has not touched still follows the course, so a later save cannot
        // send an outdated (or empty) one as if they had chosen it.
        const categoryId = draftCategoryAfterReload(
          basicsDraftRef.current.categoryId,
          previouslyConfirmedCategoryId,
          confirmedBasics.categoryId,
        );
        if (categoryId !== basicsDraftRef.current.categoryId) {
          setBasicsDraft((prev) => ({ ...prev, categoryId }));
          basicsDraftRef.current = { ...basicsDraftRef.current, categoryId };
        }
        // The level follows the course in the same way.
        const difficulty = draftValueAfterReload(
          basicsDraftRef.current.difficulty,
          previouslyConfirmedDifficulty,
          confirmedBasics.difficulty,
        );
        if (difficulty !== basicsDraftRef.current.difficulty) {
          setBasicsDraft((prev) => ({ ...prev, difficulty }));
          basicsDraftRef.current = { ...basicsDraftRef.current, difficulty };
        }
      }
      setIsPublished(c.status === "published");

      const hasAccessRules = Boolean(
        editorData.accessRules && editorData.accessRules.id,
      );
      setAccessRulesExists(hasAccessRules);

      const ar = editorData.accessRules;
      const s = editorData.settings;
      const isFixed = ar?.durationType === "fixed_duration";
      let fixedVal = 30;
      let fixedUnit: DurationUnit = "Days";

      if (
        hasAccessRules &&
        isFixed &&
        ar?.durationDays &&
        ar.durationDays > 0
      ) {
        const days = ar.durationDays;
        if (days % 365 === 0 && days >= 365) {
          fixedVal = days / 365;
          fixedUnit = "Years";
        } else if (days % 30 === 0 && days >= 30) {
          fixedVal = days / 30;
          fixedUnit = "Months";
        } else if (days % 7 === 0 && days >= 7) {
          fixedVal = days / 7;
          fixedUnit = "Weeks";
        } else {
          fixedVal = days;
          fixedUnit = "Days";
        }
      }

      const confirmedAccessRules: AccessRulesFormState =
        normalizeAccessRulesState({
          accessType: (ar?.accessType as AccessType) || "everyone",
          durationMode: hasAccessRules ? (isFixed ? "fixed" : "lifetime") : "",
          fixedDurationValue: fixedVal,
          fixedDurationUnit: fixedUnit,
          enableQA:
            s?.allowQa !== undefined
              ? Boolean(s.allowQa)
              : initialAccessRulesState.enableQA,
          enableComments:
            s?.allowComments !== undefined
              ? Boolean(s.allowComments)
              : initialAccessRulesState.enableComments,
          enableDownloads:
            s?.allowDownloads !== undefined
              ? Boolean(s.allowDownloads)
              : initialAccessRulesState.enableDownloads,
          enableNotes:
            s?.allowNotes !== undefined
              ? Boolean(s.allowNotes)
              : initialAccessRulesState.enableNotes,
        });

      setServerAccessRules((prev) => ({
        accessType: isAccessControlSaving("accessType")
          ? prev.accessType
          : confirmedAccessRules.accessType,
        durationMode: isAccessControlSaving("durationMode")
          ? prev.durationMode
          : confirmedAccessRules.durationMode,
        fixedDurationValue: isAccessControlSaving("fixedDuration")
          ? prev.fixedDurationValue
          : confirmedAccessRules.fixedDurationValue,
        fixedDurationUnit: isAccessControlSaving("fixedDuration")
          ? prev.fixedDurationUnit
          : confirmedAccessRules.fixedDurationUnit,
        enableQA: isAccessControlSaving("enableQA")
          ? prev.enableQA
          : confirmedAccessRules.enableQA,
        enableComments: isAccessControlSaving("enableComments")
          ? prev.enableComments
          : confirmedAccessRules.enableComments,
        enableDownloads: isAccessControlSaving("enableDownloads")
          ? prev.enableDownloads
          : confirmedAccessRules.enableDownloads,
        enableNotes: isAccessControlSaving("enableNotes")
          ? prev.enableNotes
          : confirmedAccessRules.enableNotes,
      }));

      if (
        !isAccessRulesDirtyRef.current &&
        savingAccessControlsRef.current.size === 0
      ) {
        setAccessRulesDraft((prev) => {
          const next = {
            accessType: isAccessControlSaving("accessType")
              ? prev.accessType
              : confirmedAccessRules.accessType || prev.accessType,
            durationMode: isAccessControlSaving("durationMode")
              ? prev.durationMode
              : confirmedAccessRules.durationMode || prev.durationMode,
            fixedDurationValue: isAccessControlSaving("fixedDuration")
              ? prev.fixedDurationValue
              : confirmedAccessRules.fixedDurationValue,
            fixedDurationUnit: isAccessControlSaving("fixedDuration")
              ? prev.fixedDurationUnit
              : confirmedAccessRules.fixedDurationUnit,
            enableQA: isAccessControlSaving("enableQA")
              ? prev.enableQA
              : confirmedAccessRules.enableQA,
            enableComments: isAccessControlSaving("enableComments")
              ? prev.enableComments
              : confirmedAccessRules.enableComments,
            enableDownloads: isAccessControlSaving("enableDownloads")
              ? prev.enableDownloads
              : confirmedAccessRules.enableDownloads,
            enableNotes: isAccessControlSaving("enableNotes")
              ? prev.enableNotes
              : confirmedAccessRules.enableNotes,
          };
          accessRulesDraftRef.current = next;
          return next;
        });
      }

      if (editorData.settings) {
        const s = editorData.settings;
        const confirmedExtras: ExtrasFormState = normalizeExtrasState({
          enableCertificate: s.certificateEnabled ?? false,
        });
        setServerExtras(confirmedExtras);
        setExtras((prev) => ({
          ...prev,
          enableCertificate: confirmedExtras.enableCertificate,
        }));
      }

      if (editorData.includes) {
        setServerIncludes(editorData.includes);
        if (!isExtrasDirtyRef.current) {
          const serverItems = editorData.includes.map((inc) => ({
            id: inc.id,
            text: inc.text,
          }));
          setManualIncludesDraft((prev) => {
            const pendingItems = prev.filter((p) => p.isPendingCreation);
            if (pendingItems.length === 0) return serverItems;
            const serverIds = new Set(serverItems.map((s) => s.id));
            const uniquePending = pendingItems.filter(
              (p) => !serverIds.has(p.id),
            );
            return [...serverItems, ...uniquePending];
          });
        }
      } else {
        setServerIncludes([]);
        if (!isExtrasDirtyRef.current) {
          setManualIncludesDraft((prev) =>
            prev.filter((p) => p.isPendingCreation),
          );
        }
      }

      if (editorData.pricing) {
        const p = editorData.pricing;
        const hasSale = p.salePrice != null && p.salePrice !== undefined;
        const confirmedPricing: PricingFormState = normalizePricingState({
          sellingPrice: hasSale ? String(p.salePrice) : String(p.price),
          originalPrice: hasSale && p.price > 0 ? String(p.price) : "",
          currency: p.currency || "INR",
          showDiscountBadge: p.showDiscountBadge === true,
        });
        setServerPricing(confirmedPricing);
        serverPricingRef.current = confirmedPricing;
        if (
          !isPricingDirtyRef.current &&
          savingPricingControlsRef.current.size === 0
        ) {
          setPricingDraft(confirmedPricing);
          pricingDraftRef.current = confirmedPricing;
        }
      }
      if (editorData.sections && editorData.sections.length > 0) {
        setSections((prev) => {
          const prevMap = new Map(prev.map((s) => [s.id, s]));
          const mappedServerSections = editorData.sections.map(
            (sec, secIdx) => {
              const existing = prevMap.get(sec.id);
              const serverLessonIds = new Set(
                (sec.lessons || []).map((l) => l.id),
              );
              const serverLessons = (sec.lessons || []).map((les) => {
                const existingLesson = existing?.lessons.find(
                  (l) => l.id === les.id,
                );
                const storedLessonDraft = readLessonEditorDraft(
                  currentCourseIdRef.current,
                  les.id,
                );
                const isDirty = existingLesson
                  ? isLessonDirty(existingLesson)
                  : false;
                const title =
                  isDirty && existingLesson
                    ? existingLesson.title
                    : (storedLessonDraft?.title ?? les.title);
                const description =
                  isDirty && existingLesson
                    ? existingLesson.description || ""
                    : (storedLessonDraft?.description ??
                      (les.description || ""));
                const contentType =
                  isDirty && existingLesson
                    ? existingLesson.contentType
                    : (storedLessonDraft?.contentType ?? les.contentType);
                const contentMediaId =
                  isDirty && existingLesson
                    ? (existingLesson.contentMediaId ?? null)
                    : (storedLessonDraft?.contentMediaId ??
                      les.contentMediaId ??
                      null);
                const durationSeconds =
                  isDirty && existingLesson
                    ? existingLesson.durationSeconds
                    : les.durationSeconds;
                const isPub =
                  isDirty && existingLesson
                    ? existingLesson.isPublished !== undefined
                      ? existingLesson.isPublished
                      : true
                    : (storedLessonDraft?.isPublished ??
                      (les.isPublished !== undefined ? les.isPublished : true));
                const isPrev =
                  isDirty && existingLesson
                    ? existingLesson.isPreview !== undefined
                      ? existingLesson.isPreview
                      : false
                    : (storedLessonDraft?.isPreview ??
                      (les.isPreview !== undefined ? les.isPreview : false));
                const desc = les.description || "";
                return {
                  id: les.id,
                  title,
                  isEditingTitle: existingLesson?.isEditingTitle ?? false,
                  contentTypeSelected:
                    existingLesson?.contentTypeSelected ?? true,
                  description,
                  contentType,
                  contentMediaId,
                  durationSeconds,
                  isExpanded: existingLesson
                    ? existingLesson.isExpanded
                    : false,
                  isPublished: isPub,
                  isPreview: isPrev,
                  initialState: existingLesson?.initialState || {
                    title: les.title,
                    description: desc,
                    contentType: les.contentType,
                    contentMediaId: les.contentMediaId ?? null,
                    isPublished:
                      les.isPublished !== undefined ? les.isPublished : true,
                    isPreview:
                      les.isPreview !== undefined ? les.isPreview : false,
                  },
                  resources: (les.resources || []).map((res) =>
                    toLessonResourceItem(res),
                  ),
                };
              });

              // Preserve any pending optimistic lessons that are still being created
              const pendingLessons = (existing?.lessons || []).filter(
                (l) => l.isPendingCreation || !serverLessonIds.has(l.id),
              );

              return {
                id: sec.id,
                title: sec.title,
                isExpanded: existing ? existing.isExpanded : secIdx === 0,
                isEditingTitle: existing ? existing.isEditingTitle : false,
                lessons: [...serverLessons, ...pendingLessons],
              };
            },
          );

          // Preserve any pending optimistic sections that are still being created
          const serverSectionIds = new Set(
            editorData.sections.map((s) => s.id),
          );
          const pendingSections = prev.filter(
            (s) => s.isPendingCreation || !serverSectionIds.has(s.id),
          );

          return [...mappedServerSections, ...pendingSections];
        });
      }
    } else {
      setIsPublished(false);
    }
  }, [editorData, serverCategories]);

  // Extras Inclusions Handlers
  const [draggedInclusionIndex, setDraggedInclusionIndex] = useState<
    number | null
  >(null);
  const [dragEnabledInclusionId, setDragEnabledInclusionId] = useState<
    string | null
  >(null);
  const [focusedInclusionId, setFocusedInclusionId] = useState<string | null>(
    null,
  );

  const handleAddManualInclusion = async (customText?: string) => {
    if (manualIncludesDraftRef.current.length >= 6) return;
    const defaultText =
      customText?.trim().slice(0, 25) ||
      `Benefit ${manualIncludesDraftRef.current.length + 1}`.slice(0, 25);
    const tempId = `temp-inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Immediately append temporary pending inclusion
    setManualIncludesDraft((prev) => {
      if (prev.length >= 6) return prev;
      return [
        ...prev,
        {
          id: tempId,
          text: defaultText,
          isPendingCreation: true,
        },
      ];
    });
    setFocusedInclusionId(tempId);

    // 2. Ensure course ID exists
    let targetCourseId = currentCourseId;
    if (!targetCourseId) {
      setManualIncludesDraft((prev) =>
        prev.filter((item) => item.id !== tempId),
      );
      setToastMessage("Please enter a course title on the Basics tab first.");
      return;
    }

    // 3. Immediately trigger create mutation
    try {
      const created = await createIncludeMutation.mutateAsync({
        courseId: targetCourseId,
        payload: { text: defaultText },
      });

      // 4. On success: replace tempId with real server UUID and clear isPendingCreation
      setManualIncludesDraft((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                id: created.id,
                text: item.text,
                isPendingCreation: false,
              }
            : item,
        ),
      );

      // Keep serverIncludes baseline in sync so existing saveExtrasStep does not duplicate it
      setServerIncludes((prev) => {
        if (prev.some((s) => s.id === created.id)) return prev;
        return [...prev, created];
      });
      markExtrasControlSaved(created.id);
      markExtrasControlSaved("inclusions");
    } catch (err: unknown) {
      // 5. On failure: remove ONLY this failed temporary inclusion
      setManualIncludesDraft((prev) =>
        prev.filter((item) => item.id !== tempId),
      );
      markExtrasControlFailed("inclusions");
      const errorMsg =
        (err as { message?: string })?.message || "Failed to add inclusion.";
      setToastMessage(errorMsg);
    }
  };

  const handleUpdateManualInclusionText = (id: string, text: string) => {
    clearExtrasControlStatus(id);
    clearExtrasControlStatus("inclusions");
    const truncated = text.slice(0, 25);
    setManualIncludesDraft((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, text: truncated } : item,
      ),
    );
  };

  const handleManualInclusionBlur = async (id: string) => {
    setFocusedInclusionId(null);

    if (
      savingIncludeIdsRef.current.has(id) ||
      deletingIncludeIdsRef.current.has(id)
    ) {
      return;
    }

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!currentCourseId || !UUID_REGEX.test(id)) {
      return;
    }

    const currentItem = manualIncludesDraftRef.current.find((i) => i.id === id);
    if (!currentItem || currentItem.isPendingCreation) {
      return;
    }

    const serverItem = serverIncludes.find((s) => s.id === id);
    if (!serverItem) {
      return;
    }

    const trimmed = currentItem.text.trim();

    // Empty text handling: revert to server-confirmed value because backend schema requires min(1)
    if (!trimmed) {
      setManualIncludesDraft((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: serverItem.text } : item,
        ),
      );
      return;
    }

    // Clean blur: if trimmed matches server baseline, nothing to persist
    if (trimmed === serverItem.text.trim()) {
      if (trimmed !== currentItem.text) {
        setManualIncludesDraft((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, text: trimmed } : item,
          ),
        );
      }
      return;
    }

    // Normalize draft to trimmed before persisting
    setManualIncludesDraft((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: trimmed } : item)),
    );

    savingIncludeIdsRef.current.add(id);
    setSavingIncludeIds(new Set(savingIncludeIdsRef.current));

    try {
      const updated = await updateIncludeMutation.mutateAsync({
        courseId: currentCourseId,
        includeId: id,
        payload: { text: trimmed },
      });

      // Update serverIncludes baseline so saveExtrasStep does not duplicate it
      setServerIncludes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      markExtrasControlSaved(id);
      markExtrasControlSaved("inclusions");
    } catch (err: unknown) {
      markExtrasControlFailed(id);
      markExtrasControlFailed("inclusions");
      // Revert on failure to the last confirmed server value
      setManualIncludesDraft((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: serverItem.text } : item,
        ),
      );
      const errorMsg =
        (err as { message?: string })?.message || "Failed to update inclusion.";
      setToastMessage(errorMsg);
    } finally {
      savingIncludeIdsRef.current.delete(id);
      setSavingIncludeIds(new Set(savingIncludeIdsRef.current));
    }
  };

  const handleDeleteManualInclusion = async (id: string) => {
    if (deletingIncludeIdsRef.current.has(id)) return;

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // If it is not a real server UUID (e.g. client-only temp item) or no course ID, remove locally
    if (!currentCourseId || !UUID_REGEX.test(id)) {
      setManualIncludesDraft((prev) => prev.filter((item) => item.id !== id));
      clearExtrasControlStatus(id);
      if (focusedInclusionId === id) {
        setFocusedInclusionId(null);
      }
      if (dragEnabledInclusionId === id) {
        setDragEnabledInclusionId(null);
      }
      return;
    }

    deletingIncludeIdsRef.current.add(id);
    setDeletingIncludeIds(new Set(deletingIncludeIdsRef.current));

    try {
      await deleteIncludeMutation.mutateAsync({
        courseId: currentCourseId,
        includeId: id,
      });

      // On success: remove only this inclusion from draft and server baseline
      setManualIncludesDraft((prev) => prev.filter((item) => item.id !== id));
      setServerIncludes((prev) => prev.filter((s) => s.id !== id));
      clearExtrasControlStatus(id);
      markExtrasControlSaved("inclusions");
      if (focusedInclusionId === id) {
        setFocusedInclusionId(null);
      }
      if (dragEnabledInclusionId === id) {
        setDragEnabledInclusionId(null);
      }
    } catch (err: unknown) {
      markExtrasControlFailed(id);
      markExtrasControlFailed("inclusions");
      // On failure: keep inclusion visible and show error toast
      const errorMsg =
        (err as { message?: string })?.message || "Failed to delete inclusion.";
      setToastMessage(errorMsg);
    } finally {
      deletingIncludeIdsRef.current.delete(id);
      setDeletingIncludeIds(new Set(deletingIncludeIdsRef.current));
    }
  };

  const handleInclusionDragStart = (
    e: React.DragEvent,
    index: number,
    text: string,
  ) => {
    if (
      isReorderingIncludes ||
      reorderIncludesMutation.isPending ||
      isExtrasSaving
    ) {
      e.preventDefault();
      return;
    }
    dragInitialIncludesStateRef.current = {
      includeIds: manualIncludesDraftRef.current.map((i) => i.id),
      previousIncludes: structuredClone(manualIncludesDraftRef.current),
    };
    setDraggedInclusionIndex(index);
    setCustomDragImage(
      e,
      e.currentTarget as HTMLElement,
      inclusionGhostHtml(text),
    );
  };

  const handleInclusionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedInclusionIndex === null || draggedInclusionIndex === index)
      return;
    setManualIncludesDraft((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedInclusionIndex, 1);
      if (moved) {
        copy.splice(index, 0, moved);
      }
      return copy;
    });
    setDraggedInclusionIndex(index);
  };

  const handleInclusionDragEnd = async () => {
    const initial = dragInitialIncludesStateRef.current;
    setDraggedInclusionIndex(null);
    setDragEnabledInclusionId(null);
    dragInitialIncludesStateRef.current = null;

    if (!initial) return;

    const initialIds = initial.includeIds;
    const currentIncludes = manualIncludesDraftRef.current;
    const currentIds = currentIncludes.map((i) => i.id);

    // Check if order actually changed
    const orderChanged =
      initialIds.length === currentIds.length &&
      initialIds.some((id, idx) => id !== currentIds[idx]);

    if (!orderChanged) return;

    if (currentCourseId) {
      // Validate if all IDs are valid persisted UUIDs
      const allValidUuids = currentIds.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
      );

      if (allValidUuids && serverIncludes.length === currentIds.length) {
        setIsReorderingIncludes(true);
        try {
          await reorderIncludesMutation.mutateAsync({
            courseId: currentCourseId,
            payload: {
              orderedIds: currentIds,
            },
          });
          const reorderedServer = currentIds
            .map((id) => serverIncludes.find((s) => s.id === id))
            .filter(Boolean) as CourseIncludeItem[];
          setServerIncludes(reorderedServer);
          markExtrasControlSaved("inclusions");
        } catch (err: unknown) {
          markExtrasControlFailed("inclusions");
          // Rollback to previous order on failure
          setManualIncludesDraft(initial.previousIncludes);
          const errorMsg =
            (err as { message?: string })?.message ||
            "Failed to save inclusion order. Restored previous order.";
          setToastMessage(errorMsg);
        } finally {
          setIsReorderingIncludes(false);
        }
      }
    }
  };

  // Certificate Handlers
  const handleToggleCertificate = async () => {
    if (isSavingCertificateRef.current) return;

    clearExtrasControlStatus("enableCertificate");
    const previousValue = extras.enableCertificate;
    const nextValue = !previousValue;

    // 1. Optimistic update
    setExtras((prev) => ({
      ...prev,
      enableCertificate: nextValue,
    }));

    isSavingCertificateRef.current = true;
    setIsSavingCertificate(true);

    try {
      // 2. Ensure course ID exists
      let targetCourseId = currentCourseId;
      if (!targetCourseId) {
        throw new Error(
          "Course draft must be created before enabling certificates. Please enter a course title first.",
        );
      }

      // 3. Directly call existing settings mutation
      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          certificateEnabled: nextValue,
        },
      });

      // 4. Update serverExtras baseline
      const confirmedCertificate = res.certificateEnabled ?? nextValue;
      const newBaseline = normalizeExtrasState({
        enableCertificate: confirmedCertificate,
      });
      setServerExtras(newBaseline);
      setExtras((prev) => ({
        ...prev,
        enableCertificate: newBaseline.enableCertificate,
      }));
      markExtrasControlSaved("enableCertificate");
    } catch (err: unknown) {
      markExtrasControlFailed("enableCertificate");
      // 5. Rollback on failure
      setExtras((prev) => ({
        ...prev,
        enableCertificate: previousValue,
      }));
      const errorMsg =
        (err as { message?: string })?.message ||
        "Failed to update certificate setting.";
      setToastMessage(errorMsg);
    } finally {
      isSavingCertificateRef.current = false;
      setIsSavingCertificate(false);
    }
  };

  const handleCertificateTemplateChange = (template: string) => {
    setExtras((prev) => ({ ...prev, certificateTemplate: template }));
  };

  const handleIssuanceTypeChange = (type: CertificateIssuanceType) => {
    setExtras((prev) => ({ ...prev, issuanceType: type }));
  };

  const handleMinPercentageChange = (val: number) => {
    const clamped = Math.min(100, Math.max(1, isNaN(val) ? 1 : val));
    setExtras((prev) => ({ ...prev, minCompletionPercentage: clamped }));
  };

  const handleCustomRuleTextChange = (text: string) => {
    setExtras((prev) => ({ ...prev, customRuleText: text }));
  };

  const handleToggleAutoEmailCertificate = () => {
    setExtras((prev) => ({
      ...prev,
      autoEmailCertificate: !prev.autoEmailCertificate,
    }));
  };

  const ensureCourseDraftForAccessRules = async (): Promise<string> => {
    let id = currentCourseIdRef.current || currentCourseId;
    if (id) return id;
    if (inFlightBasicsPromiseRef.current) {
      await inFlightBasicsPromiseRef.current;
      id = currentCourseIdRef.current || currentCourseId;
      if (id) return id;
    }
    throw new Error(
      "Course draft must be created before configuring access rules. Please enter a course title first.",
    );
  };

  // Access Rules State Handlers (Immediate Persistence)
  const handleAccessTypeChange = async (type: AccessType) => {
    if (type === "restricted") return; // Restricted is disabled/coming soon
    if (accessRulesDraftRef.current.accessType === type) return;

    clearAccessControlStatus("accessType");
    const previousValue = accessRulesDraftRef.current.accessType;
    const version = ++accessControlVersionsRef.current.accessType;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      accessType: type,
    };
    setAccessRules((prev) => ({ ...prev, accessType: type }));
    inFlightAccessControlsRef.current.accessType =
      (inFlightAccessControlsRef.current.accessType || 0) + 1;
    markAccessControlSaving("accessType", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      let durationDays: number | null = null;
      if (accessRulesDraftRef.current.durationMode === "fixed") {
        const val = Math.max(
          1,
          accessRulesDraftRef.current.fixedDurationValue || 1,
        );
        const unitMultiplier =
          accessRulesDraftRef.current.fixedDurationUnit === "Years"
            ? 365
            : accessRulesDraftRef.current.fixedDurationUnit === "Months"
              ? 30
              : accessRulesDraftRef.current.fixedDurationUnit === "Weeks"
                ? 7
                : 1;
        durationDays = val * unitMultiplier;
      }

      await upsertAccessRulesMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          accessType: type,
          durationType:
            accessRulesDraftRef.current.durationMode === "fixed"
              ? "fixed_duration"
              : "lifetime",
          durationDays:
            accessRulesDraftRef.current.durationMode === "fixed"
              ? durationDays
              : null,
        },
      });

      if (accessControlVersionsRef.current.accessType === version) {
        setAccessRulesExists(true);
        setServerAccessRules((prev) => ({
          ...prev,
          accessType: type,
        }));
        markAccessControlSaved("accessType");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.accessType === version) {
        markAccessControlFailed("accessType");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          accessType: previousValue,
        };
        setAccessRules((prev) => ({
          ...prev,
          accessType: previousValue,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update access type.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.accessType = Math.max(
        0,
        (inFlightAccessControlsRef.current.accessType || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.accessType === 0) {
        markAccessControlSaving("accessType", false);
      }
    }
  };

  const handleDurationModeChange = async (mode: AccessDurationMode) => {
    if (accessRulesDraftRef.current.durationMode === mode) return;

    clearAccessControlStatus("durationMode");
    if (fixedDurationDebounceTimerRef.current) {
      clearTimeout(fixedDurationDebounceTimerRef.current);
      fixedDurationDebounceTimerRef.current = null;
    }
    // Invalidate in-flight fixed duration requests so an older duration response cannot overwrite
    ++accessControlVersionsRef.current.fixedDuration;

    const previousMode = accessRulesDraftRef.current.durationMode;
    const version = ++accessControlVersionsRef.current.durationMode;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      durationMode: mode,
    };
    setAccessRules((prev) => ({ ...prev, durationMode: mode }));
    inFlightAccessControlsRef.current.durationMode =
      (inFlightAccessControlsRef.current.durationMode || 0) + 1;
    markAccessControlSaving("durationMode", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      let durationDays: number | null = null;
      if (mode === "fixed") {
        const val = Math.max(
          1,
          accessRulesDraftRef.current.fixedDurationValue || 1,
        );
        const unitMultiplier =
          accessRulesDraftRef.current.fixedDurationUnit === "Years"
            ? 365
            : accessRulesDraftRef.current.fixedDurationUnit === "Months"
              ? 30
              : accessRulesDraftRef.current.fixedDurationUnit === "Weeks"
                ? 7
                : 1;
        durationDays = val * unitMultiplier;
      }

      await upsertAccessRulesMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          accessType: accessRulesDraftRef.current.accessType || "everyone",
          durationType: mode === "fixed" ? "fixed_duration" : "lifetime",
          durationDays: mode === "fixed" ? durationDays : null,
        },
      });

      if (accessControlVersionsRef.current.durationMode === version) {
        setAccessRulesExists(true);
        setServerAccessRules((prev) => ({
          ...prev,
          durationMode: mode,
          ...(mode === "fixed"
            ? {
                fixedDurationValue:
                  accessRulesDraftRef.current.fixedDurationValue,
                fixedDurationUnit:
                  accessRulesDraftRef.current.fixedDurationUnit,
              }
            : {}),
        }));
        markAccessControlSaved("durationMode");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.durationMode === version) {
        markAccessControlFailed("durationMode");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          durationMode: previousMode,
        };
        setAccessRules((prev) => ({
          ...prev,
          durationMode: previousMode,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update access duration.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.durationMode = Math.max(
        0,
        (inFlightAccessControlsRef.current.durationMode || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.durationMode === 0) {
        markAccessControlSaving("durationMode", false);
      }
    }
  };

  const persistFixedDuration = async (
    explicitVal?: number,
    explicitUnit?: DurationUnit,
  ) => {
    const currentDraft = accessRulesDraftRef.current;
    if (currentDraft.durationMode !== "fixed") return;

    clearAccessControlStatus("fixedDuration");
    const val = Math.max(
      1,
      explicitVal !== undefined
        ? explicitVal
        : currentDraft.fixedDurationValue || 1,
    );
    const unit =
      explicitUnit !== undefined
        ? explicitUnit
        : currentDraft.fixedDurationUnit || "Days";

    const unitMultiplier =
      unit === "Years"
        ? 365
        : unit === "Months"
          ? 30
          : unit === "Weeks"
            ? 7
            : 1;
    const durationDays = val * unitMultiplier;

    const previousVal = serverAccessRules.fixedDurationValue;
    const previousUnit = serverAccessRules.fixedDurationUnit;
    const version = ++accessControlVersionsRef.current.fixedDuration;

    inFlightAccessControlsRef.current.fixedDuration =
      (inFlightAccessControlsRef.current.fixedDuration || 0) + 1;
    markAccessControlSaving("fixedDuration", true);

    const run = async () => {
      try {
        const targetCourseId = await ensureCourseDraftForAccessRules();

        await upsertAccessRulesMutation.mutateAsync({
          courseId: targetCourseId,
          payload: {
            accessType: accessRulesDraftRef.current.accessType || "everyone",
            durationType: "fixed_duration",
            durationDays,
          },
        });

        if (
          accessControlVersionsRef.current.fixedDuration === version &&
          accessRulesDraftRef.current.durationMode === "fixed"
        ) {
          setAccessRulesExists(true);
          setServerAccessRules((prev) => ({
            ...prev,
            durationMode: "fixed",
            fixedDurationValue: val,
            fixedDurationUnit: unit,
          }));
          markAccessControlSaved("fixedDuration");
        }
      } catch (err: unknown) {
        if (
          accessControlVersionsRef.current.fixedDuration === version &&
          accessRulesDraftRef.current.durationMode === "fixed"
        ) {
          markAccessControlFailed("fixedDuration");
          accessRulesDraftRef.current = {
            ...accessRulesDraftRef.current,
            fixedDurationValue: previousVal,
            fixedDurationUnit: previousUnit,
          };
          setAccessRules((prev) => ({
            ...prev,
            fixedDurationValue: previousVal,
            fixedDurationUnit: previousUnit,
          }));
          const errorMsg =
            (err as { message?: string })?.message ||
            "Failed to update fixed access duration.";
          setToastMessage(errorMsg);
        }
      } finally {
        inFlightAccessControlsRef.current.fixedDuration = Math.max(
          0,
          (inFlightAccessControlsRef.current.fixedDuration || 1) - 1,
        );
        if (inFlightAccessControlsRef.current.fixedDuration === 0) {
          markAccessControlSaving("fixedDuration", false);
        }
        if (accessControlVersionsRef.current.fixedDuration === version) {
          inFlightDurationPromiseRef.current = null;
        }
      }
    };

    const promise = run();
    inFlightDurationPromiseRef.current = promise;
    return await promise;
  };

  const flushFixedDurationPersistence = async () => {
    if (fixedDurationDebounceTimerRef.current) {
      clearTimeout(fixedDurationDebounceTimerRef.current);
      fixedDurationDebounceTimerRef.current = null;
    }

    const currentDraft = accessRulesDraftRef.current;
    const isDurationDirty =
      currentDraft.durationMode === "fixed" &&
      (serverAccessRules.durationMode !== "fixed" ||
        currentDraft.fixedDurationValue !==
          serverAccessRules.fixedDurationValue ||
        currentDraft.fixedDurationUnit !== serverAccessRules.fixedDurationUnit);

    if (isDurationDirty) {
      await persistFixedDuration();
    } else if (inFlightDurationPromiseRef.current) {
      await inFlightDurationPromiseRef.current;
    }
  };

  const handleFixedDurationValueChange = (val: number) => {
    clearAccessControlStatus("fixedDuration");
    const value = Math.max(1, isNaN(val) ? 1 : val);
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      fixedDurationValue: value,
    };
    setAccessRules((prev) => ({
      ...prev,
      fixedDurationValue: value,
    }));

    if (fixedDurationDebounceTimerRef.current) {
      clearTimeout(fixedDurationDebounceTimerRef.current);
    }
    fixedDurationDebounceTimerRef.current = setTimeout(() => {
      fixedDurationDebounceTimerRef.current = null;
      void persistFixedDuration();
    }, 400);
  };

  const handleFixedDurationUnitChange = (unit: DurationUnit) => {
    clearAccessControlStatus("fixedDuration");
    if (fixedDurationDebounceTimerRef.current) {
      clearTimeout(fixedDurationDebounceTimerRef.current);
      fixedDurationDebounceTimerRef.current = null;
    }
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      fixedDurationUnit: unit,
    };
    setAccessRules((prev) => ({ ...prev, fixedDurationUnit: unit }));
    void persistFixedDuration(
      accessRulesDraftRef.current.fixedDurationValue,
      unit,
    );
  };

  const handleToggleQA = async () => {
    clearAccessControlStatus("enableQA");
    const previousValue = accessRulesDraftRef.current.enableQA;
    const nextValue = !previousValue;
    const version = ++accessControlVersionsRef.current.enableQA;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      enableQA: nextValue,
    };
    setAccessRules((prev) => ({ ...prev, enableQA: nextValue }));
    inFlightAccessControlsRef.current.enableQA =
      (inFlightAccessControlsRef.current.enableQA || 0) + 1;
    markAccessControlSaving("enableQA", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          allowQa: nextValue,
        },
      });

      if (accessControlVersionsRef.current.enableQA === version) {
        const confirmedQa =
          res.allowQa !== undefined ? Boolean(res.allowQa) : nextValue;

        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableQA: confirmedQa,
        };
        setServerAccessRules((prev) => ({
          ...prev,
          enableQA: confirmedQa,
        }));
        setAccessRules((prev) => ({
          ...prev,
          enableQA: confirmedQa,
        }));
        markAccessControlSaved("enableQA");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.enableQA === version) {
        markAccessControlFailed("enableQA");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableQA: previousValue,
        };
        setAccessRules((prev) => ({
          ...prev,
          enableQA: previousValue,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update Q&A setting.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.enableQA = Math.max(
        0,
        (inFlightAccessControlsRef.current.enableQA || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.enableQA === 0) {
        markAccessControlSaving("enableQA", false);
      }
    }
  };

  const handleToggleComments = async () => {
    clearAccessControlStatus("enableComments");
    const previousValue = accessRulesDraftRef.current.enableComments;
    const nextValue = !previousValue;
    const version = ++accessControlVersionsRef.current.enableComments;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      enableComments: nextValue,
    };
    setAccessRules((prev) => ({ ...prev, enableComments: nextValue }));
    inFlightAccessControlsRef.current.enableComments =
      (inFlightAccessControlsRef.current.enableComments || 0) + 1;
    markAccessControlSaving("enableComments", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          allowComments: nextValue,
        },
      });

      if (accessControlVersionsRef.current.enableComments === version) {
        const confirmedComments =
          res.allowComments !== undefined
            ? Boolean(res.allowComments)
            : nextValue;

        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableComments: confirmedComments,
        };
        setServerAccessRules((prev) => ({
          ...prev,
          enableComments: confirmedComments,
        }));
        setAccessRules((prev) => ({
          ...prev,
          enableComments: confirmedComments,
        }));
        markAccessControlSaved("enableComments");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.enableComments === version) {
        markAccessControlFailed("enableComments");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableComments: previousValue,
        };
        setAccessRules((prev) => ({
          ...prev,
          enableComments: previousValue,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update comments setting.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.enableComments = Math.max(
        0,
        (inFlightAccessControlsRef.current.enableComments || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.enableComments === 0) {
        markAccessControlSaving("enableComments", false);
      }
    }
  };

  const handleToggleDownloads = async () => {
    clearAccessControlStatus("enableDownloads");
    const previousValue = accessRulesDraftRef.current.enableDownloads;
    const nextValue = !previousValue;
    const version = ++accessControlVersionsRef.current.enableDownloads;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      enableDownloads: nextValue,
    };
    setAccessRules((prev) => ({ ...prev, enableDownloads: nextValue }));
    inFlightAccessControlsRef.current.enableDownloads =
      (inFlightAccessControlsRef.current.enableDownloads || 0) + 1;
    markAccessControlSaving("enableDownloads", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          allowDownloads: nextValue,
        },
      });

      if (accessControlVersionsRef.current.enableDownloads === version) {
        const confirmedDownloads =
          res.allowDownloads !== undefined
            ? Boolean(res.allowDownloads)
            : nextValue;

        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableDownloads: confirmedDownloads,
        };
        setServerAccessRules((prev) => ({
          ...prev,
          enableDownloads: confirmedDownloads,
        }));
        setAccessRules((prev) => ({
          ...prev,
          enableDownloads: confirmedDownloads,
        }));
        markAccessControlSaved("enableDownloads");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.enableDownloads === version) {
        markAccessControlFailed("enableDownloads");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableDownloads: previousValue,
        };
        setAccessRules((prev) => ({
          ...prev,
          enableDownloads: previousValue,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update downloads setting.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.enableDownloads = Math.max(
        0,
        (inFlightAccessControlsRef.current.enableDownloads || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.enableDownloads === 0) {
        markAccessControlSaving("enableDownloads", false);
      }
    }
  };

  const handleToggleNotes = async () => {
    clearAccessControlStatus("enableNotes");
    const previousValue = accessRulesDraftRef.current.enableNotes;
    const nextValue = !previousValue;
    const version = ++accessControlVersionsRef.current.enableNotes;

    // 1. Optimistic update
    accessRulesDraftRef.current = {
      ...accessRulesDraftRef.current,
      enableNotes: nextValue,
    };
    setAccessRules((prev) => ({ ...prev, enableNotes: nextValue }));
    inFlightAccessControlsRef.current.enableNotes =
      (inFlightAccessControlsRef.current.enableNotes || 0) + 1;
    markAccessControlSaving("enableNotes", true);

    try {
      const targetCourseId = await ensureCourseDraftForAccessRules();

      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          allowNotes: nextValue,
        },
      });

      if (accessControlVersionsRef.current.enableNotes === version) {
        const confirmedNotes =
          res.allowNotes !== undefined ? Boolean(res.allowNotes) : nextValue;

        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableNotes: confirmedNotes,
        };
        setServerAccessRules((prev) => ({
          ...prev,
          enableNotes: confirmedNotes,
        }));
        setAccessRules((prev) => ({
          ...prev,
          enableNotes: confirmedNotes,
        }));
        markAccessControlSaved("enableNotes");
      }
    } catch (err: unknown) {
      if (accessControlVersionsRef.current.enableNotes === version) {
        markAccessControlFailed("enableNotes");
        accessRulesDraftRef.current = {
          ...accessRulesDraftRef.current,
          enableNotes: previousValue,
        };
        setAccessRules((prev) => ({
          ...prev,
          enableNotes: previousValue,
        }));
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update notes setting.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightAccessControlsRef.current.enableNotes = Math.max(
        0,
        (inFlightAccessControlsRef.current.enableNotes || 1) - 1,
      );
      if (inFlightAccessControlsRef.current.enableNotes === 0) {
        markAccessControlSaving("enableNotes", false);
      }
    }
  };

  // Drag and Drop state for Sections & Lessons
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(
    null,
  );
  const [dragEnabledSectionId, setDragEnabledSectionId] = useState<
    string | null
  >(null);

  const [draggedLessonState, setDraggedLessonState] =
    useState<DraggedLessonState | null>(null);
  const pinnedVirtualizedLessonIds = useMemo(
    () =>
      new Set([
        ...mountedLessonEditorIds,
        ...(draggedLessonState ? [draggedLessonState.lessonId] : []),
      ]),
    [draggedLessonState, mountedLessonEditorIds],
  );
  const draggedLessonStateRef = useRef<DraggedLessonState | null>(null);
  const [lessonDropTarget, setLessonDropTarget] =
    useState<LessonDropTarget | null>(null);
  const lessonDropTargetRef = useRef<LessonDropTarget | null>(null);
  const [dragEnabledLessonId, setDragEnabledLessonId] = useState<string | null>(
    null,
  );

  // Reusable Delete Confirmation Modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Section actions
  const handleAddSection = async () => {
    if (
      isCreatingSection ||
      createSectionMutation.isPending ||
      createCourseMutation.isPending
    )
      return;

    const tempSectionId = `temp-sec-${Date.now()}`;
    const newSectionTitle = "Title";
    const optimisticSection: CurriculumSectionItem = {
      id: tempSectionId,
      title: newSectionTitle,
      isExpanded: true,
      isEditingTitle: false,
      isPendingCreation: true,
      lessons: [],
    };

    // Show temporary section immediately
    pendingAddedSectionScrollRef.current = tempSectionId;
    setSections((prev) => [...prev, optimisticSection]);
    setIsCreatingSection(true);

    let targetCourseId = currentCourseId;
    if (!targetCourseId) {
      pendingAddedSectionScrollRef.current = null;
      setSections((prev) => prev.filter((s) => s.id !== tempSectionId));
      setToastMessage("Please enter a course title on the Basics tab first.");
      setIsCreatingSection(false);
      return;
    }

    try {
      const createdSection = await createSectionMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          title: newSectionTitle,
        },
      });

      // Replace temporary ID with real backend UUID
      if (pendingAddedSectionScrollRef.current === tempSectionId) {
        pendingAddedSectionScrollRef.current = createdSection.id;
      }
      setSections((prev) => {
        const hasServerSection = prev.some((s) => s.id === createdSection.id);
        if (hasServerSection) {
          return prev
            .filter((s) => s.id !== tempSectionId)
            .map((s) =>
              s.id === createdSection.id
                ? { ...s, isPendingCreation: false }
                : s,
            );
        }
        return prev.map((s) =>
          s.id === tempSectionId
            ? {
                ...s,
                id: createdSection.id,
                title: createdSection.title,
                isPendingCreation: false,
              }
            : s,
        );
      });
    } catch (err: unknown) {
      // Rollback temporary section on failure
      if (pendingAddedSectionScrollRef.current === tempSectionId) {
        pendingAddedSectionScrollRef.current = null;
      }
      setSections((prev) => prev.filter((s) => s.id !== tempSectionId));
      const errorMsg =
        (err as { message?: string })?.message || "Failed to create section.";
      setToastMessage(errorMsg);
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleStartEditSectionTitle = (sectionId: string) => {
    clearCurriculumItemStatus(sectionId);
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, isEditingTitle: true } : s,
      ),
    );
  };

  const handleSaveSectionTitle = async (
    sectionId: string,
    newTitle: string,
  ) => {
    const trimmedTitle = newTitle.trim();
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;

    if (!trimmedTitle || trimmedTitle === sec.title) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, isEditingTitle: false } : s,
        ),
      );
      return;
    }

    if (currentCourseId) {
      setUpdatingSectionId(sectionId);
      try {
        await updateSectionMutation.mutateAsync({
          courseId: currentCourseId,
          sectionId,
          payload: { title: trimmedTitle },
        });
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? { ...s, title: trimmedTitle, isEditingTitle: false }
              : s,
          ),
        );
        markCurriculumItemSaved(sectionId);
      } catch (err: unknown) {
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to update section title.";
        setToastMessage(errorMsg);
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, isEditingTitle: false } : s,
          ),
        );
        markCurriculumItemFailed(sectionId);
      } finally {
        setUpdatingSectionId(null);
      }
    } else {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, title: trimmedTitle, isEditingTitle: false }
            : s,
        ),
      );
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setDeleteModalState({
      isOpen: true,
      title: `Delete "${sec.title}"?`,
      message: `Are you sure you want to delete "${sec.title}" and its ${sec.lessons.length} lessons? This action cannot be undone.`,
      onConfirm: async () => {
        if (currentCourseId) {
          setDeletingSectionId(sectionId);
          try {
            await deleteSectionMutation.mutateAsync({
              courseId: currentCourseId,
              sectionId,
            });
            setSections((prev) => prev.filter((s) => s.id !== sectionId));
            setToastMessage(`Section "${sec.title}" deleted.`);
          } catch (err: unknown) {
            const errorMsg =
              (err as { message?: string })?.message ||
              "Failed to delete section.";
            setToastMessage(errorMsg);
          } finally {
            setDeletingSectionId(null);
          }
        } else {
          setSections((prev) => prev.filter((s) => s.id !== sectionId));
        }
      },
    });
  };

  // Section Drag and Drop handlers
  const handleSectionDragStart = (
    e: React.DragEvent,
    index: number,
    section: CurriculumSectionItem,
  ) => {
    if (
      isReorderingSections ||
      reorderSectionsMutation.isPending ||
      updatingSectionId ||
      deletingSectionId
    ) {
      e.preventDefault();
      return;
    }
    dragInitialSectionsStateRef.current = {
      sectionIds: sectionsRef.current.map((s) => s.id),
      previousSections: structuredClone(sectionsRef.current),
    };
    setDraggedSectionIndex(index);
    setCustomDragImage(
      e,
      e.currentTarget as HTMLElement,
      sectionGhostHtml(section.title, index, section.lessons.length),
    );
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    if (draggedLessonStateRef.current) return;
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === index) return;
    setSections((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedSectionIndex, 1);
      if (moved) {
        copy.splice(index, 0, moved);
      }
      return copy;
    });
    setDraggedSectionIndex(index);
  };

  const handleSectionDragEnd = async () => {
    const initial = dragInitialSectionsStateRef.current;
    setDraggedSectionIndex(null);
    setDragEnabledSectionId(null);
    dragInitialSectionsStateRef.current = null;

    if (!initial) return;

    const initialIds = initial.sectionIds;
    const currentSections = sectionsRef.current;
    const currentIds = currentSections.map((s) => s.id);

    // Check if order actually changed
    const orderChanged =
      initialIds.length === currentIds.length &&
      initialIds.some((id, idx) => id !== currentIds[idx]);

    if (!orderChanged) return;

    if (currentCourseId) {
      // Validate that all IDs are valid UUIDs (persisted sections)
      const allValidUuids = currentIds.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
      );

      if (allValidUuids) {
        setIsReorderingSections(true);
        try {
          await reorderSectionsMutation.mutateAsync({
            courseId: currentCourseId,
            payload: {
              orderedSectionIds: currentIds,
              version: courseVersion || 1,
            },
          });
          setCourseVersion((prev) => prev + 1);
        } catch (err: unknown) {
          // Rollback to previous sections order on failure
          setSections(initial.previousSections);
          const errorMsg =
            (err as { message?: string })?.message ||
            "Failed to save section order. Restored previous order.";
          setToastMessage(errorMsg);
        } finally {
          setIsReorderingSections(false);
        }
      }
    }
  };

  // Lesson actions
  const handleAddLesson = async (sectionId: string) => {
    if (
      creatingLessonSectionId ||
      createLessonMutation.isPending ||
      createCourseMutation.isPending ||
      createSectionMutation.isPending
    ) {
      return;
    }

    const sec = sections.find((s) => s.id === sectionId);
    if (!sec || sec.isPendingCreation) return;

    const tempLessonId = `temp-les-${Date.now()}`;
    const newLessonTitle = `New Lesson ${sec.lessons.length + 1}`;
    const optimisticLesson: CurriculumLessonItem = {
      id: tempLessonId,
      title: newLessonTitle,
      description: "",
      contentType: "video" as const,
      contentTypeSelected: true,
      isExpanded: true,
      isPublished: true,
      isPreview: false,
      contentMediaId: null,
      isPendingCreation: true,
      initialState: {
        title: newLessonTitle,
        description: "",
        contentType: "video",
        isPublished: true,
        isPreview: false,
      },
      resources: [],
    };

    // Show temporary lesson immediately
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: [
            ...s.lessons.map((l) => ({ ...l, isExpanded: false })),
            optimisticLesson,
          ],
        };
      }),
    );
    setCreatingLessonSectionId(sectionId);
    let targetCourseId = currentCourseId;

    if (!targetCourseId) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                lessons: s.lessons.filter((l) => l.id !== tempLessonId),
              }
            : s,
        ),
      );
      setToastMessage("Please enter a course title on the Basics tab first.");
      setCreatingLessonSectionId(null);
      return;
    }

    let targetSectionId = sectionId;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetSectionId,
      )
    ) {
      try {
        const createdSection = await createSectionMutation.mutateAsync({
          courseId: targetCourseId,
          payload: { title: sec.title },
        });
        targetSectionId = createdSection.id;
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, id: targetSectionId } : s,
          ),
        );
      } catch (err: unknown) {
        // Rollback temporary lesson
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  lessons: s.lessons.filter((l) => l.id !== tempLessonId),
                }
              : s,
          ),
        );
        const errorMsg =
          (err as { message?: string })?.message ||
          "Failed to create section on server.";
        setToastMessage(errorMsg);
        setCreatingLessonSectionId(null);
        return;
      }
    }

    try {
      const createdLesson = await createLessonMutation.mutateAsync({
        courseId: targetCourseId,
        sectionId: targetSectionId,
        payload: {
          title: newLessonTitle,
          contentType: "video",
          description: "",
        },
      });

      // Replace temporary ID with real backend UUID
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== targetSectionId && s.id !== sectionId) return s;
          const hasServerLesson = s.lessons.some(
            (l) => l.id === createdLesson.id,
          );
          if (hasServerLesson) {
            return {
              ...s,
              id: targetSectionId,
              lessons: s.lessons
                .filter((l) => l.id !== tempLessonId)
                .map((l) =>
                  l.id === createdLesson.id
                    ? { ...l, isPendingCreation: false }
                    : l,
                ),
            };
          }
          return {
            ...s,
            id: targetSectionId,
            lessons: s.lessons.map((l) =>
              l.id === tempLessonId
                ? {
                    ...l,
                    id: createdLesson.id,
                    isPendingCreation: false,
                    initialState: l.initialState || {
                      title: l.title,
                      description: l.description || "",
                      contentType: l.contentType,
                      contentMediaId: l.contentMediaId ?? null,
                      isPublished:
                        l.isPublished !== undefined ? l.isPublished : true,
                      isPreview:
                        l.isPreview !== undefined ? l.isPreview : false,
                    },
                  }
                : l,
            ),
          };
        }),
      );
    } catch (err: unknown) {
      // Rollback temporary lesson on failure
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== targetSectionId && s.id !== sectionId) return s;
          return {
            ...s,
            lessons: s.lessons.filter((l) => l.id !== tempLessonId),
          };
        }),
      );
      const errorMsg =
        (err as { message?: string })?.message || "Failed to create lesson.";
      setToastMessage(errorMsg);
    } finally {
      setCreatingLessonSectionId(null);
    }
  };

  const handleDeleteLesson = (sectionId: string, lessonId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    const les = sec?.lessons.find((l) => l.id === lessonId);
    if (!les) return;

    setDeleteModalState({
      isOpen: true,
      title: `Delete "${les.title}"?`,
      message: `Are you sure you want to delete lesson "${les.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (
          currentCourseId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            lessonId,
          )
        ) {
          setDeletingLessonId(lessonId);
          try {
            await deleteLessonMutation.mutateAsync({
              courseId: currentCourseId,
              lessonId,
            });
            setSections((prev) =>
              prev.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                  ...s,
                  lessons: s.lessons.filter((l) => l.id !== lessonId),
                };
              }),
            );
            setToastMessage(`Lesson "${les.title}" deleted.`);
          } catch (err: unknown) {
            const errorMsg =
              (err as { message?: string })?.message ||
              "Failed to delete lesson.";
            setToastMessage(errorMsg);
          } finally {
            setDeletingLessonId(null);
          }
        } else {
          setSections((prev) =>
            prev.map((s) => {
              if (s.id !== sectionId) return s;
              return {
                ...s,
                lessons: s.lessons.filter((l) => l.id !== lessonId),
              };
            }),
          );
        }
      },
    });
  };

  const handleUpdateLesson = (
    sectionId: string,
    lessonId: string,
    updates: Partial<CurriculumLessonItem>,
  ) => {
    clearCurriculumItemStatus(lessonId);
    const currentSections = sectionsRef.current || sections;
    const nextSections = currentSections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        lessons: sec.lessons.map((l) =>
          l.id === lessonId ? { ...l, ...updates } : l,
        ),
      };
    });
    sectionsRef.current = nextSections;
    setSections(nextSections);
  };

  const handleCancelLessonDraft = (
    sectionId: string,
    lessonId: string,
    draft: LessonEditorDraft,
  ) => {
    const currentSections = sectionsRef.current || sections;
    const currentLesson = currentSections
      .find((section) => section.id === sectionId)
      ?.lessons.find((lesson) => lesson.id === lessonId);
    if (!currentLesson) return;

    writeLessonEditorDraft(currentCourseId, lessonId, {
      title: draft.title,
      description: currentLesson.description || "",
      contentType: draft.contentType,
      contentMediaId: currentLesson.contentMediaId ?? null,
      isPublished: draft.isPublished,
      isPreview: draft.isPreview,
    });

    handleUpdateLesson(sectionId, lessonId, {
      title: draft.title,
      contentType: draft.contentType,
      contentMediaId: currentLesson.contentMediaId ?? null,
      isPublished: draft.isPublished,
      isPreview: draft.isPreview,
    });
  };

  const persistLesson = async (
    sectionId: string,
    lessonId: string,
    options?: PersistLessonOptions,
  ): Promise<boolean> => {
    // If a save is already in-flight for this lesson, await it, then persist any subsequent edits
    const existingSave = inFlightLessonSavesRef.current.get(lessonId);
    if (existingSave) {
      await existingSave;
      return persistLesson(sectionId, lessonId, options);
    }

    const savePromise = (async () => {
      // 1. Find the freshest lesson draft
      const currentSections = sectionsRef.current || sections;
      const sec = currentSections.find((s) => s.id === sectionId);
      const les = sec?.lessons.find((l) => l.id === lessonId);
      if (!les || les.isPendingCreation) return false;

      // 2. Check whether it is dirty
      if (!isLessonDirty(les)) {
        clearLessonEditorDraft(currentCourseId, lessonId);
        return true;
      }

      // 3. Validate existing lesson title rules
      const trimmedTitle = les.title.trim();
      if (!trimmedTitle) {
        setToastMessage("Lesson title cannot be empty.");
        return false;
      }

      const isPublishedVal =
        les.isPublished !== undefined ? les.isPublished : true;
      const isPreviewVal = les.isPreview !== undefined ? les.isPreview : false;

      // 4. Snapshot the exact payload being persisted
      const persistedSnapshot = {
        title: trimmedTitle,
        description: les.description || "",
        contentType: (les.contentType === "audio"
          ? "video"
          : les.contentType === "image"
            ? "document"
            : les.contentType) as "video" | "document" | "quiz",
        contentMediaId: les.contentMediaId ?? null,
        durationSeconds: les.durationSeconds,
        isPublished: isPublishedVal,
        isPreview: isPreviewVal,
      };

      const targetCourseId = options?.explicitCourseId || currentCourseId;

      if (
        targetCourseId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          lessonId,
        )
      ) {
        setSavingLessonId(lessonId);
        try {
          await updateLessonMutation.mutateAsync({
            courseId: targetCourseId,
            lessonId,
            payload: persistedSnapshot,
          });

          setSections((prev) => {
            const next = prev.map((s) => {
              if (s.id !== sectionId) return s;
              return {
                ...s,
                lessons: s.lessons.map((l) => {
                  if (l.id !== lessonId) return l;
                  return {
                    ...l,
                    isExpanded: options?.collapseOnSuccess
                      ? false
                      : l.isExpanded,
                    initialState: {
                      ...persistedSnapshot,
                    },
                  };
                }),
              };
            });
            sectionsRef.current = next;
            return next;
          });

          markCurriculumItemSaved(lessonId);
          clearLessonEditorDraft(targetCourseId, lessonId);
          return true;
        } catch (err: unknown) {
          const errorMsg =
            (err as { message?: string })?.message ||
            "Failed to update lesson.";
          setToastMessage(errorMsg);
          markCurriculumItemFailed(lessonId);
          return false;
        } finally {
          setSavingLessonId(null);
        }
      } else {
        setSections((prev) => {
          const next = prev.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              lessons: s.lessons.map((l) => {
                if (l.id !== lessonId) return l;
                return {
                  ...l,
                  isExpanded: options?.collapseOnSuccess ? false : l.isExpanded,
                  initialState: {
                    ...persistedSnapshot,
                  },
                };
              }),
            };
          });
          sectionsRef.current = next;
          return next;
        });
        clearLessonEditorDraft(targetCourseId, lessonId);
        return true;
      }
    })();

    inFlightLessonSavesRef.current.set(lessonId, savePromise);
    savePromise.finally(() => {
      inFlightLessonSavesRef.current.delete(lessonId);
    });

    return savePromise;
  };

  const handleSaveLesson = async (
    sectionId: string,
    lessonId: string,
  ): Promise<boolean> => {
    return await persistLesson(sectionId, lessonId, {
      collapseOnSuccess: true,
      showCleanToast: true,
    });
  };

  const handleLessonFieldBlur = async (sectionId: string, lessonId: string) => {
    const currentSections = sectionsRef.current || sections;
    const sec = currentSections.find((s) => s.id === sectionId);
    const les = sec?.lessons.find((l) => l.id === lessonId);
    if (!les || les.isPendingCreation) return;
    if (!isLessonDirty(les)) return;

    await persistLesson(sectionId, lessonId, {
      collapseOnSuccess: false,
    });
  };

  const handleStartEditLessonTitle = (sectionId: string, lessonId: string) => {
    const currentSections = sectionsRef.current || sections;
    const lesson = currentSections
      .find((section) => section.id === sectionId)
      ?.lessons.find((item) => item.id === lessonId);
    if (!lesson || lesson.isPendingCreation) return;

    lessonTitleDraftsRef.current.set(lessonId, lesson.title);
    clearCurriculumItemStatus(lessonId);
    setSections((prev) =>
      prev.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              lessons: section.lessons.map((item) =>
                item.id === lessonId ? { ...item, isEditingTitle: true } : item,
              ),
            },
      ),
    );
  };

  const handleCancelEditLessonTitle = (sectionId: string, lessonId: string) => {
    const originalTitle = lessonTitleDraftsRef.current.get(lessonId);
    lessonTitleDraftsRef.current.delete(lessonId);
    setSections((prev) => {
      const next = prev.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              lessons: section.lessons.map((lesson) =>
                lesson.id === lessonId
                  ? {
                      ...lesson,
                      ...(originalTitle !== undefined
                        ? { title: originalTitle }
                        : {}),
                      isEditingTitle: false,
                    }
                  : lesson,
              ),
            },
      );
      sectionsRef.current = next;
      return next;
    });
  };

  const handleLessonTitleBlur = async (sectionId: string, lessonId: string) => {
    lessonTitleDraftsRef.current.delete(lessonId);
    await handleLessonFieldBlur(sectionId, lessonId);
    setSections((prev) =>
      prev.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              lessons: section.lessons.map((lesson) =>
                lesson.id === lessonId
                  ? { ...lesson, isEditingTitle: false }
                  : lesson,
              ),
            },
      ),
    );
  };

  const handleCancelLessonDescriptionEdit = (
    sectionId: string,
    lessonId: string,
  ) => {
    const currentSections = sectionsRef.current || sections;
    const lesson = currentSections
      .find((section) => section.id === sectionId)
      ?.lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    handleUpdateLesson(sectionId, lessonId, {
      description: lesson.initialState?.description || "",
    });
  };

  const handleLessonDiscreteChange = async (
    sectionId: string,
    lessonId: string,
    updates: Partial<CurriculumLessonItem>,
  ): Promise<boolean> => {
    const isContentTypeChange = Boolean(updates.contentType);
    handleUpdateLesson(sectionId, lessonId, updates);
    const currentSections = sectionsRef.current || sections;
    const sec = currentSections.find((s) => s.id === sectionId);
    const les = sec?.lessons.find((l) => l.id === lessonId);
    if (!les || les.isPendingCreation) return false;
    if (!isLessonDirty(les)) {
      if (isContentTypeChange) {
        handleUpdateLesson(sectionId, lessonId, {
          contentTypeSelected: true,
          pendingContentType: undefined,
        });
      }
      return true;
    }

    const persisted = await persistLesson(sectionId, lessonId, {
      collapseOnSuccess: false,
    });
    if (persisted && isContentTypeChange) {
      handleUpdateLesson(sectionId, lessonId, {
        contentTypeSelected: true,
        pendingContentType: undefined,
      });
    }
    return persisted;
  };

  const handleLessonMediaAttached = async (
    sectionId: string,
    lessonId: string,
    mediaAssetId: string,
  ): Promise<boolean> => {
    const currentSections = sectionsRef.current || sections;
    const lesson = currentSections
      .find((section) => section.id === sectionId)
      ?.lessons.find((item) => item.id === lessonId);
    if (!lesson) return false;

    const courseId = currentCourseIdRef.current || currentCourseId;
    const isPersistedLesson =
      !lesson.isPendingCreation &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        lessonId,
      );
    if (!courseId || !isPersistedLesson) {
      // Unsaved lessons carry the media ID in their creation payload.
      handleUpdateLesson(sectionId, lessonId, { contentMediaId: mediaAssetId });
      return true;
    }

    // Persist the binding before exposing it to the editor. The media
    // workspace requests playback for the lesson as soon as it sees the new
    // media ID, and that request fails until the API lesson references it.
    try {
      await updateLessonMutation.mutateAsync({
        courseId,
        lessonId,
        payload: { contentMediaId: mediaAssetId },
      });
    } catch (err: unknown) {
      setToastMessage(
        (err as { message?: string })?.message ||
          "The video could not be attached to this lesson.",
      );
      return false;
    }

    clearVideoPlaybackBootstrapCache();
    // A cancelled editor leaves a local draft that wins over server data on
    // the next editor refresh. Keep its media in sync so the draft cannot
    // restore the replaced video.
    const storedDraft = readLessonEditorDraft(courseId, lessonId);
    if (storedDraft) {
      const { savedAt: _savedAt, ...draft } = storedDraft;
      writeLessonEditorDraft(courseId, lessonId, {
        ...draft,
        contentMediaId: mediaAssetId,
      });
    }
    const latestLesson = (sectionsRef.current || sections)
      .find((section) => section.id === sectionId)
      ?.lessons.find((item) => item.id === lessonId);
    handleUpdateLesson(sectionId, lessonId, {
      contentMediaId: mediaAssetId,
      ...(latestLesson?.initialState
        ? {
            initialState: {
              ...latestLesson.initialState,
              contentMediaId: mediaAssetId,
            },
          }
        : {}),
    });
    return true;
  };

  const handleLessonProcessingComplete = async (): Promise<void> => {
    if (!currentCourseIdRef.current) return;

    // The media stream is the source of truth for the terminal state. Once it
    // reports completion, refresh the derived editor/preview data so
    // duration and readiness are reflected everywhere without polling.
    await Promise.allSettled([refetchEditor(), refetchPreview()]);
  };

  const saveAllDirtyLessons = async (
    explicitCourseId?: string | null,
  ): Promise<boolean> => {
    if (isSavingAllDirtyLessonsRef.current) return false;
    isSavingAllDirtyLessonsRef.current = true;
    try {
      const currentSections = sectionsRef.current || sections;
      const dirtyLessons: Array<{ sectionId: string; lessonId: string }> = [];
      for (const sec of currentSections) {
        for (const les of sec.lessons) {
          if (isLessonDirty(les) && !les.isPendingCreation) {
            dirtyLessons.push({ sectionId: sec.id, lessonId: les.id });
          }
        }
      }

      if (dirtyLessons.length === 0) {
        return true;
      }

      const results = await Promise.all(
        dirtyLessons.map(({ sectionId, lessonId }) =>
          persistLesson(sectionId, lessonId, {
            collapseOnSuccess: false,
            explicitCourseId,
          }),
        ),
      );

      return results.every(Boolean);
    } finally {
      isSavingAllDirtyLessonsRef.current = false;
    }
  };

  const handleToggleLessonExpand = async (
    sectionId: string,
    lessonId: string,
    nextExpanded = true,
  ): Promise<boolean> => {
    const currentSections = sectionsRef.current || sections;
    const sec = currentSections.find((s) => s.id === sectionId);
    const les = sec?.lessons.find((l) => l.id === lessonId);
    if (!les) return false;

    if (!nextExpanded && isLessonDirty(les)) {
      return await handleSaveLesson(sectionId, lessonId);
    }

    return true;
  };

  const navigateToCurriculumFocus = (
    sectionId?: string | null,
    lessonId?: string | null,
  ) => {
    void navigate(
      getCourseEditorPath({
        mode: isEditing ? "edit" : "create",
        courseId: activeEditId,
        step: "curriculum",
        sectionId,
        lessonId,
      }),
    );
  };

  const handleToggleSectionExpand = async (sectionId: string) => {
    const currentSections = sectionsRef.current || sections;
    const sec = currentSections.find((s) => s.id === sectionId);
    if (!sec) return;

    // 1. When the section is being EXPANDED:
    if (!sec.isExpanded) {
      if (
        isCollapsingSectionRef.current ||
        isSavingAllDirtyLessonsRef.current
      ) {
        return;
      }

      const sectionsToCollapse = currentSections.filter(
        (section) => section.id !== sectionId && section.isExpanded,
      );
      const targetIndex = currentSections.findIndex(
        (section) => section.id === sectionId,
      );
      sectionScrollDelayRef.current = currentSections
        .slice(0, targetIndex)
        .some((section) => section.isExpanded)
        ? 300
        : 0;
      const dirtyLessons = sectionsToCollapse.flatMap((section) =>
        section.lessons
          .filter(
            (lesson) => isLessonDirty(lesson) && !lesson.isPendingCreation,
          )
          .map((lesson) => ({ sectionId: section.id, lesson })),
      );

      if (dirtyLessons.length > 0) {
        isCollapsingSectionRef.current = true;
        let allSuccessful = true;
        try {
          for (const { sectionId: dirtySectionId, lesson } of dirtyLessons) {
            const success = await persistLesson(dirtySectionId, lesson.id, {
              collapseOnSuccess: true,
            });
            if (!success) {
              allSuccessful = false;
              break;
            }
          }
        } finally {
          isCollapsingSectionRef.current = false;
        }
        if (!allSuccessful) return;
      }

      setSections((prev) => {
        const next = prev.map((section) =>
          section.id === sectionId
            ? { ...section, isExpanded: true }
            : section.isExpanded
              ? { ...section, isExpanded: false }
              : section,
        );
        sectionsRef.current = next;
        return next;
      });
      navigateToCurriculumFocus(sectionId);
      return;
    }

    // 2. When the section is being COLLAPSED:
    // Find dirty lessons in that section
    const dirtyLessons = sec.lessons.filter(
      (l) => isLessonDirty(l) && !l.isPendingCreation,
    );

    // No dirty lessons? Collapse immediately
    if (dirtyLessons.length === 0) {
      setSections((prev) => {
        const next = prev.map((s) =>
          s.id === sectionId ? { ...s, isExpanded: false } : s,
        );
        sectionsRef.current = next;
        return next;
      });
      navigateToCurriculumFocus();
      return;
    }

    // Guard against re-entrancy if already collapsing or saving
    if (isCollapsingSectionRef.current || isSavingAllDirtyLessonsRef.current) {
      return;
    }

    // Dirty lessons? Save dirty lesson(s)
    isCollapsingSectionRef.current = true;
    let allSuccessful = true;
    try {
      for (const lesson of dirtyLessons) {
        const success = await persistLesson(sectionId, lesson.id, {
          collapseOnSuccess: true,
        });
        if (!success) {
          allSuccessful = false;
          break;
        }
      }
    } finally {
      isCollapsingSectionRef.current = false;
    }

    // All saves successful?
    // Yes -> Collapse section
    // No  -> Keep section expanded
    if (allSuccessful) {
      setSections((prev) => {
        const next = prev.map((s) =>
          s.id === sectionId ? { ...s, isExpanded: false } : s,
        );
        sectionsRef.current = next;
        return next;
      });
      navigateToCurriculumFocus();
    }
  };

  const handleCreateLessonResource = async (
    lessonId: string,
    payload: CreateLessonResourceRequest,
  ): Promise<LessonResource> => {
    if (!currentCourseId) {
      throw new Error("Save the course before adding lesson resources.");
    }
    return await createLessonResourceMutation.mutateAsync({
      courseId: currentCourseId,
      lessonId,
      payload,
    });
  };

  const handleLessonResourceAdded = (
    sectionId: string,
    lessonId: string,
    resource: LessonResourceItem,
  ) => {
    setSections((prev) => {
      const next = prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lessons: sec.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            if (l.resources.some((existing) => existing.id === resource.id)) {
              return l;
            }
            return {
              ...l,
              resources: [...l.resources, resource],
            };
          }),
        };
      });
      sectionsRef.current = next;
      return next;
    });
  };

  const handleDeleteLessonResource = async (
    resourceId: string,
  ): Promise<void> => {
    if (!currentCourseId) {
      throw new Error("Save the course before removing lesson resources.");
    }
    await deleteLessonResourceMutation.mutateAsync({
      courseId: currentCourseId,
      resourceId,
    });
  };

  const handleLessonResourceRemoved = (
    sectionId: string,
    lessonId: string,
    resource: LessonResourceItem,
  ) => {
    setSections((prev) => {
      const next = prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lessons: sec.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            return {
              ...l,
              resources: l.resources.filter((r) => r.id !== resource.id),
            };
          }),
        };
      });
      sectionsRef.current = next;
      return next;
    });
  };

  // Lesson Drag and Drop handlers
  const handleLessonDragStart = (
    e: React.DragEvent,
    sectionId: string,
    lessonIndex: number,
    lesson: CurriculumLessonItem,
  ) => {
    if (
      reorderingLessonsSectionId ||
      reorderLessonsMutation.isPending ||
      savingLessonId ||
      deletingLessonId
    ) {
      e.preventDefault();
      return;
    }
    const currentSec = sectionsRef.current.find((s) => s.id === sectionId);
    const nextDraggedLessonState = { sectionId, lessonId: lesson.id };
    dragInitialLessonStateRef.current = {
      sectionId,
      lessonIds: currentSec ? currentSec.lessons.map((l) => l.id) : [],
      previousLessons: currentSec ? structuredClone(currentSec.lessons) : [],
    };
    draggedLessonStateRef.current = nextDraggedLessonState;
    setDraggedLessonState(nextDraggedLessonState);
    lessonDropTargetRef.current = null;
    setLessonDropTarget(null);
    setCustomDragImage(
      e,
      e.currentTarget as HTMLElement,
      lessonGhostHtml(
        lesson.title,
        lessonIndex,
        lesson.pendingContentType || lesson.contentType,
      ),
    );
    e.stopPropagation();
  };

  const handleLessonDragOver = (
    e: React.DragEvent,
    targetSectionId: string,
    targetLessonId: string,
  ) => {
    const draggedLesson = draggedLessonStateRef.current;
    if (!draggedLesson || targetSectionId !== draggedLesson.sectionId) return;
    e.preventDefault();
    e.stopPropagation();
    if (targetLessonId === draggedLesson.lessonId) {
      lessonDropTargetRef.current = null;
      setLessonDropTarget(null);
      return;
    }

    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position =
      e.clientY < targetRect.top + targetRect.height / 2 ? "before" : "after";
    const nextDropTarget = {
      sectionId: targetSectionId,
      lessonId: targetLessonId,
      position,
    } satisfies LessonDropTarget;
    lessonDropTargetRef.current = nextDropTarget;
    setLessonDropTarget(nextDropTarget);
  };

  const handleLessonDragEnd = async () => {
    const initial = dragInitialLessonStateRef.current;
    const draggedLesson = draggedLessonStateRef.current;
    const dropTarget = lessonDropTargetRef.current;
    setDraggedLessonState(null);
    setDragEnabledLessonId(null);
    draggedLessonStateRef.current = null;
    lessonDropTargetRef.current = null;
    setLessonDropTarget(null);
    dragInitialLessonStateRef.current = null;

    if (
      !initial ||
      !draggedLesson ||
      !dropTarget ||
      dropTarget.sectionId !== initial.sectionId
    ) {
      return;
    }

    const currentSec = sectionsRef.current.find(
      (s) => s.id === initial.sectionId,
    );
    if (!currentSec) return;

    const sourceIndex = currentSec.lessons.findIndex(
      (lesson) => lesson.id === draggedLesson.lessonId,
    );
    const targetIndex = currentSec.lessons.findIndex(
      (lesson) => lesson.id === dropTarget.lessonId,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    let insertionIndex =
      targetIndex + (dropTarget.position === "after" ? 1 : 0);
    if (sourceIndex < insertionIndex) insertionIndex -= 1;
    if (sourceIndex === insertionIndex) return;

    const nextLessons = [...currentSec.lessons];
    const [movedLesson] = nextLessons.splice(sourceIndex, 1);
    if (!movedLesson) return;
    nextLessons.splice(insertionIndex, 0, movedLesson);

    const nextSections = sectionsRef.current.map((section) =>
      section.id === initial.sectionId
        ? { ...section, lessons: nextLessons }
        : section,
    );
    sectionsRef.current = nextSections;
    setSections(nextSections);

    const currentLessonIds = nextLessons.map((l) => l.id);
    const initialLessonIds = initial.lessonIds;

    const orderChanged =
      initialLessonIds.length === currentLessonIds.length &&
      initialLessonIds.some((id, idx) => id !== currentLessonIds[idx]);

    if (!orderChanged) return;

    if (
      currentCourseId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        initial.sectionId,
      )
    ) {
      const allValidUuids = currentLessonIds.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
      );

      if (allValidUuids) {
        setReorderingLessonsSectionId(initial.sectionId);
        try {
          await reorderLessonsMutation.mutateAsync({
            courseId: currentCourseId,
            sectionId: initial.sectionId,
            payload: {
              orderedLessonIds: currentLessonIds,
              version: courseVersion || 1,
            },
          });
          setCourseVersion((prev) => prev + 1);
        } catch (err: unknown) {
          // Rollback to previous order on failure
          setSections((prev) =>
            prev.map((s) => {
              if (s.id !== initial.sectionId) return s;
              return {
                ...s,
                lessons: initial.previousLessons,
              };
            }),
          );
          const errorMsg =
            (err as { message?: string })?.message ||
            "Failed to save lesson order. Restored previous order.";
          setToastMessage(errorMsg);
        } finally {
          setReorderingLessonsSectionId(null);
        }
      }
    }
  };

  // Computed total stats
  const totalSections = sections.length;
  const totalLessons = sections.reduce(
    (acc, sec) => acc + sec.lessons.length,
    0,
  );

  // Prefer the server-calculated duration or estimated duration from editor data.
  const courseDurationSeconds = resolveCourseDurationSeconds(
    editorData?.course?.totalDurationSeconds,
    editorData?.settings?.estimatedDuration,
  );
  const computedDuration = formatDuration(courseDurationSeconds);

  // Student-facing Preview Object Adapter
  const previewCourse: Course = {
    id: currentCourseId || "preview-course",
    title: courseTitle.trim() || "Course Title",
    description:
      courseDescription.trim() || "This is a short description of your course.",
    level: (difficultyLevel
      ? difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)
      : "Beginner") as CourseLevel,
    category: (selectedCategoryName || "Development") as CourseCategory,
    sections: totalSections,
    lectures: totalLessons,
    progress: null,
    enrolled: false,
    duration: computedDuration,
    students: 0,
    thumbnail: thumbnail || "/static/instructor-poster.jpg",
    lifecycleStatus: isPublished ? "published" : "draft",
  };

  const previewInclusions: string[] = useMemo(() => {
    return manualIncludesDraft
      .map((m) => m.text.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [manualIncludesDraft]);

  const previewIncludes: CourseInclude[] = useMemo(() => {
    return previewInclusions.map((text) => ({
      icon: /certificate/i.test(text)
        ? Certificate
        : /download/i.test(text)
          ? DownloadSimple
          : /lifetime|access/i.test(text)
            ? Clock
            : /preview/i.test(text)
              ? PlayCircle
              : CheckCircle,
      label: text,
    }));
  }, [previewInclusions]);

  const ensureCourseDraftForPricing = async (
    explicitCourseId?: string | null,
  ): Promise<string> => {
    let targetId =
      explicitCourseId || currentCourseIdRef.current || currentCourseId;
    if (targetId) return targetId;
    if (inFlightBasicsPromiseRef.current) {
      await inFlightBasicsPromiseRef.current;
      targetId =
        explicitCourseId || currentCourseIdRef.current || currentCourseId;
      if (targetId) return targetId;
    }
    throw new Error(
      "Course draft must be created before setting pricing. Please enter a course title first.",
    );
  };

  const executeSerializedPricingMutation = async (
    controlKey: "pricingType" | "currency" | "pricingDetails",
    targetVersion: number,
    previousSnapshot: PricingFormState,
  ) => {
    const priorPromise = inFlightPricingPromiseRef.current;

    const run = async () => {
      if (priorPromise) {
        try {
          await priorPromise;
        } catch {
          // Allow subsequent queued requests to proceed even if previous failed
        }
      }

      // If a newer version was triggered while waiting in queue, abort obsolete execution
      if (pricingVersionRef.current !== targetVersion) {
        return;
      }

      const latestDraft = pricingDraftRef.current;
      const validation = validatePricing(latestDraft);
      if (!validation.isValid) {
        return;
      }

      const targetCourseId = await ensureCourseDraftForPricing();
      const payload = buildPricingPayload(latestDraft);

      const res = await upsertPricingMutation.mutateAsync({
        courseId: targetCourseId,
        payload,
      });

      // Stale-response protection: Only update baseline if we are still at targetVersion
      if (pricingVersionRef.current === targetVersion) {
        const hasSale = res.salePrice != null && res.salePrice !== undefined;
        const newBaseline: PricingFormState = normalizePricingState({
          sellingPrice: hasSale ? String(res.salePrice) : String(res.price),
          originalPrice: hasSale && res.price > 0 ? String(res.price) : "",
          currency: res.currency || "INR",
          showDiscountBadge: res.showDiscountBadge === true,
        });
        setServerPricing(newBaseline);
        serverPricingRef.current = newBaseline;

        if (controlKey === "pricingDetails") {
          const field = lastEditedPricingFieldRef.current;
          if (field) {
            markPricingControlSaved(field);
          }
          markPricingControlSaved("pricingDetails");
        } else {
          markPricingControlSaved(controlKey);
        }
      }
      return res;
    };

    const execute = async () => {
      try {
        return await run();
      } catch (err: unknown) {
        // Rollback only if no newer edit has superseded this one
        if (pricingVersionRef.current === targetVersion) {
          if (controlKey === "pricingType") {
            pricingDraftRef.current = {
              ...pricingDraftRef.current,
              pricingType: previousSnapshot.pricingType,
            };
            setPricingDraft((prev) => ({
              ...prev,
              pricingType: previousSnapshot.pricingType,
            }));
            markPricingControlFailed("pricingType");
          } else if (controlKey === "currency") {
            pricingDraftRef.current = {
              ...pricingDraftRef.current,
              currency: previousSnapshot.currency,
            };
            setPricingDraft((prev) => ({
              ...prev,
              currency: previousSnapshot.currency,
            }));
            markPricingControlFailed("currency");
          } else if (controlKey === "pricingDetails") {
            pricingDraftRef.current = {
              ...pricingDraftRef.current,
              sellingPrice: previousSnapshot.sellingPrice,
              originalPrice: previousSnapshot.originalPrice,
              showDiscountBadge: previousSnapshot.showDiscountBadge,
            };
            setPricingDraft((prev) => ({
              ...prev,
              sellingPrice: previousSnapshot.sellingPrice,
              originalPrice: previousSnapshot.originalPrice,
              showDiscountBadge: previousSnapshot.showDiscountBadge,
            }));
            const field = lastEditedPricingFieldRef.current;
            if (field) {
              markPricingControlFailed(field);
            }
            markPricingControlFailed("pricingDetails");
          }
          const errorMsg =
            err instanceof Error
              ? err.message
              : "Failed to save pricing changes. Reverting to last saved state.";
          setToastMessage(errorMsg);
        }
        throw err;
      } finally {
        inFlightPricingControlsRef.current[controlKey] = Math.max(
          0,
          (inFlightPricingControlsRef.current[controlKey] || 1) - 1,
        );
        if (inFlightPricingControlsRef.current[controlKey] === 0) {
          markPricingControlSaving(controlKey, false);
        }
        if (pricingVersionRef.current === targetVersion) {
          inFlightPricingPromiseRef.current = null;
        }
      }
    };

    const promise = execute();
    inFlightPricingPromiseRef.current = promise;
    return await promise;
  };

  const persistPricingDetails = async () => {
    const currentDraft = pricingDraftRef.current;
    const validation = validatePricing(currentDraft);
    if (!validation.isValid) {
      return;
    }

    const version = ++pricingVersionRef.current;
    pricingControlVersionsRef.current.pricingDetails = version;
    inFlightPricingControlsRef.current.pricingDetails =
      (inFlightPricingControlsRef.current.pricingDetails || 0) + 1;
    markPricingControlSaving("pricingDetails", true);

    const previousSnapshot = { ...serverPricingRef.current };
    return await executeSerializedPricingMutation(
      "pricingDetails",
      version,
      previousSnapshot,
    );
  };

  const flushPricingPersistence = async () => {
    if (pricingDebounceTimerRef.current) {
      clearTimeout(pricingDebounceTimerRef.current);
      pricingDebounceTimerRef.current = null;
    }

    const currentDraft = pricingDraftRef.current;
    const isDirty = !isPricingEqual(currentDraft, serverPricingRef.current);

    if (isDirty) {
      const validation = validatePricing(currentDraft);
      if (validation.isValid) {
        await persistPricingDetails();
      }
    } else if (inFlightPricingPromiseRef.current) {
      await inFlightPricingPromiseRef.current;
    }
  };

  const handleSellingPriceChange = (val: string) => {
    lastEditedPricingFieldRef.current = "sellingPrice";
    clearPricingControlStatus("sellingPrice");
    clearPricingControlStatus("pricingDetails");
    const digitsOnly = val.replace(/\D/g, "");
    pricingDraftRef.current = {
      ...pricingDraftRef.current,
      sellingPrice: digitsOnly,
    };
    setPricingDraft((prev) => ({ ...prev, sellingPrice: digitsOnly }));
    if (pricingValidationError) setPricingValidationError(null);

    if (pricingDebounceTimerRef.current) {
      clearTimeout(pricingDebounceTimerRef.current);
    }
    pricingDebounceTimerRef.current = setTimeout(() => {
      pricingDebounceTimerRef.current = null;
      void persistPricingDetails();
    }, 400);
  };

  // The badge is one click, not typing: it is saved at once.
  const handleShowDiscountBadgeChange = (checked: boolean) => {
    lastEditedPricingFieldRef.current = "originalPrice";
    clearPricingControlStatus("originalPrice");
    clearPricingControlStatus("pricingDetails");
    pricingDraftRef.current = {
      ...pricingDraftRef.current,
      showDiscountBadge: checked,
    };
    setPricingDraft((prev) => ({ ...prev, showDiscountBadge: checked }));
    if (pricingDebounceTimerRef.current) {
      clearTimeout(pricingDebounceTimerRef.current);
      pricingDebounceTimerRef.current = null;
    }
    void persistPricingDetails();
  };

  const handleOriginalPriceChange = (val: string) => {
    lastEditedPricingFieldRef.current = "originalPrice";
    clearPricingControlStatus("originalPrice");
    clearPricingControlStatus("pricingDetails");
    const digitsOnly = val.replace(/\D/g, "");
    pricingDraftRef.current = {
      ...pricingDraftRef.current,
      originalPrice: digitsOnly,
    };
    setPricingDraft((prev) => ({ ...prev, originalPrice: digitsOnly }));
    if (pricingValidationError) setPricingValidationError(null);

    if (pricingDebounceTimerRef.current) {
      clearTimeout(pricingDebounceTimerRef.current);
    }
    pricingDebounceTimerRef.current = setTimeout(() => {
      pricingDebounceTimerRef.current = null;
      void persistPricingDetails();
    }, 400);
  };

  const handleCurrencyChange = async (val: string) => {
    if (pricingDraftRef.current.currency === val) return;

    clearPricingControlStatus("currency");
    const previousSnapshot = { ...pricingDraftRef.current };
    const version = ++pricingVersionRef.current;
    pricingControlVersionsRef.current.currency = version;

    // 1. Optimistic update
    pricingDraftRef.current = {
      ...pricingDraftRef.current,
      currency: val,
    };
    setPricingDraft((prev) => ({ ...prev, currency: val }));
    if (pricingValidationError) setPricingValidationError(null);

    // While the price is not valid yet, keep the currency in the local draft
    {
      const validation = validatePricing(pricingDraftRef.current);
      if (!validation.isValid) {
        return;
      }
    }

    inFlightPricingControlsRef.current.currency =
      (inFlightPricingControlsRef.current.currency || 0) + 1;
    markPricingControlSaving("currency", true);

    try {
      await executeSerializedPricingMutation(
        "currency",
        version,
        previousSnapshot,
      );
    } catch {
      // Error handled in executeSerializedPricingMutation
    }
  };

  const currencySymbol = getCurrencySymbol(pricing.currency || "INR");
  const previewCurrency = pricing.currency || "INR";
  const previewSellingAmount = pricing.sellingPrice.trim()
    ? parseFloat(pricing.sellingPrice.replace(/,/g, ""))
    : 0;
  const previewOriginalAmount = pricing.originalPrice.trim()
    ? parseFloat(pricing.originalPrice.replace(/,/g, ""))
    : 0;

  const previewPricing: CourseOverviewPricingProps =
    pricing.pricingType === "free"
      ? previewOriginalAmount > 0
        ? {
            price: `${currencySymbol}0`,
            originalPrice: `${currencySymbol}${pricing.originalPrice.trim()}`,
            discount: "Free",
            amount: 0,
            currency: previewCurrency,
          }
        : { price: "Free", amount: 0, currency: previewCurrency }
      : {
          price: pricing.sellingPrice.trim()
            ? `${currencySymbol}${pricing.sellingPrice.trim()}`
            : `${currencySymbol}1,999`,
          originalPrice: pricing.originalPrice.trim()
            ? `${currencySymbol}${pricing.originalPrice.trim()}`
            : undefined,
          discount:
            pricing.originalPrice.trim() &&
            pricing.sellingPrice.trim() &&
            previewOriginalAmount > previewSellingAmount
              ? `${Math.round(
                  ((previewOriginalAmount - previewSellingAmount) /
                    previewOriginalAmount) *
                    100,
                )}% OFF`
              : undefined,
          amount: Number.isFinite(previewSellingAmount)
            ? previewSellingAmount
            : 0,
          currency: previewCurrency,
        };

  const editorCourseSlug = editorData?.course?.slug;
  const editorCourseStatus = editorData?.course?.status;
  const editorCourseCreatorId = editorData?.course?.creatorId;
  const editorCourseThumbnailMediaId = editorData?.course?.thumbnailMediaId;
  const editorCourseTrailerMediaId = editorData?.course?.trailerMediaId;
  const editorCourseCreatedAt = editorData?.course?.createdAt;
  const editorCourseUpdatedAt = editorData?.course?.updatedAt;
  const editorCoursePublishedAt = editorData?.course?.publishedAt;
  const editorCourseTotalDurationSeconds =
    editorData?.course?.totalDurationSeconds;
  const editorAccessRulesId = editorData?.accessRules?.id;
  const editorPricingId = editorData?.pricing?.id;
  const editorSettingsId = editorData?.settings?.id;
  const editorEstimatedDuration = editorData?.settings?.estimatedDuration;

  const localPreviewData = useMemo<CourseEditorDataResponse | null>(() => {
    if (!isPreviewModalOpen) return null;

    return buildLocalPreviewData({
      currentCourseId,
      courseTitle,
      shortDescription,
      courseDescription,
      categoryId,
      difficultyLevel,
      language,
      instructorAlias,
      showInstructorName,
      courseVersion,
      isPublished,
      thumbnailMediaId,
      trailerMediaId: editorCourseTrailerMediaId || null,
      sections,
      pricingDraft,
      accessRulesDraft,
      enableCertificate: extras.enableCertificate,
      manualIncludesDraft,
      editorDefaults: {
        course: {
          slug: editorCourseSlug,
          status: editorCourseStatus,
          creatorId: editorCourseCreatorId,
          thumbnailMediaId: editorCourseThumbnailMediaId,
          trailerMediaId: editorCourseTrailerMediaId,
          createdAt: editorCourseCreatedAt,
          updatedAt: editorCourseUpdatedAt,
          publishedAt: editorCoursePublishedAt,
          totalDurationSeconds: editorCourseTotalDurationSeconds,
        },
        accessRules: { id: editorAccessRulesId },
        pricing: { id: editorPricingId },
        settings: {
          id: editorSettingsId,
          estimatedDuration: editorEstimatedDuration,
        },
      },
      totalDurationSeconds: resolveCourseDurationSeconds(
        editorCourseTotalDurationSeconds,
        editorEstimatedDuration,
      ),
    });
  }, [
    isPreviewModalOpen,
    currentCourseId,
    courseTitle,
    shortDescription,
    courseDescription,
    difficultyLevel,
    categoryId,
    instructorAlias,
    showInstructorName,
    language,
    courseVersion,
    isPublished,
    thumbnailMediaId,
    editorCourseSlug,
    editorCourseStatus,
    editorCourseCreatorId,
    editorCourseThumbnailMediaId,
    editorCourseTrailerMediaId,
    editorCourseCreatedAt,
    editorCourseUpdatedAt,
    editorCoursePublishedAt,
    editorCourseTotalDurationSeconds,
    editorAccessRulesId,
    editorPricingId,
    editorSettingsId,
    editorEstimatedDuration,
    sections,
    accessRulesDraft,
    pricingDraft,
    extras.enableCertificate,
    manualIncludesDraft,
  ]);

  // Explicit non-reconciliation: when local preview data is available from wizard state,
  // it renders immediately. previewData remains fetched in the background without overwriting.
  const activePreviewData = localPreviewData || previewData;

  // Publish Checklist Validation based strictly on server validation response
  const getChecklistState = (area: CourseValidationArea): ChecklistState => {
    if (isValidating) return "validating";
    if (!serverValidation) return "idle";
    return serverValidation.sections[area].valid ? "valid" : "invalid";
  };

  const validationChecklistItems: Array<{
    area: CourseValidationArea;
    label: string;
    summary: string;
  }> = [
    { area: "basics", label: "Basics", summary: "Completed" },
    {
      area: "curriculum",
      label: "Curriculum",
      summary: `${totalSections} Sections, ${totalLessons} Lessons`,
    },
    {
      area: "accessRules",
      label: "Access Rules",
      summary:
        accessRules.accessType === "everyone"
          ? "Everyone"
          : "Restricted Access",
    },
    {
      area: "pricing",
      label: "Pricing",
      summary:
        pricing.pricingType === "free"
          ? "Free"
          : `${currencySymbol}${pricing.sellingPrice}`,
    },
    {
      area: "extras",
      label: "Extras",
      summary: extras.enableCertificate ? "Certificate Enabled" : "Disabled",
    },
  ];

  useEffect(() => {
    if (isValidating) setExpandedValidationArea(null);
  }, [isValidating]);

  const isCourseReadyToPublish = serverValidation?.canPublish ?? false;

  const handlePreviewAction = async () => {
    if (
      isAnyApiInProgress ||
      isPreviewLoading ||
      actionLoading !== null ||
      isSavingAllDirtyLessonsRef.current ||
      isInitialCourseCreationPending
    )
      return;

    if (activeStep === "curriculum") {
      const currentSections = sectionsRef.current || sections;
      const hasDirty = currentSections.some((s) =>
        s.lessons.some((l) => isLessonDirty(l) && !l.isPendingCreation),
      );
      if (hasDirty) {
        setActionLoading("save");
        try {
          const success = await saveAllDirtyLessons();
        } catch {
          return;
        } finally {
          setActionLoading(null);
        }
      }
    }

    if (activeStep === "basics") {
      await flushBasicsPersistence();
    }

    setIsPreviewModalOpen(true);
  };

  const executeSerializedBasicsMetaMutation = async (
    controlKey:
      "title" | "shortDescription" | "courseDescription" | "instructorAlias",
    targetVersion: number,
    previousSnapshot: BasicsFormState,
  ) => {
    const priorPromise = inFlightBasicsPromiseRef.current;

    const run = async () => {
      if (priorPromise) {
        try {
          await priorPromise;
        } catch {
          // Allow subsequent queued requests to proceed even if previous failed
        }
      }

      // If a newer version was triggered while waiting in queue, abort obsolete execution
      if (basicsVersionRef.current !== targetVersion) {
        return;
      }

      // CRITICAL: Read LATEST draft values and LATEST courseVersion at actual execution time!
      const latestDraft = basicsDraftRef.current;
      const currentVersion = courseVersionRef.current;

      const trimmedTitle = latestDraft.title.trim();
      if (!trimmedTitle) {
        return;
      }

      const targetCourseId = currentCourseIdRef.current || currentCourseId;
      if (!targetCourseId) {
        return;
      }

      const payload = {
        title: trimmedTitle,
        shortDescription: latestDraft.shortDescription.trim() || null,
        description: latestDraft.description.trim() || null,
        // Only a category the creator changed is sent; see the helper.
        ...categoryChangeToSend(
          latestDraft.categoryId,
          serverBasicsRef.current.categoryId,
        ),
        // The level likewise: it used to go out on every save, `null` when
        // the draft held none, which now removes the stored level.
        ...basicsChangeToSend(
          "difficulty",
          latestDraft.difficulty,
          serverBasicsRef.current.difficulty,
        ),
        instructorAlias: latestDraft.instructorAlias.trim() || null,
        version: currentVersion,
      };

      const updated = await updateBasicsMutation.mutateAsync({
        id: targetCourseId,
        payload,
      });

      // Stale-response protection: Only update baseline if we are still at targetVersion
      if (basicsVersionRef.current === targetVersion) {
        setCourseVersion(updated.version);
        courseVersionRef.current = updated.version;

        const newBaseline: BasicsFormState = normalizeBasicsState({
          title: updated.title,
          shortDescription: updated.shortDescription || "",
          description: updated.description || "",
          categoryId: updated.categoryId || "",
          difficulty:
            (updated.difficulty as BasicsFormState["difficulty"]) || "",
          language: serverBasicsRef.current.language,
          instructorAlias: updated.instructorAlias || "",
          showInstructorName: serverBasicsRef.current.showInstructorName,
        });
        setServerBasics(newBaseline);
        serverBasicsRef.current = newBaseline;
      }
      return updated;
    };

    const execute = async () => {
      try {
        const result = await run();
        if (result && basicsVersionRef.current === targetVersion) {
          if (
            controlKey === "title" ||
            controlKey === "shortDescription" ||
            controlKey === "courseDescription" ||
            controlKey === "instructorAlias"
          ) {
            markBasicsFieldSaved(controlKey);
          }
        }
        return result;
      } catch (err: unknown) {
        // Rollback only if no newer edit has superseded this one
        if (basicsVersionRef.current === targetVersion) {
          if (
            controlKey === "title" ||
            controlKey === "shortDescription" ||
            controlKey === "courseDescription" ||
            controlKey === "instructorAlias"
          ) {
            markBasicsFieldFailed(controlKey);
          }
          if (controlKey === "title") {
            setCourseTitle(previousSnapshot.title);
          } else if (controlKey === "shortDescription") {
            setShortDescription(previousSnapshot.shortDescription);
          } else if (controlKey === "courseDescription") {
            setCourseDescription(previousSnapshot.description);
          } else if (controlKey === "instructorAlias") {
            setInstructorAlias(previousSnapshot.instructorAlias);
          }
          const errorMsg =
            err instanceof Error
              ? err.message
              : "Failed to save course basics changes. Reverting to last saved state.";
          setToastMessage(errorMsg);
        }
        throw err;
      } finally {
        inFlightBasicsControlsRef.current[controlKey] = Math.max(
          0,
          (inFlightBasicsControlsRef.current[controlKey] || 1) - 1,
        );
        if (inFlightBasicsControlsRef.current[controlKey] === 0) {
          markBasicsControlSaving(controlKey, false);
        }
        if (basicsVersionRef.current === targetVersion) {
          inFlightBasicsPromiseRef.current = null;
        }
      }
    };

    const promise = execute();
    inFlightBasicsPromiseRef.current = promise;
    return await promise;
  };

  /**
   * Ensures a brand-new course has been created exactly once.
   *
   * Invariant:
   *   - If a creation request is already in flight, the caller JOINS that
   *     shared promise — no second POST /courses is issued.
   *   - If no creation is in flight, one is started and its promise is
   *     registered synchronously (before the first await) so every subsequent
   *     concurrent caller will find it and join rather than fork.
   *   - currentCourseIdRef.current is updated immediately on success so every
   *     caller that awaited the shared promise can read the confirmed ID.
   *   - The promise is cleared in finally so a failed attempt can be retried.
   */
  const ensureCourseCreated = async (
    title: string,
    instructorAlias: string | null,
  ): Promise<{
    id: string;
    version: number;
    title: string;
    instructorAlias?: string | null;
  }> => {
    // Cancel any pending title creation debounce since creation is now starting/joining.
    cancelTitleCreationDebounce();

    // If course already exists, return it.
    if (currentCourseIdRef.current) {
      return {
        id: currentCourseIdRef.current,
        version: courseVersionRef.current,
        title: serverBasicsRef.current.title || title,
        instructorAlias:
          serverBasicsRef.current.instructorAlias || instructorAlias,
      };
    }

    // Join an existing in-flight creation rather than starting a new one.
    if (inFlightCourseCreationPromiseRef.current) {
      return await inFlightCourseCreationPromiseRef.current;
    }

    // Register the promise SYNCHRONOUSLY before the first await so any
    // concurrent caller that checks immediately after this line will find it.
    const promise = (async () => {
      isInitialCurriculumBootstrapInProgressRef.current = true;
      setIsInitialCurriculumBootstrapInProgress(true);

      const created = await createCourseMutation.mutateAsync({
        title,
        instructorAlias,
      });

      // Write the confirmed ID to the ref immediately so all awaiting callers
      // can use it as soon as the shared promise resolves.
      currentCourseIdRef.current = created.id;
      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("edit") !== created.id) {
          currentUrl.searchParams.set("edit", created.id);
          currentUrl.searchParams.delete("courseId");
          window.history.replaceState(
            window.history.state,
            "",
            currentUrl.toString(),
          );
        }
      }

      // Prebuild initial section ("Introduction") and initial lesson ("New Lesson 1")
      try {
        const createdSection = await createSectionMutation.mutateAsync({
          courseId: created.id,
          payload: { title: "Introduction" },
        });

        const createdLesson = await createLessonMutation.mutateAsync({
          courseId: created.id,
          sectionId: createdSection.id,
          payload: {
            title: "New Lesson 1",
            contentType: "video",
            description: "",
          },
        });

        const prebuiltLesson: CurriculumLessonItem = {
          id: createdLesson.id,
          title: "New Lesson 1",
          description: "",
          contentType: "video",
          contentTypeSelected: true,
          isExpanded: true,
          isPublished: true,
          isPreview: false,
          contentMediaId: null,
          isPendingCreation: false,
          initialState: {
            title: "New Lesson 1",
            description: "",
            contentType: "video",
            contentMediaId: null,
            isPublished: true,
            isPreview: false,
          },
          resources: [],
        };

        const prebuiltSection: CurriculumSectionItem = {
          id: createdSection.id,
          title: createdSection.title || "Introduction",
          isEditingTitle: false,
          isExpanded: true,
          isPendingCreation: false,
          lessons: [prebuiltLesson],
        };

        setSections([prebuiltSection]);
        sectionsRef.current = [prebuiltSection];
      } catch (bootstrapErr: unknown) {
        const errorMsg =
          bootstrapErr instanceof Error
            ? bootstrapErr.message
            : "Course created, but default section setup could not be completed.";
        setToastMessage(errorMsg);
      }

      return created;
    })();

    inFlightCourseCreationPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      isInitialCurriculumBootstrapInProgressRef.current = false;
      setIsInitialCurriculumBootstrapInProgress(false);
      // Clear regardless of success/failure so a failed attempt can be retried.
      inFlightCourseCreationPromiseRef.current = null;
    }
  };

  const persistBasicsField = async (
    fieldKey:
      "title" | "shortDescription" | "courseDescription" | "instructorAlias",
  ) => {
    const currentDraft = basicsDraftRef.current;
    const baseline = serverBasicsRef.current;

    if (fieldKey === "title") {
      const trimmed = currentDraft.title.trim();
      if (!currentCourseIdRef.current && !currentCourseId) {
        // Creation gate: do not call the API for an empty title.
        if (!trimmed) {
          return;
        }
        markBasicsControlSaving("title", true);
        try {
          // ensureCourseCreated guarantees at most one POST /courses even when
          // multiple callers (blur, tab-switch, flush, preview) race here.
          const created = await ensureCourseCreated(
            trimmed,
            currentDraft.instructorAlias.trim() || null,
          );
          // currentCourseIdRef.current is already set inside ensureCourseCreated.
          setCurrentCourseId(created.id);
          setCourseVersion(created.version);
          courseVersionRef.current = created.version;
          setShowTitleTooltip(false);

          const newBaseline: BasicsFormState = normalizeBasicsState({
            ...baseline,
            title: created.title,
            instructorAlias: created.instructorAlias || "",
          });
          setServerBasics(newBaseline);
          serverBasicsRef.current = newBaseline;

          // Check if title was edited while creation was in flight
          const latestTitle = basicsDraftRef.current.title.trim();
          if (latestTitle && latestTitle !== created.title) {
            // User modified title while creation was in flight.
            // Preserve user's latest draft in local state:
            setBasicsDraft((prev) => ({
              ...prev,
              instructorAlias: created.instructorAlias ?? prev.instructorAlias,
            }));
            basicsDraftRef.current = {
              ...basicsDraftRef.current,
              instructorAlias:
                created.instructorAlias ??
                basicsDraftRef.current.instructorAlias,
            };
            // Now that currentCourseId is established, persist the latest title
            // through the EXISTING COURSE update path (executeSerializedBasicsMetaMutation).
            void persistBasicsField("title");
          } else {
            // CRITICAL: Preserve existing local draft fields! Do NOT reset other draft fields
            setBasicsDraft((prev) => ({
              ...prev,
              title: created.title,
              instructorAlias: created.instructorAlias ?? prev.instructorAlias,
            }));
            basicsDraftRef.current = {
              ...basicsDraftRef.current,
              title: created.title,
              instructorAlias:
                created.instructorAlias ??
                basicsDraftRef.current.instructorAlias,
            };
            markBasicsFieldSaved("title");
          }
          return created;
        } catch (err: unknown) {
          markBasicsFieldFailed("title");
          const errorMsg =
            err instanceof Error
              ? err.message
              : "Failed to create course. Please try again.";
          setToastMessage(errorMsg);
        } finally {
          markBasicsControlSaving("title", false);
        }
        return;
      }

      // Course already exists
      if (!trimmed) {
        setCourseTitle(baseline.title);
        setToastMessage("Course title cannot be empty.");
        return;
      }
      if (trimmed === baseline.title) {
        return;
      }
    } else {
      let targetCourseId = currentCourseIdRef.current || currentCourseId;
      if (!targetCourseId) {
        if (inFlightBasicsPromiseRef.current) {
          await inFlightBasicsPromiseRef.current;
        } else if (basicsDraftRef.current.title.trim()) {
          await persistBasicsField("title");
        }
        targetCourseId = currentCourseIdRef.current || currentCourseId;
      }
      if (!targetCourseId) {
        return;
      }
      if (fieldKey === "shortDescription") {
        if (
          currentDraft.shortDescription.trim() ===
          baseline.shortDescription.trim()
        ) {
          return;
        }
      } else if (fieldKey === "courseDescription") {
        if (currentDraft.description.trim() === baseline.description.trim()) {
          return;
        }
      } else if (fieldKey === "instructorAlias") {
        if (
          currentDraft.instructorAlias.trim() ===
          baseline.instructorAlias.trim()
        ) {
          return;
        }
      }
    }

    const version = ++basicsVersionRef.current;
    markBasicsControlSaving(fieldKey, true);
    inFlightBasicsControlsRef.current[fieldKey] =
      (inFlightBasicsControlsRef.current[fieldKey] || 0) + 1;
    const previousSnapshot = { ...serverBasicsRef.current };

    return await executeSerializedBasicsMetaMutation(
      fieldKey,
      version,
      previousSnapshot,
    );
  };

  const handleShowInstructorNameChange = async (nextValue: boolean) => {
    let targetCourseId = currentCourseIdRef.current || currentCourseId;
    if (!targetCourseId) {
      if (inFlightBasicsPromiseRef.current) {
        await inFlightBasicsPromiseRef.current;
      } else if (basicsDraftRef.current.title.trim()) {
        await persistBasicsField("title");
      }
      targetCourseId = currentCourseIdRef.current || currentCourseId;
    }
    if (!targetCourseId) return;

    const previousValue = serverBasicsRef.current.showInstructorName;
    const version = ++basicsVersionRef.current;

    // 1. Optimistic UI update
    setShowInstructorName(nextValue);
    clearBasicsFieldStatus("showInstructorName");
    markBasicsControlSaving("showInstructorName", true);
    inFlightBasicsControlsRef.current.showInstructorName =
      (inFlightBasicsControlsRef.current.showInstructorName || 0) + 1;

    try {
      const res = await upsertSettingsMutation.mutateAsync({
        courseId: targetCourseId,
        payload: {
          showInstructorName: nextValue,
          language: basicsDraftRef.current.language || "en",
        },
      });

      if (basicsVersionRef.current === version) {
        const confirmedShow =
          res.showInstructorName !== undefined
            ? res.showInstructorName
            : nextValue;
        const newBaseline: BasicsFormState = {
          ...serverBasicsRef.current,
          showInstructorName: confirmedShow,
        };
        setServerBasics(newBaseline);
        serverBasicsRef.current = newBaseline;
        markBasicsFieldSaved("showInstructorName");
      }
    } catch (err: unknown) {
      if (basicsVersionRef.current === version) {
        setShowInstructorName(previousValue);
        markBasicsFieldFailed("showInstructorName");
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to update instructor name visibility.";
        setToastMessage(errorMsg);
      }
    } finally {
      inFlightBasicsControlsRef.current.showInstructorName = Math.max(
        0,
        (inFlightBasicsControlsRef.current.showInstructorName || 1) - 1,
      );
      if (inFlightBasicsControlsRef.current.showInstructorName === 0) {
        markBasicsControlSaving("showInstructorName", false);
      }
    }
  };

  const flushBasicsPersistence = async (): Promise<boolean> => {
    const currentDraft = basicsDraftRef.current;
    const baseline = serverBasicsRef.current;

    let targetCourseId = currentCourseIdRef.current || currentCourseId;
    if (!targetCourseId) {
      if (!currentDraft.title.trim()) {
        return false;
      }
      try {
        await persistBasicsField("title");
        return Boolean(currentCourseIdRef.current || currentCourseId);
      } catch {
        return false;
      }
    }

    // If a basics save is already in-flight (e.g. started by the description
    // field's blur handler), await it before re-evaluating dirtiness.  Without
    // this guard both blur and navigation call executeSerializedBasicsMetaMutation
    // with the same courseVersion, producing an optimistic-lock conflict:
    //   1. blur fires → inFlightBasicsPromiseRef set synchronously → run() reads
    //      courseVersionRef but the stale-response guard skips updating it when
    //      basicsVersionRef has already been bumped by the navigation path.
    //   2. navigation's run() then reads the un-updated courseVersionRef and
    //      sends a PUT with the old version → backend rejects with 409.
    // Awaiting here joins the in-flight save, lets it complete (which updates
    // courseVersionRef and serverBasicsRef), and then the isMetaDirty check
    // below correctly finds nothing left to save.
    if (inFlightBasicsPromiseRef.current) {
      try {
        await inFlightBasicsPromiseRef.current;
      } catch {
        // Ignored – isMetaDirty is re-evaluated below with fresh ref values.
      }
    }

    const isMetaDirty = !isBasicsMetaEqual(
      basicsDraftRef.current,
      serverBasicsRef.current,
    );
    if (isMetaDirty) {
      if (!basicsDraftRef.current.title.trim()) {
        setCourseTitle(serverBasicsRef.current.title);
        setToastMessage("Course title cannot be empty.");
        return false;
      }
      const version = ++basicsVersionRef.current;
      markBasicsControlSaving("title", true);
      inFlightBasicsControlsRef.current.title =
        (inFlightBasicsControlsRef.current.title || 0) + 1;
      const previousSnapshot = { ...serverBasicsRef.current };
      try {
        await executeSerializedBasicsMetaMutation(
          "title",
          version,
          previousSnapshot,
        );
        return true;
      } catch {
        return false;
      }
    } else if (
      inFlightCourseCreationPromiseRef.current ||
      inFlightBasicsPromiseRef.current
    ) {
      try {
        // Await whichever in-flight operation is active (creation takes priority).
        await (inFlightCourseCreationPromiseRef.current ??
          inFlightBasicsPromiseRef.current);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };

  const saveBasicsStep = async (explicitCourseId?: string | null) => {
    const targetCourseId = explicitCourseId || currentCourseId;
    if (
      targetCourseId &&
      isBasicsEqual(basicsDraftRef.current, serverBasicsRef.current)
    ) {
      return serverBasicsRef.current;
    }

    if (!basicsDraftRef.current.title.trim()) {
      throw new Error("Please enter a course title.");
    }
    setIsSavingBasics(true);
    try {
      if (!targetCourseId) {
        // Use the shared creation helper so concurrent callers (e.g. onBlur
        // and saveBasicsStep both firing while courseId is still null) join the
        // same POST /courses rather than issuing duplicate requests.
        const created = await ensureCourseCreated(
          basicsDraftRef.current.title.trim(),
          basicsDraftRef.current.instructorAlias.trim() || null,
        );
        // currentCourseIdRef.current is already set inside ensureCourseCreated.
        setCurrentCourseId(created.id);
        setCourseVersion(created.version);
        courseVersionRef.current = created.version;

        const newBaseline: BasicsFormState = normalizeBasicsState({
          ...serverBasicsRef.current,
          title: created.title,
          instructorAlias: created.instructorAlias || "",
        });
        setServerBasics(newBaseline);
        serverBasicsRef.current = newBaseline;

        const latestTitle = basicsDraftRef.current.title.trim();
        if (latestTitle && latestTitle !== created.title) {
          setBasicsDraft((prev) => ({
            ...prev,
            instructorAlias: created.instructorAlias ?? prev.instructorAlias,
          }));
          basicsDraftRef.current = {
            ...basicsDraftRef.current,
            instructorAlias:
              created.instructorAlias ?? basicsDraftRef.current.instructorAlias,
          };
          void persistBasicsField("title");
        } else {
          setBasicsDraft((prev) => ({
            ...prev,
            title: created.title,
            instructorAlias: created.instructorAlias ?? prev.instructorAlias,
          }));
          basicsDraftRef.current = {
            ...basicsDraftRef.current,
            title: created.title,
            instructorAlias:
              created.instructorAlias ?? basicsDraftRef.current.instructorAlias,
          };
        }

        if (
          basicsDraftRef.current.shortDescription.trim() ||
          basicsDraftRef.current.description.trim() ||
          basicsDraftRef.current.categoryId ||
          basicsDraftRef.current.difficulty
        ) {
          const updated = await updateBasicsMutation.mutateAsync({
            id: created.id,
            payload: {
              title: created.title,
              shortDescription:
                basicsDraftRef.current.shortDescription.trim() || null,
              description: basicsDraftRef.current.description.trim() || null,
              categoryId: basicsDraftRef.current.categoryId || null,
              difficulty: basicsDraftRef.current.difficulty || null,
              instructorAlias:
                basicsDraftRef.current.instructorAlias.trim() || null,
              version: created.version,
            },
          });
          setCourseVersion(updated.version);
          courseVersionRef.current = updated.version;
          const updatedBaseline = normalizeBasicsState({
            ...newBaseline,
            shortDescription: updated.shortDescription || "",
            description: updated.description || "",
            categoryId: updated.categoryId || "",
            difficulty:
              (updated.difficulty as BasicsFormState["difficulty"]) || "",
          });
          setServerBasics(updatedBaseline);
          serverBasicsRef.current = updatedBaseline;
        }
        markBasicsFieldSaved("title");
        setBasicsSaveFailed(false);
        triggerBasicsSavedBriefly();
        return created;
      } else {
        const ok = await flushBasicsPersistence();
        if (!ok) {
          setBasicsSaveFailed(true);
        } else {
          setBasicsSaveFailed(false);
          triggerBasicsSavedBriefly();
        }
        return serverBasicsRef.current;
      }
    } catch (err) {
      setBasicsSaveFailed(true);
      throw err;
    } finally {
      setIsSavingBasics(false);
    }
  };

  const saveCurriculumStep = async (explicitCourseId?: string | null) => {
    setIsSavingCurriculum(true);
    setCurriculumSaveFailed(false);
    try {
      let targetCourseId = explicitCourseId || currentCourseId;
      if (!targetCourseId) {
        throw new Error("Please enter a course title on the Basics tab first.");
      }

      // 1. Save any pending section title edits
      const editingSections = sections.filter(
        (s) =>
          s.isEditingTitle &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            s.id,
          ),
      );
      if (editingSections.length > 0) {
        await Promise.all(
          editingSections.map(async (sec) => {
            const trimmed = sec.title.trim();
            if (trimmed) {
              await updateSectionMutation.mutateAsync({
                courseId: targetCourseId,
                sectionId: sec.id,
                payload: { title: trimmed },
              });
              setSections((prev) =>
                prev.map((s) =>
                  s.id === sec.id ? { ...s, isEditingTitle: false } : s,
                ),
              );
              markCurriculumItemSaved(sec.id);
            }
          }),
        );
      }

      // 2. Save all dirty lessons across all sections
      const allSaved = await saveAllDirtyLessons(targetCourseId);
      if (!allSaved) {
        throw new Error("Failed to save some lessons in curriculum.");
      }

      triggerCurriculumSavedBriefly();
      return true;
    } catch (err) {
      setCurriculumSaveFailed(true);
      throw err;
    } finally {
      setIsSavingCurriculum(false);
    }
  };

  const saveAccessRulesStep = async (explicitCourseId?: string | null) => {
    await flushFixedDurationPersistence();

    const currentDraft = accessRulesDraftRef.current;
    if (!currentDraft.durationMode) {
      throw new Error("Please select an access duration option.");
    }
    setIsSavingAccessRules(true);
    try {
      let targetCourseId = explicitCourseId || currentCourseId;
      if (!targetCourseId) {
        throw new Error("Please enter a course title on the Basics tab first.");
      }

      let durationDays: number | null = null;
      if (accessRulesDraftRef.current.durationMode === "fixed") {
        const val = Math.max(
          1,
          accessRulesDraftRef.current.fixedDurationValue || 1,
        );
        const unitMultiplier =
          accessRulesDraftRef.current.fixedDurationUnit === "Years"
            ? 365
            : accessRulesDraftRef.current.fixedDurationUnit === "Months"
              ? 30
              : accessRulesDraftRef.current.fixedDurationUnit === "Weeks"
                ? 7
                : 1;
        durationDays = val * unitMultiplier;
      }

      const isRulesConfigDirty = !isAccessRuleConfigEqual(
        accessRulesDraftRef.current,
        serverAccessRules,
      );

      let accessRuleRes: any = null;

      if (isRulesConfigDirty) {
        accessRuleRes = await upsertAccessRulesMutation.mutateAsync({
          courseId: targetCourseId,
          payload: {
            accessType: accessRulesDraftRef.current.accessType || "everyone",
            durationType:
              accessRulesDraftRef.current.durationMode === "fixed"
                ? "fixed_duration"
                : "lifetime",
            durationDays:
              accessRulesDraftRef.current.durationMode === "fixed"
                ? durationDays
                : null,
          },
        });
      }

      const isFixed = accessRuleRes
        ? accessRuleRes.durationType === "fixed_duration"
        : serverAccessRules.durationMode === "fixed";

      const newBaseline: AccessRulesFormState = normalizeAccessRulesState({
        accessType: accessRulesDraftRef.current.accessType || "everyone",
        durationMode: isFixed ? "fixed" : "lifetime",
        fixedDurationValue: accessRulesDraftRef.current.fixedDurationValue,
        fixedDurationUnit: accessRulesDraftRef.current.fixedDurationUnit,
        enableQA: accessRulesDraftRef.current.enableQA,
        enableComments: accessRulesDraftRef.current.enableComments,
        enableDownloads: accessRulesDraftRef.current.enableDownloads,
        enableNotes: accessRulesDraftRef.current.enableNotes,
      });

      setAccessRulesExists(true);
      setServerAccessRules(newBaseline);
      setAccessRulesDraft(newBaseline);
      setAccessRulesSaveFailed(false);
      triggerAccessRulesSavedBriefly();
      return { accessRule: accessRuleRes };
    } catch (err) {
      setAccessRulesSaveFailed(true);
      throw err;
    } finally {
      setIsSavingAccessRules(false);
    }
  };

  const savePricingStep = async (explicitCourseId?: string | null) => {
    await flushPricingPersistence();

    // If already saved and clean, do not fire redundant duplicate mutation
    const isDirty = !isPricingEqual(
      pricingDraftRef.current,
      serverPricingRef.current,
    );
    if (!isDirty) {
      return { ...serverPricingRef.current };
    }

    const validation = validatePricing(pricingDraftRef.current);
    if (!validation.isValid) {
      setPricingValidationError(validation.error);
      setToastMessage(validation.error || "Please fix pricing errors.");
      throw new Error(validation.error || "Validation failed");
    }
    setPricingValidationError(null);

    setIsSavingPricing(true);
    try {
      const targetCourseId =
        await ensureCourseDraftForPricing(explicitCourseId);
      const payload = buildPricingPayload(pricingDraftRef.current);
      const res = await upsertPricingMutation.mutateAsync({
        courseId: targetCourseId,
        payload,
      });
      const hasSale = res.salePrice != null && res.salePrice !== undefined;
      const newBaseline: PricingFormState = normalizePricingState({
        sellingPrice: hasSale ? String(res.salePrice) : String(res.price),
        originalPrice: hasSale && res.price > 0 ? String(res.price) : "",
        currency: res.currency || "INR",
        showDiscountBadge: res.showDiscountBadge === true,
      });

      setServerPricing(newBaseline);
      serverPricingRef.current = newBaseline;
      setPricingDraft(newBaseline);
      pricingDraftRef.current = newBaseline;
      setPricingSaveFailed(false);
      triggerPricingSavedBriefly();
      return res;
    } catch (err) {
      setPricingSaveFailed(true);
      throw err;
    } finally {
      setIsSavingPricing(false);
    }
  };

  const saveExtrasStep = async (explicitCourseId?: string | null) => {
    setIsSavingExtras(true);
    try {
      let targetCourseId = explicitCourseId || currentCourseId;
      if (!targetCourseId) {
        throw new Error("Please enter a course title on the Basics tab first.");
      }

      // Sync manual includes if dirty
      if (isManualIncludesDirty) {
        // Delete removed items
        const deleted = serverIncludes.filter(
          (s) => !manualIncludesDraft.some((m) => m.id === s.id),
        );
        if (deleted.length > 0) {
          await Promise.all(
            deleted.map((d) =>
              deleteIncludeMutation.mutateAsync({
                courseId: targetCourseId!,
                includeId: d.id,
              }),
            ),
          );
        }

        // Update items with changed text
        const updated = manualIncludesDraft.filter((m) => {
          const existing = serverIncludes.find((s) => s.id === m.id);
          return existing && existing.text.trim() !== m.text.trim();
        });
        if (updated.length > 0) {
          await Promise.all(
            updated.map((u) =>
              updateIncludeMutation.mutateAsync({
                courseId: targetCourseId!,
                includeId: u.id,
                payload: { text: u.text.trim() },
              }),
            ),
          );
        }

        // Create new items (client-generated IDs)
        const newItems = manualIncludesDraft.filter(
          (m) => !serverIncludes.some((s) => s.id === m.id),
        );
        for (const n of newItems) {
          if (n.text.trim()) {
            await createIncludeMutation.mutateAsync({
              courseId: targetCourseId!,
              payload: { text: n.text.trim() },
            });
          }
        }

        // Refetch latest includes list from server
        const listRes = await coursesService.listIncludes(targetCourseId!);
        setServerIncludes(listRes.items);
        setManualIncludesDraft(
          listRes.items.map((inc) => ({ id: inc.id, text: inc.text })),
        );
      }

      setExtrasSaveFailed(false);
      triggerExtrasSavedBriefly();
      return { success: true };
    } catch (err) {
      setExtrasSaveFailed(true);
      throw err;
    } finally {
      setIsSavingExtras(false);
    }
  };

  const savePublishStep = async (explicitCourseId?: string | null) => {
    setIsSavingPublish(true);
    setPublishSaveFailed(false);
    try {
      await reconcileDirtyState();
      triggerPublishSavedBriefly();
      return true;
    } catch (err) {
      setPublishSaveFailed(true);
      throw err;
    } finally {
      setIsSavingPublish(false);
    }
  };

  const saveCurrentStep = async () => {
    if (activeStep === "basics") {
      return await saveBasicsStep();
    } else if (activeStep === "curriculum") {
      return await saveCurriculumStep();
    } else if (activeStep === "access-rules") {
      return await saveAccessRulesStep();
    } else if (activeStep === "pricing") {
      return await savePricingStep();
    } else if (activeStep === "extras") {
      return await saveExtrasStep();
    } else if (activeStep === "publish") {
      return await savePublishStep();
    }
  };

  const navigateToStep = async (destination: CourseWizardStepId) => {
    cancelTitleCreationDebounce();
    if (
      actionLoading !== null ||
      saveActionInFlightRef.current ||
      isSavingAllDirtyLessonsRef.current
    ) {
      return;
    }
    if (destination === activeStep) {
      return;
    }

    const leavingStep = activeStep;

    if (
      leavingStep === "basics" &&
      !currentCourseIdRef.current &&
      !currentCourseId
    ) {
      const flushed = await flushBasicsPersistence();
      if (!flushed) {
        setShowTitleTooltip(true);
        titleInputRef.current?.focus();
        setToastMessage("Add a course title to continue.");
        return;
      }
    }

    if (
      !currentCourseIdRef.current &&
      !isDownstreamUnlocked &&
      destination !== "basics"
    ) {
      setShowTitleTooltip(true);
      titleInputRef.current?.focus();
      setToastMessage("Add a course title to continue.");
      return;
    }

    if (saveActionInFlightRef.current) return;
    saveActionInFlightRef.current = true;

    const wasDirty = isStepDirty(leavingStep);

    // Prepare and activate the destination before persisting the previous
    // step. This keeps the tab and panel responsive while draft persistence
    // continues in the background.
    setMountedTabs((current) => {
      const next = getAdjacentWizardSteps(destination);
      next.add(leavingStep);
      const hasSameTabs =
        next.size === current.size && [...next].every((id) => current.has(id));
      return hasSameTabs ? current : next;
    });
    pendingWizardNavigationRef.current = destination;
    setActiveStep(destination);

    const persistPreviousStep = async () => {
      if (wasDirty) setActionLoading("save");

      try {
        if (leavingStep === "basics") {
          await flushBasicsPersistence();
        } else if (leavingStep === "access-rules") {
          await flushFixedDurationPersistence();
        } else if (leavingStep === "pricing") {
          await flushPricingPersistence();
        }

        if (!wasDirty) return;

        if (leavingStep === "curriculum") {
          await saveCurriculumStep();
        } else {
          await saveCurrentStep();
        }
      } catch (err: unknown) {
        const stepLabel =
          WIZARD_STEPS.find((s) => s.id === leavingStep)?.label || leavingStep;
        setToastMessage(
          `Failed to save ${stepLabel}. Your changes are kept locally.`,
        );
      } finally {
        setActionLoading(null);
        saveActionInFlightRef.current = false;
      }
    };

    if (
      wasDirty ||
      leavingStep === "basics" ||
      leavingStep === "access-rules" ||
      leavingStep === "pricing"
    ) {
      await persistPreviousStep();
    } else {
      saveActionInFlightRef.current = false;
    }
  };

  navigateToStepRef.current = navigateToStep;

  const currentStepIndex = WIZARD_STEP_IDS.indexOf(activeStep);
  const previousStepId =
    currentStepIndex > 0 ? WIZARD_STEP_IDS[currentStepIndex - 1] : null;
  const nextStepId =
    currentStepIndex < WIZARD_STEP_IDS.length - 1
      ? WIZARD_STEP_IDS[currentStepIndex + 1]
      : null;

  const reconcileDirtyState = async (explicitCourseId?: string | null) => {
    let targetCourseId = explicitCourseId || currentCourseId;

    if (inFlightBasicsPromiseRef.current) {
      await inFlightBasicsPromiseRef.current;
    }
    if (activeStep === "basics") {
      await flushBasicsPersistence();
    }

    // 1. If basics is dirty or course has not been created yet, save basics first
    if (!targetCourseId || isBasicsDirty) {
      const createdOrUpdated = await saveBasicsStep(targetCourseId);
      if (
        createdOrUpdated &&
        typeof createdOrUpdated === "object" &&
        "id" in createdOrUpdated
      ) {
        targetCourseId = (createdOrUpdated as { id: string }).id;
      } else if (!targetCourseId) {
        targetCourseId = currentCourseId;
      }
    }

    if (!targetCourseId) {
      throw new Error("Cannot validate course without a valid course ID.");
    }

    // 2. Save only the other dirty / unpersisted server-backed pages
    const pendingSaves: Promise<unknown>[] = [];
    if (activeStep === "access-rules") {
      await flushFixedDurationPersistence();
    }
    if (activeStep === "pricing") {
      await flushPricingPersistence();
    }
    if (needsAccessRulesSave) {
      pendingSaves.push(saveAccessRulesStep(targetCourseId));
    }
    if (isPricingDirty) {
      pendingSaves.push(savePricingStep(targetCourseId));
    }
    if (isExtrasDirty) {
      pendingSaves.push(saveExtrasStep(targetCourseId));
    }

    if (pendingSaves.length > 0) {
      await Promise.all(pendingSaves);
    }

    return targetCourseId;
  };

  const handleValidateCourseAction = async () => {
    if (actionLoading || isValidating || saveActionInFlightRef.current) return;
    saveActionInFlightRef.current = true;
    setActionLoading("validate");
    try {
      await reconcileDirtyState();

      // Trigger server validation API
      const res = await refetchValidation();
      if (res.data?.canPublish) {
        setToastMessage("Course is valid and ready to publish!");
      } else {
        const errorCount = res.data?.errors?.length ?? 0;
        setToastMessage(
          errorCount > 0
            ? `Found ${errorCount} issue${errorCount > 1 ? "s" : ""} to fix before publishing.`
            : "Please fix incomplete sections before publishing.",
        );
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        "Failed to save changes or validate course.";
      setToastMessage(errorMsg);
    } finally {
      setActionLoading(null);
      saveActionInFlightRef.current = false;
    }
  };

  const handleFinalPublishCourse = async () => {
    if (actionLoading || isValidating || saveActionInFlightRef.current) return;
    saveActionInFlightRef.current = true;
    setActionLoading("publish");
    setPublishValidationError(null);

    try {
      // 1. Flush any uncommitted dirty server-backed form state
      const targetCourseId = await reconcileDirtyState();

      // 2. Re-validate to ensure server state is 100% compliant
      const validationRes = await refetchValidation();
      const validationData = validationRes.data;

      if (!validationData || !validationData.canPublish) {
        const errorMsg =
          validationData?.errors?.[0]?.message ||
          "Course failed validation checks. Please review highlighted steps.";
        setPublishValidationError(errorMsg);
        setToastMessage(errorMsg);
        return;
      }

      // 3. Trigger publish API mutation
      const publishedCourse =
        await publishCourseMutation.mutateAsync(targetCourseId);

      // 4. Synchronize server-returned state & version
      setIsPublished(publishedCourse.status === "published");
      setCourseVersion(publishedCourse.version);

      setToastMessage(
        isPublished
          ? "Course updated and published successfully!"
          : "Course published successfully!",
      );
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        "Failed to publish course. Please resolve issues and try again.";
      setPublishValidationError(errorMsg);
      setToastMessage(errorMsg);
    } finally {
      setActionLoading(null);
      saveActionInFlightRef.current = false;
    }
  };

  const handleConfirmUnpublishCourse = async () => {
    if (!currentCourseId || actionLoading || saveActionInFlightRef.current)
      return;
    saveActionInFlightRef.current = true;
    setActionLoading("unpublish");
    try {
      const draftCourse =
        await unpublishCourseMutation.mutateAsync(currentCourseId);
      setIsPublished(draftCourse.status === "published");
      setCourseVersion(draftCourse.version);
      setToastMessage("Course unpublished and returned to draft.");
      setIsUnpublishModalOpen(false);
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message || "Failed to unpublish course.";
      setToastMessage(errorMsg);
    } finally {
      setActionLoading(null);
      saveActionInFlightRef.current = false;
    }
  };

  if (isEditorError && !editorData && isEditing) {
    return (
      <div className="relative flex w-full flex-1 flex-col min-h-[calc(100dvh-130px)] p-0 text-[--text] box-border max-[768px]:pb-0">
        <header className="relative shrink-0 mb-4 max-[768px]:mb-2 max-[768px]:w-full max-[768px]:max-w-full max-[768px]:min-w-0 max-[768px]:box-border">
          <div className="flex items-start justify-between gap-4 mb-3 max-[768px]:flex-col max-[768px]:gap-3 max-[768px]:mb-2">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                className="flex w-9 h-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--text)_12%,transparent)] rounded-lg text-(--text-secondary) bg-[color-mix(in_srgb,var(--text)_4%,transparent)] cursor-pointer transition-[border-color,background-color,color] duration-150 ease-out hover:border-[color-mix(in_srgb,var(--text)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] hover:text-(--text)"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft size={17} weight="bold" />
              </button>
              <div className="pt-0.5 min-w-0">
                <h1 className="m-0 text-(--text) text-[clamp(1.2rem,1.8vw,1.55rem)] font-bold tracking-[-0.015em] leading-[1.2]">
                  Edit Course
                </h1>
                <p className="m-0 mt-1 text-(--muted) text-[0.84rem] max-w-155 leading-[1.4]">
                  Unable to load course data.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center w-full min-h-[calc(100dvh-230px)] rounded-[14px] border border-red-500/20 bg-(--surface) p-8 text-center shadow-(--card-shadow) my-auto">
          <div className="relative mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <WarningCircle size={38} weight="bold" />
          </div>
          <h2 className="m-0 text-[1.28rem] font-bold tracking-[-0.015em] text-(--text)">
            Unable to load course details
          </h2>
          <p className="m-0 mt-2 max-w-md text-[0.88rem] leading-relaxed text-(--muted)">
            {editorError?.message ||
              "There was an error communicating with the server to fetch this course."}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-4 text-[0.82rem] font-semibold text-(--text) cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)] hover:text-(--text)"
              onClick={handleBackToCourses}
            >
              Back to Courses
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border-none bg-(--accent) px-4 text-[0.82rem] font-semibold text-(--on-accent,#ffffff) shadow-[0_2px_8px_var(--accent-shadow,rgba(0,0,0,0.2))] cursor-pointer transition-all hover:bg-(--accent-hover,var(--accent)) hover:brightness-110 active:scale-[0.98]"
              onClick={() => void refetchEditor()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex w-full flex-1 flex-col min-h-full p-0 text-[--text] box-border"
      data-course-wizard
    >
      <CourseStaticPageRefreshNotice courseId={currentCourseId} />
      {/* Wizard Header */}
      <header className="relative shrink-0 mb-2 max-[768px]:mb-1.5 max-[768px]:w-full max-[768px]:max-w-full max-[768px]:min-w-0 max-[768px]:box-border">
        <div className="flex items-start justify-between gap-4 mb-1 max-[768px]:flex-col max-[768px]:gap-2 max-[768px]:mb-1.5">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              className="flex w-9 h-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--text)_12%,transparent)] rounded-lg text-(--text-secondary) bg-[color-mix(in_srgb,var(--text)_4%,transparent)] cursor-pointer transition-[border-color,background-color,color] duration-150 ease-out hover:border-[color-mix(in_srgb,var(--text)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] hover:text-(--text)"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft size={17} weight="bold" />
            </button>
            <div className="pt-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="m-0 text-(--text) text-[clamp(1.2rem,1.8vw,1.55rem)] font-bold tracking-[-0.015em] leading-[1.2]">
                  {isEditing ? "Edit Course" : "Create New Course"}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium tracking-[0.02em] ${
                    isPublished
                      ? "is-published border border-green-500/35 text-green-400 bg-green-500/12"
                      : "border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--muted) bg-[color-mix(in_srgb,var(--text)_5%,transparent)]"
                  }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p className="m-0 mt-0.5 text-(--muted) text-[0.82rem] max-w-155 leading-[1.35]">
                {activeStep === "curriculum"
                  ? isEditing
                    ? "Manage and organize your course sections, lessons, and resources."
                    : "Build your course structure by adding sections and lessons."
                  : activeStep === "access-rules"
                    ? isEditing
                      ? "Update who can access this course and how long their access lasts."
                      : "Control who can access this course and how long their access lasts."
                    : activeStep === "pricing"
                      ? isEditing
                        ? "Update pricing, currency, and sale discounts for this course."
                        : "Set how learners will purchase this course."
                      : activeStep === "extras"
                        ? isEditing
                          ? "Update extra course settings, inclusions, and completion certificate."
                          : "Add extra information and settings to enhance your course."
                        : activeStep === "publish"
                          ? isPublished
                            ? "Review your changes and update the published course."
                            : isEditing
                              ? "Review your course checklist and publish when ready."
                              : "Review your course and publish it when you're ready."
                          : isEditing
                            ? "Update the essential details of your course."
                            : "Add the essential details of your course. You can always edit these later."}
              </p>
            </div>
          </div>
        </div>

        {/* Publish validation error toast if any */}
        {publishValidationError && activeStep === "publish" && (
          <div className="flex items-center gap-2.5 mb-3 border border-red-400/35 rounded-[10px] px-4 py-2 text-red-400 bg-red-500/12 backdrop-blur-md shadow-[0_4px_16px_rgba(239,68,68,0.15)] text-[0.84rem] font-semibold animate-[bannerSlideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <Info size={16} weight="bold" />
            <span>{publishValidationError}</span>
          </div>
        )}
      </header>

      {/* Wizard Steps Navigation */}
      <nav
        ref={stepsNavRef}
        className="course-wizard-steps-nav settings-tabs page-tabs border-b border-[color-mix(in_srgb,var(--text)_12%,transparent)] [&::after]:hidden!"
        aria-label={
          isEditing ? "Course editing steps" : "Course creation steps"
        }
        role="tablist"
        onMouseDown={handleNavMouseDown}
        onMouseLeave={handleNavMouseLeave}
        onMouseUp={handleNavMouseUp}
        onMouseMove={handleNavMouseMove}
      >
        {/* Standard page-tabs indicator - driven by --page-tab-indicator-* CSS vars */}
        <span className="page-tabs__indicator" aria-hidden="true" />
        {WIZARD_STEPS.map((step, idx) => {
          const Icon = step.Icon;
          const isActive = activeStep === step.id;
          const isDirty = isStepDirty(step.id);
          return (
            <button
              key={step.id}
              id={`course-wizard-tab-${step.id}`}
              ref={(el) => {
                tabRefs.current[step.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="course-wizard-tab-panel"
              aria-keyshortcuts={`Alt+${idx + 1}`}
              tabIndex={isActive ? 0 : -1}
              data-page-tab-tone={step.tone}
              data-swipe-tab-id={step.id}
              title={
                !isDownstreamUnlocked && step.id !== "basics"
                  ? "Add a course title to continue."
                  : undefined
              }
              disabled={
                actionLoading !== null ||
                (!isDownstreamUnlocked && step.id !== "basics")
              }
              className={`inline-flex flex-row items-center gap-2 !border-b-transparent shrink-0 whitespace-nowrap disabled:!opacity-50 disabled:!cursor-not-allowed ${isActive ? "is-active" : ""}`}
              onClick={() => {
                if (isInitialLoadingCourse) return;
                void navigateToStep(step.id);
              }}
              onKeyDown={handleRovingTabKeyDown}
            >
              <Icon
                size={17}
                weight={isActive ? "fill" : "regular"}
                className="shrink-0"
              />
              <span className="inline-flex items-center gap-1.5">
                <span>{step.label}</span>
                {isDirty && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-(--accent) shrink-0"
                    title="Unsaved changes"
                    aria-label="Unsaved changes"
                  />
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Wizard Step Panels using SwipeableTabPanel */}
      {isInitialLoadingCourse ? (
        <CourseWizardSkeleton activeStep={activeStep} />
      ) : (
        <Suspense
          fallback={
            <CenteredLoadingSpinner
              label="Loading course details"
              className="min-h-80 w-full flex-1"
            />
          }
        >
          <SwipeableTabPanel
            tabs={WIZARD_STEP_IDS}
            activeTab={activeStep}
            onTabChange={(newStep) => {
              void navigateToStep(newStep);
            }}
            tabListRef={stepsNavRef}
            id="course-wizard-tab-panel"
            className="course-wizard-tab-content relative min-h-0 flex-1 flex flex-col pt-4 pb-6 max-[640px]:pt-3"
            stateAttribute="data-wizard-step"
            labelledBy={`course-wizard-tab-${activeStep}`}
            disabled={
              actionLoading !== null ||
              (!isDownstreamUnlocked && activeStep === "basics")
            }
            spaceBetween={32}
          >
            {(panelStep) =>
              !mountedTabs.has(panelStep) ? null : panelStep === "basics" ? (
                <BasicsStepPanel
                  isEditing={isEditing}
                  showTitleTooltip={showTitleTooltip}
                  isDownstreamUnlocked={isDownstreamUnlocked}
                  isInitialCourseCreationPending={
                    isInitialCourseCreationPending
                  }
                  titleInputRef={titleInputRef}
                  setShowTitleTooltip={setShowTitleTooltip}
                  getBasicsFieldDisplayStatus={getBasicsFieldDisplayStatus}
                  currentCourseId={currentCourseId}
                  courseTitle={courseTitle}
                  setCourseTitle={setCourseTitle}
                  clearBasicsFieldStatus={clearBasicsFieldStatus}
                  currentCourseIdRef={currentCourseIdRef}
                  cancelTitleCreationDebounce={cancelTitleCreationDebounce}
                  titleCreationDebounceTimerRef={titleCreationDebounceTimerRef}
                  persistBasicsField={persistBasicsField}
                  createCourseMutation={createCourseMutation}
                  shortDescription={shortDescription}
                  setShortDescription={setShortDescription}
                  courseDescription={courseDescription}
                  setCourseDescription={setCourseDescription}
                  instructorAlias={instructorAlias}
                  setInstructorAlias={setInstructorAlias}
                  showInstructorName={showInstructorName}
                  isBasicsControlSaving={isBasicsControlSaving}
                  handleShowInstructorNameChange={
                    handleShowInstructorNameChange
                  }
                  thumbnailInputRef={thumbnailInputRef}
                  isBasicsSaving={isBasicsSaving}
                  isThumbnailBusy={isThumbnailBusy}
                  handleThumbnailFileSelect={handleThumbnailFileSelect}
                  videoTrailerInputRef={videoTrailerInputRef}
                  handleVideoTrailerFileSelect={handleVideoTrailerFileSelect}
                  thumbnail={thumbnail}
                  triggerThumbnailUpload={triggerThumbnailUpload}
                  handleRemoveThumbnail={handleRemoveThumbnail}
                  thumbnailUploadError={thumbnailUploadError}
                  videoTrailer={videoTrailer}
                  triggerVideoTrailerUpload={triggerVideoTrailerUpload}
                  handleRemoveVideoTrailer={handleRemoveVideoTrailer}
                  LessonVideoUpload={LessonVideoUpload}
                  editorData={editorData}
                  handleTrailerMediaAttached={handleTrailerMediaAttached}
                  refetchEditor={refetchEditor}
                  totalSections={totalSections}
                  totalLessons={totalLessons}
                  computedDuration={computedDuration}
                  DiscussionMarkdown={DiscussionMarkdown}
                />
              ) : panelStep === "curriculum" ? (
                <CurriculumStepPanel
                  editingLessonTarget={editingLessonTarget}
                  sections={sections}
                  editorData={editorData}
                  courseTitle={courseTitle}
                  savingLessonId={savingLessonId}
                  setEditingLessonTarget={setEditingLessonTarget}
                  handleCancelLessonDraft={handleCancelLessonDraft}
                  handleUpdateLesson={handleUpdateLesson}
                  persistLesson={persistLesson}
                  setToastMessage={setToastMessage}
                  handleDeleteLesson={handleDeleteLesson}
                  currentCourseId={currentCourseId}
                  handleLessonMediaAttached={handleLessonMediaAttached}
                  handleLessonProcessingComplete={
                    handleLessonProcessingComplete
                  }
                  handleCreateLessonResource={handleCreateLessonResource}
                  handleLessonResourceAdded={handleLessonResourceAdded}
                  handleDeleteLessonResource={handleDeleteLessonResource}
                  handleLessonResourceRemoved={handleLessonResourceRemoved}
                  QuizAuthoringPanel={QuizAuthoringPanel}
                  isReorderingSections={isReorderingSections}
                  reorderSectionsMutation={reorderSectionsMutation}
                  isCreatingSection={isCreatingSection}
                  createSectionMutation={createSectionMutation}
                  createCourseMutation={createCourseMutation}
                  handleAddSection={handleAddSection}
                  deletingSectionId={deletingSectionId}
                  draggedSectionIndex={draggedSectionIndex}
                  dragEnabledSectionId={dragEnabledSectionId}
                  updatingSectionId={updatingSectionId}
                  handleSectionDragStart={handleSectionDragStart}
                  handleSectionDragOver={handleSectionDragOver}
                  handleSectionDragEnd={handleSectionDragEnd}
                  sectionHeaderElementsRef={sectionHeaderElementsRef}
                  handleToggleSectionExpand={handleToggleSectionExpand}
                  setDragEnabledSectionId={setDragEnabledSectionId}
                  handleSaveSectionTitle={handleSaveSectionTitle}
                  handleStartEditSectionTitle={handleStartEditSectionTitle}
                  reorderingLessonsSectionId={reorderingLessonsSectionId}
                  getCurriculumItemDisplayStatus={
                    getCurriculumItemDisplayStatus
                  }
                  handleDeleteSection={handleDeleteSection}
                  getCurriculumLessonKey={getCurriculumLessonKey}
                  pinnedVirtualizedLessonIds={pinnedVirtualizedLessonIds}
                  draggedLessonState={draggedLessonState}
                  lessonDropTarget={lessonDropTarget}
                  dragEnabledLessonId={dragEnabledLessonId}
                  deletingLessonId={deletingLessonId}
                  reorderLessonsMutation={reorderLessonsMutation}
                  createLessonResourceMutation={createLessonResourceMutation}
                  deleteLessonResourceMutation={deleteLessonResourceMutation}
                  mountedLessonEditorIds={mountedLessonEditorIds}
                  requestedSectionId={requestedSectionId}
                  requestedLessonId={requestedLessonId}
                  rememberLessonEditor={rememberLessonEditor}
                  handleToggleLessonExpand={handleToggleLessonExpand}
                  navigateToCurriculumFocus={navigateToCurriculumFocus}
                  handleLessonDragStart={handleLessonDragStart}
                  handleLessonDragOver={handleLessonDragOver}
                  handleLessonDragEnd={handleLessonDragEnd}
                  setDragEnabledLessonId={setDragEnabledLessonId}
                  handleLessonTitleBlur={handleLessonTitleBlur}
                  handleCancelEditLessonTitle={handleCancelEditLessonTitle}
                  handleStartEditLessonTitle={handleStartEditLessonTitle}
                  handleCancelLessonDescriptionEdit={
                    handleCancelLessonDescriptionEdit
                  }
                  handleLessonFieldBlur={handleLessonFieldBlur}
                  handleLessonDiscreteChange={handleLessonDiscreteChange}
                  LessonVideoUpload={LessonVideoUpload}
                  creatingLessonSectionId={creatingLessonSectionId}
                  createLessonMutation={createLessonMutation}
                  handleAddLesson={handleAddLesson}
                />
              ) : panelStep === "access-rules" ? (
                <AccessRulesStepPanel
                  getAccessControlDisplayStatus={getAccessControlDisplayStatus}
                  isAccessRulesSaving={isAccessRulesSaving}
                  savingAccessControls={savingAccessControls}
                  accessRules={accessRules}
                  handleAccessTypeChange={handleAccessTypeChange}
                  handleDurationModeChange={handleDurationModeChange}
                  handleFixedDurationValueChange={
                    handleFixedDurationValueChange
                  }
                  flushFixedDurationPersistence={flushFixedDurationPersistence}
                  handleFixedDurationUnitChange={handleFixedDurationUnitChange}
                  handleToggleQA={handleToggleQA}
                  handleToggleComments={handleToggleComments}
                  handleToggleNotes={handleToggleNotes}
                />
              ) : panelStep === "pricing" ? (
                <PricingStepPanel
                  pricingValidationError={pricingValidationError}
                  getPricingControlDisplayStatus={
                    getPricingControlDisplayStatus
                  }
                  pricing={pricing}
                  handleCurrencyChange={handleCurrencyChange}
                  currencyOptions={currencyOptions}
                  isSavingPricing={isSavingPricing}
                  isPricingControlSaving={isPricingControlSaving}
                  handleSellingPriceChange={handleSellingPriceChange}
                  flushPricingPersistence={flushPricingPersistence}
                  handleOriginalPriceChange={handleOriginalPriceChange}
                  handleShowDiscountBadgeChange={handleShowDiscountBadgeChange}
                  currentCourseId={currentCourseId}
                  navigateToStep={navigateToStep}
                  onNavigatePage={onNavigatePage}
                />
              ) : panelStep === "extras" ? (
                <ExtrasStepPanel
                  getExtrasControlDisplayStatus={getExtrasControlDisplayStatus}
                  extras={extras}
                  isSavingCertificate={isSavingCertificate}
                  handleToggleCertificate={handleToggleCertificate}
                  handleCertificateTemplateChange={
                    handleCertificateTemplateChange
                  }
                  handleToggleAutoEmailCertificate={
                    handleToggleAutoEmailCertificate
                  }
                  totalSections={totalSections}
                  totalLessons={totalLessons}
                  computedDuration={computedDuration}
                  isReorderingIncludes={isReorderingIncludes}
                  reorderIncludesMutation={reorderIncludesMutation}
                  extrasControlStatus={extrasControlStatus}
                  manualIncludesDraft={manualIncludesDraft}
                  isExtrasSaving={isExtrasSaving}
                  deletingIncludeIds={deletingIncludeIds}
                  savingIncludeIds={savingIncludeIds}
                  dragEnabledInclusionId={dragEnabledInclusionId}
                  handleInclusionDragStart={handleInclusionDragStart}
                  handleInclusionDragOver={handleInclusionDragOver}
                  handleInclusionDragEnd={handleInclusionDragEnd}
                  setDragEnabledInclusionId={setDragEnabledInclusionId}
                  setFocusedInclusionId={setFocusedInclusionId}
                  handleManualInclusionBlur={handleManualInclusionBlur}
                  handleUpdateManualInclusionText={
                    handleUpdateManualInclusionText
                  }
                  focusedInclusionId={focusedInclusionId}
                  handleDeleteManualInclusion={handleDeleteManualInclusion}
                  suggestedInclusions={suggestedInclusions}
                  handleAddManualInclusion={handleAddManualInclusion}
                />
              ) : panelStep === "publish" ? (
                <PublishStepPanel
                  isPublished={isPublished}
                  publishSettings={publishSettings}
                  setPublishSettings={setPublishSettings}
                  validationChecklistItems={validationChecklistItems}
                  getChecklistState={getChecklistState}
                  serverValidation={serverValidation}
                  expandedValidationArea={expandedValidationArea}
                  setExpandedValidationArea={setExpandedValidationArea}
                  isCourseReadyToPublish={isCourseReadyToPublish}
                />
              ) : (
                <div className="relative z-10 grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)] gap-6 items-start max-[768px]:gap-4.5 w-full min-w-0">
                  <section className="relative z-10 rounded-[14px] p-6 bg-(--surface) shadow-(--card-shadow) max-[768px]:p-4">
                    <div className="mb-4.5">
                      <h2 className="m-0 text-(--text) text-[1.18rem] font-[650] tracking-[-0.015em]">
                        {WIZARD_STEPS.find((s) => s.id === panelStep)?.label}
                      </h2>
                      <p className="m-0 mt-1 mb-5 text-(--muted) text-[0.82rem]">
                        This section will allow configuring course {panelStep}.
                      </p>
                    </div>
                  </section>
                </div>
              )
            }
          </SwipeableTabPanel>
        </Suspense>
      )}

      {/* Sticky Bottom Action Bar (Desktop / Tablet) */}
      <div
        className="course-wizard-sticky-bottom-bar"
        data-testid="course-wizard-sticky-bottom-bar"
      >
        <div className="relative flex items-center justify-between gap-2.5 sm:gap-3 w-full max-w-[1400px] mx-auto">
          {/* Left: Preview Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!(activeStep === "publish" && isPublished) && (
              <button
                type="button"
                style={{
                  fontSize: "0.80rem",
                  fontWeight: 700,
                  height: "34px",
                  borderRadius: "8px",
                  gap: "6px",
                  paddingLeft: "14px",
                  paddingRight: "14px",
                }}
                className={`inline-flex items-center border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--text-secondary) bg-transparent transition-all duration-150 ${
                  isAnyApiInProgress || isPreviewLoading
                    ? "!opacity-40 !cursor-not-allowed !pointer-events-none hover:!bg-transparent hover:!text-(--text-secondary)"
                    : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-(--text)"
                }`}
                onClick={handlePreviewAction}
                disabled={isAnyApiInProgress || isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <Eye size={15} />
                    <span>Preview</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Center: True horizontal center save status */}
          {activeStep === "basics" && basicsOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="basics-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {basicsOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {basicsOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {basicsOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Center: True horizontal center save status for Curriculum */}
          {activeStep === "curriculum" && curriculumOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="curriculum-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {curriculumOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {curriculumOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {curriculumOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Center: True horizontal center save status for Access Rules */}
          {activeStep === "access-rules" && accessRulesOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="access-rules-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {accessRulesOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {accessRulesOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {accessRulesOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Center: True horizontal center save status for Pricing */}
          {activeStep === "pricing" && pricingOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="pricing-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {pricingOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {pricingOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {pricingOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Center: True horizontal center save status for Extras */}
          {activeStep === "extras" && extrasOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="extras-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {extrasOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {extrasOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {extrasOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Center: True horizontal center save status for Publish */}
          {activeStep === "publish" && publishOverallStatus && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10 select-none transition-all duration-200"
              data-testid="publish-overall-save-status"
              aria-live="polite"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.78rem] font-medium bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] shadow-xs backdrop-blur-xs select-none">
                {publishOverallStatus === "saving" && (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span className="text-(--text-secondary)">
                      Saving changes...
                    </span>
                  </>
                )}
                {publishOverallStatus === "failed" && (
                  <>
                    <WarningCircle
                      size={14}
                      weight="fill"
                      className="text-rose-500 shrink-0"
                    />
                    <span className="text-rose-500">Save failed</span>
                  </>
                )}
                {publishOverallStatus === "saved" && (
                  <>
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-emerald-500 shrink-0"
                    />
                    <span className="text-emerald-500">All changes saved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Right: Previous & Next / Validate / Publish Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            {/* Previous Button */}
            {!(activeStep === "publish" && isPublished) && (
              <button
                type="button"
                style={{
                  fontSize: "0.80rem",
                  fontWeight: 700,
                  height: "34px",
                  borderRadius: "8px",
                  gap: "6px",
                  paddingLeft: "14px",
                  paddingRight: "14px",
                }}
                className={`inline-flex items-center border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--text-secondary) bg-transparent transition-all duration-150 ${
                  activeStep === "basics" || actionLoading !== null
                    ? "!opacity-40 !cursor-not-allowed !pointer-events-none hover:!bg-transparent hover:!text-(--text-secondary)"
                    : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-(--text)"
                }`}
                onClick={() => {
                  if (previousStepId) void navigateToStep(previousStepId);
                }}
                disabled={activeStep === "basics" || actionLoading !== null}
                aria-label="Previous Step"
              >
                <CaretLeft size={15} />
                <span>Previous</span>
              </button>
            )}

            {/* Next Button / Validate on Publish */}
            {activeStep === "publish" ? (
              <button
                type="button"
                style={{
                  fontSize: "0.80rem",
                  fontWeight: 700,
                  height: "34px",
                  borderRadius: "8px",
                  gap: "6px",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                }}
                className="inline-flex items-center border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] text-(--accent) bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] cursor-pointer transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleValidateCourseAction}
                disabled={actionLoading !== null || isValidating}
              >
                {actionLoading === "validate" || isValidating ? (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-(--accent)"
                    />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} weight="bold" />
                    <span>Validate</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                style={{
                  fontSize: "0.80rem",
                  fontWeight: 700,
                  height: "34px",
                  borderRadius: "8px",
                  gap: "6px",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                }}
                className={`inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all duration-150 ease-out ${
                  actionLoading !== null ||
                  (!isDownstreamUnlocked && activeStep === "basics")
                    ? "!opacity-40 !cursor-not-allowed !shadow-none"
                    : "cursor-pointer hover:bg-(--accent-hover,var(--accent)) hover:shadow-[0_4px_14px_var(--accent-shadow)] active:scale-[0.98]"
                }`}
                onClick={() => {
                  if (nextStepId) void navigateToStep(nextStepId);
                }}
                title={
                  !isDownstreamUnlocked && activeStep === "basics"
                    ? "Add a course title to continue."
                    : undefined
                }
                disabled={
                  actionLoading !== null ||
                  (!isDownstreamUnlocked && activeStep === "basics")
                }
                aria-label="Next Step"
              >
                {actionLoading === "save" ? (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-white"
                    />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <CaretRight size={15} weight="bold" />
                  </>
                )}
              </button>
            )}

            {/* Publish CTA Button only when on publish step */}
            {activeStep === "publish" && (
              <>
                {isPublished && (
                  <button
                    type="button"
                    style={{
                      fontSize: "0.80rem",
                      fontWeight: 700,
                      height: "34px",
                      borderRadius: "8px",
                      gap: "6px",
                      paddingLeft: "14px",
                      paddingRight: "14px",
                    }}
                    className="inline-flex items-center justify-center border border-red-500/30 text-red-400 bg-red-500/10 cursor-pointer transition-all duration-150 hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={actionLoading !== null}
                    onClick={() => setIsUnpublishModalOpen(true)}
                    title="Unpublish this course and return it to draft state"
                  >
                    {actionLoading === "unpublish" ? (
                      <>
                        <CircleNotch
                          size={14}
                          className="animate-spin text-red-400"
                        />
                        <span>Unpublishing...</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={15} weight="bold" />
                        <span>Unpublish</span>
                      </>
                    )}
                  </button>
                )}

                {!isPublished && (
                  <button
                    type="button"
                    style={{
                      fontSize: "0.80rem",
                      fontWeight: 700,
                      height: "34px",
                      borderRadius: "8px",
                      gap: "6px",
                      paddingLeft: "18px",
                      paddingRight: "18px",
                    }}
                    className={`inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all duration-150 ease-out ${
                      !isCourseReadyToPublish
                        ? "!opacity-40 !cursor-not-allowed filter blur-[0.4px] pointer-events-none select-none !shadow-none"
                        : "cursor-pointer hover:bg-(--accent-hover,var(--accent)) hover:shadow-[0_4px_14px_var(--accent-shadow)] active:scale-[0.98]"
                    }`}
                    disabled={actionLoading !== null || !isCourseReadyToPublish}
                    onClick={handleFinalPublishCourse}
                    title={
                      !isCourseReadyToPublish
                        ? "Please resolve incomplete sections before publishing."
                        : undefined
                    }
                  >
                    {actionLoading === "publish" ? (
                      <>
                        <CircleNotch
                          size={15}
                          className="animate-spin text-white"
                        />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Lightning size={15} weight="bold" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Basics only, above mobile bar) */}
      {activeStep === "basics" && basicsOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="basics-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {basicsOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {basicsOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {basicsOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Curriculum only, above mobile bar) */}
      {activeStep === "curriculum" && curriculumOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="curriculum-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {curriculumOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {curriculumOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {curriculumOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Access Rules only, above mobile bar) */}
      {activeStep === "access-rules" && accessRulesOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="access-rules-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {accessRulesOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {accessRulesOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {accessRulesOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Pricing only, above mobile bar) */}
      {activeStep === "pricing" && pricingOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="pricing-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {pricingOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {pricingOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {pricingOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Extras only, above mobile bar) */}
      {activeStep === "extras" && extrasOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="extras-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {extrasOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {extrasOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {extrasOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Save Status Pill (Publish only, above mobile bar) */}
      {activeStep === "publish" && publishOverallStatus && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[136] pointer-events-none min-[641px]:hidden transition-all duration-200 select-none ${
            bottomNavHidden
              ? "opacity-0 translate-y-3 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
          style={{
            bottom:
              "calc(58px + var(--app-viewport-safe-area-bottom, 0px) + 72px)",
          }}
          data-testid="publish-overall-save-status-mobile"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-medium bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)] border border-[color-mix(in_srgb,var(--border)_80%,transparent)] shadow-md backdrop-blur-sm">
            {publishOverallStatus === "saving" && (
              <>
                <CircleNotch
                  size={13}
                  className="animate-spin text-(--accent)"
                />
                <span className="text-(--text-secondary)">
                  Saving changes...
                </span>
              </>
            )}
            {publishOverallStatus === "failed" && (
              <>
                <WarningCircle
                  size={13}
                  weight="fill"
                  className="text-rose-500 shrink-0"
                />
                <span className="text-rose-500">Save failed</span>
              </>
            )}
            {publishOverallStatus === "saved" && (
              <>
                <CheckCircle
                  size={13}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                />
                <span className="text-emerald-500">All changes saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky / Fixed Bottom Action Bar */}
      <div
        className={`course-wizard-mobile-action-bar${
          bottomNavHidden ||
          isPreviewModalOpen ||
          isAddCategoryModalOpen ||
          Boolean(categoryToDelete)
            ? " is-scroll-hidden"
            : ""
        }`}
      >
        {/* Preview Button */}
        {!(activeStep === "publish" && isPublished) && (
          <button
            type="button"
            style={{
              fontSize: "0.84rem",
              fontWeight: 500,
              height: "44px",
              borderRadius: "12px",
              gap: "6px",
            }}
            className={`flex-1 inline-flex items-center justify-center border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--text-secondary) bg-transparent transition-all active:scale-[0.98] ${
              isAnyApiInProgress || isPreviewLoading
                ? "!opacity-40 !cursor-not-allowed !pointer-events-none hover:!bg-transparent hover:!text-(--text-secondary)"
                : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-(--text)"
            }`}
            onClick={handlePreviewAction}
            disabled={isAnyApiInProgress || isPreviewLoading}
          >
            {isPreviewLoading ? (
              <>
                <CircleNotch
                  size={14}
                  className="animate-spin text-(--accent)"
                />
                <span>Opening...</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Preview</span>
              </>
            )}
          </button>
        )}

        {/* Previous Button */}
        {!(activeStep === "publish" && isPublished) && (
          <button
            type="button"
            style={{
              fontSize: "0.84rem",
              fontWeight: 500,
              height: "44px",
              borderRadius: "12px",
              gap: "6px",
            }}
            className={`flex-1 inline-flex items-center justify-center border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--text-secondary) bg-transparent transition-all active:scale-[0.98] ${
              activeStep === "basics" || actionLoading !== null
                ? "!opacity-40 !cursor-not-allowed !pointer-events-none hover:!bg-transparent hover:!text-(--text-secondary)"
                : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-(--text)"
            }`}
            onClick={() => {
              if (previousStepId) void navigateToStep(previousStepId);
            }}
            disabled={activeStep === "basics" || actionLoading !== null}
            aria-label="Previous Step"
          >
            <CaretLeft size={14} />
            <span>Previous</span>
          </button>
        )}

        {/* Next Button / Validate on Publish */}
        {activeStep === "publish" ? (
          <button
            type="button"
            style={{
              fontSize: "0.84rem",
              fontWeight: 500,
              height: "44px",
              borderRadius: "12px",
              gap: "6px",
            }}
            className="flex-1 inline-flex items-center justify-center border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] text-(--accent) bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleValidateCourseAction}
            disabled={actionLoading !== null || isValidating}
          >
            {actionLoading === "validate" || isValidating ? (
              <>
                <CircleNotch
                  size={14}
                  className="animate-spin text-(--accent)"
                />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} weight="bold" />
                <span>Validate</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            style={{
              fontSize: "0.84rem",
              fontWeight: 600,
              height: "44px",
              borderRadius: "12px",
              gap: "6px",
            }}
            className={`flex-1 inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all ${
              actionLoading !== null ||
              (!isDownstreamUnlocked && activeStep === "basics")
                ? "!opacity-40 !cursor-not-allowed !shadow-none"
                : "cursor-pointer hover:bg-(--accent-hover,var(--accent)) active:scale-[0.98]"
            }`}
            onClick={() => {
              if (nextStepId) void navigateToStep(nextStepId);
            }}
            title={
              !isDownstreamUnlocked && activeStep === "basics"
                ? "Add a course title to continue."
                : undefined
            }
            disabled={
              actionLoading !== null ||
              (!isDownstreamUnlocked && activeStep === "basics")
            }
            aria-label="Next Step"
          >
            {actionLoading === "save" ? (
              <>
                <CircleNotch size={14} className="animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <CaretRight size={14} weight="bold" />
              </>
            )}
          </button>
        )}

        {/* Publish CTA Button only when on publish step */}
        {activeStep === "publish" && (
          <>
            {isPublished && (
              <button
                type="button"
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  height: "44px",
                  borderRadius: "14px",
                  gap: "6px",
                }}
                className="flex-1 inline-flex items-center justify-center border border-red-500/35 text-red-400 bg-red-500/10 cursor-pointer transition-all hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={actionLoading !== null}
                onClick={() => setIsUnpublishModalOpen(true)}
              >
                {actionLoading === "unpublish" ? (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin text-red-400"
                    />
                    <span>Unpublishing...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={15} weight="bold" />
                    <span>Unpublish</span>
                  </>
                )}
              </button>
            )}

            {!isPublished && (
              <button
                type="button"
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  height: "44px",
                  borderRadius: "14px",
                  gap: "6px",
                }}
                className={`flex-1 inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all ${
                  !isCourseReadyToPublish
                    ? "!opacity-40 !cursor-not-allowed filter blur-[0.4px] pointer-events-none select-none !shadow-none"
                    : "cursor-pointer hover:bg-(--accent-hover,var(--accent)) active:scale-[0.98]"
                }`}
                disabled={actionLoading !== null || !isCourseReadyToPublish}
                onClick={handleFinalPublishCourse}
                title={
                  !isCourseReadyToPublish
                    ? "Please resolve incomplete sections before publishing."
                    : undefined
                }
              >
                {actionLoading === "publish" ? (
                  <>
                    <CircleNotch
                      size={15}
                      className="animate-spin text-white"
                    />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Lightning size={15} weight="bold" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <ToastNotification
          message={toastMessage}
          type="success"
          onDismiss={() => setToastMessage(null)}
        />
      )}
      {/* Reusable Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        onConfirm={deleteModalState.onConfirm}
        onClose={() =>
          setDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Realistic Student-Facing Course Overview Full Preview Modal */}
      {isPreviewModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-1200 flex flex-col bg-black/80 backdrop-blur-xl animate-[deleteModalFadeIn_0.2s_ease-out] p-4 box-border max-[640px]:p-0"
            onClick={() => setIsPreviewModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Course Overview Preview"
          >
            <div
              className="relative flex flex-col w-full max-w-345 h-full max-h-[94vh] m-auto border border-[color-mix(in_srgb,var(--text)_14%,transparent)] rounded-[20px] bg-[color-mix(in_srgb,var(--surface)_24%,var(--canvas))] shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden animate-[deleteModalPopIn_0.22s_cubic-bezier(0.16,1,0.3,1)] max-[640px]:max-h-screen max-[640px]:h-screen max-[640px]:rounded-none max-[640px]:border-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) shrink-0 max-[640px]:px-3.5 max-[640px]:py-2.5">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-2 min-w-0 flex-1 max-[640px]:gap-1.5">
                  <div className="inline-flex items-center gap-2 text-[0.92rem] font-bold text-(--text) tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis max-[640px]:text-[0.85rem]">
                    <Eye size={18} weight="bold" />
                    <span>Student Course Overview Preview</span>
                  </div>
                  {hasUnsavedChanges ? (
                    <span className="inline-flex items-center gap-1.25 px-2.25 py-0.75 rounded-full border border-[color-mix(in_srgb,#f59e0b_35%,transparent)] bg-[color-mix(in_srgb,#f59e0b_15%,transparent)] text-[#d97706] dark:text-[#fbbf24] text-[0.7rem] font-[650] whitespace-nowrap shrink-0 max-[640px]:text-[0.66rem] max-[640px]:px-1.75 max-[640px]:py-0.5">
                      <Info size={12} weight="bold" />
                      Last saved version
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.25 px-2.25 py-0.75 rounded-full border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[color-mix(in_srgb,var(--surface-strong)_40%,transparent)] text-(--muted) text-[0.7rem] font-medium whitespace-nowrap shrink-0 max-[640px]:text-[0.66rem] max-[640px]:px-1.75 max-[640px]:py-0.5">
                      <CheckCircle
                        size={12}
                        weight="fill"
                        className="text-(--accent)"
                      />
                      Previewing saved version
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex w-7 h-7 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--surface-strong)72%,transparent)] text-(--muted) hover:text-(--text) hover:bg-[color-mix(in_srgb,var(--surface)48%,transparent)] transition-all duration-150 bg-transparent cursor-pointer p-0"
                  onClick={() => setIsPreviewModalOpen(false)}
                  aria-label="Close Preview"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Informational banner when unsaved changes exist in editor */}
              {hasUnsavedChanges && currentCourseId && (
                <div className="flex items-center gap-2 px-5 py-2 bg-[color-mix(in_srgb,#f59e0b_10%,var(--surface))] border-b border-[color-mix(in_srgb,#f59e0b_22%,transparent)] text-[#d97706] dark:text-[#fbbf24] text-[0.79rem] font-medium shrink-0 max-[640px]:px-3.5 max-[640px]:py-1.75">
                  <Info
                    size={15}
                    className="shrink-0 text-[#f59e0b]"
                    weight="bold"
                  />
                  <span className="leading-snug">
                    This preview reflects the last saved version on the server.
                    Save your current changes in the editor to update the
                    preview.
                  </span>
                </div>
              )}

              {/* Modal Body: Render authentic CourseOverviewPage */}
              <div className="flex-1 min-h-0 overflow-y-auto p-0 flex flex-col">
                {!currentCourseId ? (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[420px] p-8 text-center text-(--muted) my-auto">
                    <BookOpen
                      size={44}
                      className="mb-3.5 opacity-60 text-(--accent)"
                    />
                    <h3 className="text-[1.15rem] font-bold text-(--text) mb-1.5">
                      No Saved Course Data
                    </h3>
                    <p className="text-[0.88rem] max-w-[420px] mb-5 text-(--muted) leading-[1.45]">
                      Please save the course before opening Preview.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(false)}
                      style={{
                        fontSize: "0.80rem",
                        fontWeight: 700,
                        height: "34px",
                        borderRadius: "8px",
                        gap: "6px",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                      }}
                      className="inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all duration-150 ease-out cursor-pointer hover:bg-(--accent-hover,var(--accent)) hover:shadow-[0_4px_14px_var(--accent-shadow)] active:scale-[0.98]"
                    >
                      <ArrowLeft size={15} weight="bold" />
                      <span>Back to Editor</span>
                    </button>
                  </div>
                ) : activePreviewData ? (
                  <CourseOverviewPage
                    previewData={activePreviewData}
                    categories={serverCategories}
                    isReadOnlyPreview={true}
                    onNavigateCourses={() => setIsPreviewModalOpen(false)}
                  />
                ) : isPreviewLoading ? (
                  <div className="p-6 max-[640px]:p-3 w-full">
                    <CourseOverviewSkeleton
                      onNavigateCourses={() => setIsPreviewModalOpen(false)}
                    />
                  </div>
                ) : isPreviewError ? (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[420px] p-12 text-center text-(--muted) my-auto">
                    <div className="w-10 h-10 rounded-full bg-[rgba(239,68,68,0.12)] text-[#ef4444] flex items-center justify-center mb-3">
                      <X size={20} />
                    </div>
                    <h3 className="text-[1.05rem] font-bold text-(--text) mb-1">
                      Failed to Load Preview
                    </h3>
                    <p className="text-[0.86rem] max-w-[400px] mb-4 text-(--muted)">
                      An error occurred while fetching the course preview from
                      the server.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchPreview()}
                      style={{
                        fontSize: "0.80rem",
                        fontWeight: 700,
                        height: "34px",
                        borderRadius: "8px",
                        gap: "6px",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                      }}
                      className="inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) shadow-[0_3px_10px_var(--accent-shadow)] transition-all duration-150 ease-out cursor-pointer hover:bg-(--accent-hover,var(--accent)) hover:shadow-[0_4px_14px_var(--accent-shadow)] active:scale-[0.98]"
                    >
                      <span>Retry</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Manage Categories Modal */}
      {isAddCategoryModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 [animation:deleteModalFadeIn_0.18s_ease-out]"
            onClick={handleCloseAddCategoryModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-modal-title"
          >
            <div
              className="relative w-full max-w-[460px] rounded-[16px] border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-(--surface) p-6 shadow-[0_20px_48px_rgba(0,0,0,0.45)] [animation:deleteModalPopIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3
                    id="add-category-modal-title"
                    className="m-0 text-(--text) text-[1.1rem] font-bold tracking-tight"
                  >
                    Manage Categories
                  </h3>
                  <p className="m-0 mt-0.5 text-(--muted) text-[0.78rem]">
                    Create new categories or remove existing ones.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex w-7 h-7 items-center justify-center rounded-[8px] border border-[color-mix(in_srgb,var(--text)_10%,transparent)] text-(--muted) hover:text-(--text) hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] transition-colors duration-150 bg-transparent cursor-pointer p-0 shrink-0"
                  onClick={handleCloseAddCategoryModal}
                  aria-label="Close modal"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Add New Category Form */}
              <form
                onSubmit={handleCreateCategory}
                className="flex flex-col gap-3 pb-4 border-b border-[color-mix(in_srgb,var(--text)_10%,transparent)]"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="new-category-name-input"
                    className="text-(--text-secondary) text-[0.82rem] font-semibold"
                  >
                    Add New Category{" "}
                    <span className="text-[#ff5252] ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-category-name-input"
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        if (addCategoryError) setAddCategoryError("");
                      }}
                      placeholder="e.g. Mobile Development"
                      maxLength={100}
                      className="flex-1 h-10 px-3 rounded-[9px] border border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_60%,var(--surface))] text-(--text) text-[0.88rem] focus:outline-none focus:border-(--accent) transition-colors placeholder:text-(--muted)"
                    />
                    <button
                      type="submit"
                      disabled={
                        !newCategoryName.trim() ||
                        createCategoryMutation.isPending
                      }
                      style={{
                        fontSize: "0.80rem",
                        fontWeight: 700,
                        height: "40px",
                        borderRadius: "9px",
                        gap: "6px",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                      }}
                      className="inline-flex items-center justify-center border-none text-(--on-accent,#ffffff) bg-(--accent) cursor-pointer shadow-[0_3px_10px_var(--accent-shadow)] transition-all duration-150 ease-out hover:bg-(--accent-hover,var(--accent)) hover:shadow-[0_4px_14px_var(--accent-shadow)] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    >
                      {createCategoryMutation.isPending ? (
                        <>
                          <CircleNotch size={14} className="animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} weight="bold" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                  {addCategoryError && (
                    <p className="m-0 text-[0.78rem] text-[#ff5252] font-medium">
                      {addCategoryError}
                    </p>
                  )}
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-(--text-secondary) text-[0.80rem] font-semibold">
                    Existing Categories ({serverCategories.length})
                  </span>
                  {isLoadingCategories && (
                    <CircleNotch
                      size={13}
                      className="animate-spin text-(--muted)"
                    />
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {serverCategories.length === 0 ? (
                    <div className="py-6 text-center text-(--muted) text-[0.82rem] italic">
                      No categories found. Add your first category above.
                    </div>
                  ) : (
                    serverCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_40%,var(--surface))] hover:border-[color-mix(in_srgb,var(--text)_16%,transparent)] transition-all duration-150"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag
                            size={15}
                            className="text-(--accent) shrink-0"
                            weight="duotone"
                          />
                          <span className="text-(--text) text-[0.86rem] font-medium truncate">
                            {cat.name}
                          </span>
                          <span className="text-(--muted) text-[0.72rem] px-1.5 py-0.5 rounded-[4px] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] shrink-0">
                            {cat.slug}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryToDelete({ id: cat.id, name: cat.name })
                          }
                          disabled={deleteCategoryMutation.isPending}
                          title={`Delete category ${cat.name}`}
                          aria-label={`Delete category ${cat.name}`}
                          className="inline-flex w-7 h-7 items-center justify-center rounded-[6px] text-(--muted) hover:text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer transition-colors duration-150 p-0 shrink-0"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-4 mt-2 border-t border-[color-mix(in_srgb,var(--text)_8%,transparent)]">
                <button
                  type="button"
                  onClick={handleCloseAddCategoryModal}
                  style={{
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    height: "34px",
                    borderRadius: "8px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                  }}
                  className="inline-flex items-center justify-center border border-[color-mix(in_srgb,var(--text)_14%,transparent)] text-(--text-secondary) bg-transparent cursor-pointer transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-(--text)"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Category Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action will remove it from available course categories.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />

      {/* Unpublish Course Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isUnpublishModalOpen}
        title="Unpublish Course"
        message="Are you sure you want to unpublish this course? It will return to Draft state and be hidden from the catalogue. Enrolled students will also lose access to it until you publish it again. Course content, curriculum, and settings are kept."
        confirmLabel="Unpublish"
        cancelLabel="Keep Published"
        onConfirm={handleConfirmUnpublishCourse}
        onClose={() => setIsUnpublishModalOpen(false)}
      />
    </div>
  );
}
