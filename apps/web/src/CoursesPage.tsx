import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import { PrefetchPageLinks } from "react-router";
import { SETTINGS_ROUTE_STYLESHEETS } from "./routes/settingsRouteStylesheets";
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  Ref,
} from "react";
import type {
  CourseListResponse,
  CourseOverviewResponse,
  GuestHomePageResponse,
} from "@veolms/contracts";
import {
  SETTINGS_DEFAULT_TAB,
  normalizeSettingsTab,
  rememberSettingsTab,
  type SettingsTab,
} from "./routing/tabSessionState";
import { CircleNotchIcon as CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { CenteredLoadingSpinner } from "./components/LoadingSpinner";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { StudentIcon as Student } from "@phosphor-icons/react/Student";
import { ToastNotification, type ToastMessage } from "./ToastNotification";
import { UsersIcon as Users } from "@phosphor-icons/react/Users";
import type { LearningCourse } from "./StudentPages";
import {
  getLearningPlayerSwipeSplitX,
  isFullLearningPlayerSwipeTarget,
  subscribeToPointerGestureClaims,
} from "./gestures/pointerGestureOwnership";
import { useSecondPressHold } from "./gestures/useSecondPressHold";
import { useEmptyAreaDoubleTap } from "./gestures/useEmptyAreaDoubleTap";
import {
  getCourseQuickFilterCounts,
  getVisibleCourses,
} from "./courses/catalogue";
import {
  getStudentCataloguePathForEnrollmentFilter,
  isStudentCatalogueFilterSubpath,
} from "./courses/catalogueRoutes";
import { useToggleWishlistCourse, useWishlistIds } from "./wishlist";
import type {
  Course,
  CourseEnrollmentFilter,
  CourseOpenOptions,
  CourseRole,
  CourseSort,
  CourseStatusFilter,
} from "./courses/catalogue";
import { AcademyPaletteMenu } from "./shell/AcademyPaletteMenu";
import { AcademyRouteSkeleton } from "./routing/AcademyRouteSkeleton";
import { CreatorDashboardSkeleton } from "./home/creator/CreatorDashboardSkeleton";
import { LearnerHomeContent } from "./shell/LearnerHomeContent";
import { readPinnedHomeCourseId } from "./home/learner/pinnedHomeCourse";
import { FloatingScrollbar } from "./shell/FloatingScrollbar";
import { useScrollingMark } from "./shell/useScrollingMark";
import { useMobileProfileDrawerSize } from "./shell/useMobileProfileDrawerSize";
import { FrameEdge } from "./shell/FrameEdge";
import { ShellDragSurface } from "./shell/ShellDragSurface";
import { useCurrentUser, useSignOut } from "./services/auth";
import {
  COURSE_CATALOGUE_SEARCH_SESSION_KEY,
  forgetLegacyLearningProgress,
} from "./store/accountBrowserState";
import {
  authStore,
  useAuthIdentityHint,
  useSessionPresentAtBoot,
  useAuthStore,
} from "./store/auth.store";

import {
  useCourses,
  useInfiniteCourses,
  useDeleteCourse,
  useDeletedCourses,
  useMyCourses,
  prefetchCourseEditor,
  useRestoreCourse,
} from "./services/courses";
import { prefetchGuestHomePage, prefetchLearnerHome } from "./services/home";
import { useEnrolledCourses } from "./services/enrollments";
import {
  adaptApiCourseToCatalogueCourse,
  adaptCourseSummaryToCatalogueCourse,
  adaptDeletedCourseToCatalogueCourse,
} from "./courses/courseAdapter";
import { COURSE_OVERVIEW_CHUNK_URL_PLACEHOLDER } from "./routing/routeChunkPreloads";
import { ChunkStylesheets } from "./routing/ChunkStylesheets";
import {
  creatorDashboardBody,
  guestHomeBody,
  settingsPageBody,
  workspacePageBody,
} from "./routing/prerenderedBodies";
import {
  getMobileOverflowNavigation,
  getMobilePrimaryNavigation,
  getRoleNavigationItems,
  getNavigationDestination,
} from "./shell/navigation";
import type { NavigationItemWithMetadata } from "./shell/navigation";
import {
  getUserRoles,
  getVisibleWorkspaceRoles,
  hasAdminRole,
  isStaffRole,
  resolveWorkspaceRole,
  getWorkspaceRoleStorageKey,
  getShellProfileSubtitle,
} from "./shell/workspaceRole";
import { useNotificationSummary } from "./services/notifications";
import { setLearnerView } from "./lib/learner-view";
import { MOBILE_NAVIGATION_REVEAL_EVENT } from "./learning/player/mobileNavigationFollow";
import { courseKeys } from "./services/courses";
import { learningProgressKeys } from "./services/learning-progress";
import { mediaKeys } from "./services/media";

import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MIN_WIDTH,
  applySidebarShellToDocument,
  clampSidebarMaxWidth,
  clampSidebarWidth,
  getDefaultSidebarPreferences,
  getInitialSidebarPreferences,
  getInitialSidebarShellState,
} from "./shell/sidebarPreferences";
import {
  canStartSidebarTouchGesture,
  COMPACT_NAVIGATION_QUERY,
  getResponsiveSidebarMode,
  getSidebarPresentation,
  SIDEBAR_RESPONSIVE_COLLAPSE_QUERY,
} from "./shell/sidebarVisibility";
import {
  readApplicationScrollPosition,
  scrollApplicationTo,
} from "./shell/applicationScroll";
import {
  applyRootPalette,
  applyWithThemeViewTransition,
  skipActiveThemeViewTransitions,
  themeRevealOriginFromClick,
} from "./shell/themeViewTransition";
import {
  ensureAcademyPaletteCatalogStylesheet,
  ensureAcademyPaletteStylesheets,
} from "./shell/academyPaletteStyles";
import type { ThemeRevealOrigin } from "./shell/themeViewTransition";
import {
  academyThemes,
  DEFAULT_ACADEMY_THEME,
  getInitialAcademyTheme,
  persistAcademyTheme,
} from "./themes";
import type {
  PageTabColors,
  SidebarMode,
} from "./settings/settingsPreferences";
import {
  applySidebarGlowShapeSize,
  normalizeSidebarDockItems,
  normalizeSidebarDockOrder,
  normalizeSidebarGlow,
  normalizeSidebarGlowBlur,
  normalizeSidebarGlowShape,
  normalizeSidebarGlowIntensity,
  ELEVATED_SURFACES_KEY,
  PAGE_TAB_COLORS_DEFAULT,
  PAGE_TAB_COLORS_KEY,
  readPageTabColors,
} from "./settings/settingsPreferences";
import type { NavigateTo } from "./routing/navigation";
import { useAcademyRouteGuardState } from "./routing/RouteGuards";
import { prefetchCapabilities } from "./services/authorization";
import {
  isDashboardHomeHint,
  readHomeHint,
  rememberHomeHint,
} from "./store/homeHint";
import { isEditingShortcutTarget } from "./keyboardShortcuts";
import { useGlobalSearchShortcut } from "./searchShortcut";
import { DEFAULT_DEBOUNCE_DELAY_MS, useDebounce } from "./hooks/useDebounce";
import { useBackDismiss } from "./navigation/useBackDismiss";
import { useShortcutPlatform } from "./useShortcutPlatform";
import {
  canToggleDocumentFullscreen,
  getDocumentFullscreenElement,
  toggleDocumentFullscreen,
} from "./fullscreen";
import {
  isStoredString,
  useSessionStorageState,
} from "./learning/useSessionStorageState";
import { getCatalogueCardProgressPercent } from "./learning/catalogueCardProgress";
import { hasStartedCourse } from "@veolms/contracts/learner-home-plan";
import { readLearningProgress } from "./learning/learningProgressStorage";
import {
  persistReadingModePreferences,
  readReadingModePreferences,
  READING_MODE_DEFAULTS,
  READING_MODE_CHANGE_EVENT,
} from "./reading-mode/readingModePreferences";
import type { ReadingModePreferences } from "./reading-mode/readingModePreferences";
import type { DrawerDismissThen } from "@/components/ui/drawer";
import type { ProfilePreferences } from "./settings/profileTypes";
import {
  COURSE_OVERVIEW_CSS_URLS,
  COURSE_OVERVIEW_JS_URLS,
} from "./shell/academyRouteChunkUrls";
import {
  loadCourseCatalogueModule,
  loadProfileMenuModule,
  LogoutConfirmModal,
  loadMobileMenuDrawerModule,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  OrdersPageRoute,
  OrderHistoryPageRoute,
  CreatorDashboard,
  ReadingModeQuickMenu,
  SettingsQuickMenu,
  CourseOverviewPage,
  AnalyticsDashboardPage,
  loadCourseCreatePage,
  CourseCreatePage,
  SettingsPage,
  GuestHome,
  PlaceholderPage,
  WorkspacePage,
  ReviewsPage,
  CouponsPage,
  NotificationsPage,
  QuizAnalyticsPage,
  QuizBuilderPage,
  QuizDirectAttemptPage,
  StudentsPage,
  StudentDetailsPage,
  ProgressPage,
  PublicProfilePageRoute,
  HomePageSettingsPage,
  CouponBuilderPage,
  CouponsAccessDenied,
} from "./shell/academyLazyPages";
import {
  CourseEditorRouteFallback,
  AcademyPageFallback,
  DashboardOnItsWay,
} from "./shell/academyPageFallbacks";
import {
  SETTINGS_ENTRY_SELECTOR,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_CONTENT_REVEAL_DISTANCE,
  SIDEBAR_GESTURE_ACTIVATION_DISTANCE,
  SIDEBAR_GESTURE_DIRECTION_RATIO,
  SIDEBAR_FLING_MIN_DISTANCE,
  SIDEBAR_FLING_VELOCITY,
  SIDEBAR_HIDDEN_OFFSET_EXTRA,
  SIDEBAR_REVEAL_COMMIT_THRESHOLD,
  APPEARANCE_LONG_PRESS_DURATION,
  APPEARANCE_LONG_PRESS_MOVE_TOLERANCE,
  MOBILE_NAV_HIDE_SCROLL_THRESHOLD,
  MOBILE_NAV_SHOW_SCROLL_THRESHOLD,
  MOBILE_NAV_USER_SCROLL_GLIDE_MS,
  MOBILE_NAV_USER_SCROLL_STEP_MS,
  MOBILE_NAV_PLAYER_SELECTOR,
  MOBILE_NAV_TOP_GUARD,
  MOBILE_DRAWER_INITIAL_SNAP_POINT,
  SIDEBAR_DOCK_VERTICAL_MAX_WIDTH,
  SIDEBAR_RESIZE_STATE_SYNC_MS,
  SIDEBAR_BRAND_DOUBLE_TAP_MS,
  SIDEBAR_BRAND_DOUBLE_TAP_DISTANCE,
} from "./shell/academyShellConstants";
import type {
  ThemePreference,
  AppearanceOption,
  AppearanceSwipeSource,
  AppearanceSwipe,
  DockLongPress,
  SidebarGestureSource,
  SidebarResize,
  PointerPositionEvent,
  SidebarScreenSwipeStartEvent,
  SidebarTooltip,
  CoursesPageRenderContext,
} from "./shell/academyShellTypes";
export type { CoursesPageRenderContext } from "./shell/academyShellTypes";
import { SidebarTooltipSurface } from "./shell/SidebarTooltipSurface";
import {
  getLearningMobileMenuSnapPoint,
  isSidebarSwipeExcludedTarget,
  isFocusedSidebarSwipeInput,
  getSidebarResizeRenderKey,
  subscribeToNothing,
  getSurfacePageKey,
} from "./shell/academyShellGeometry";
import { SidebarResizeHandle } from "./shell/SidebarResizeHandle";
import { SidebarBrand } from "./shell/SidebarBrand";
import { SidebarNavigation } from "./shell/SidebarNavigation";
import { SidebarProfileMenuLayer } from "./shell/SidebarProfileMenuLayer";
import { SidebarProfileButton } from "./shell/SidebarProfileButton";
import { SidebarAppearanceDock } from "./shell/SidebarAppearanceDock";
import { ShellMainFrame } from "./shell/ShellMainFrame";
import { MobileBottomNavigation } from "./shell/MobileBottomNavigation";
import { MobileSheetProfile } from "./shell/MobileSheetProfile";
import { MobileSheetProfileMenu } from "./shell/MobileSheetProfileMenu";
import { MobileSheetAppearance } from "./shell/MobileSheetAppearance";
import { CourseCatalogueContent } from "./shell/CourseCatalogueContent";
interface CoursesPageProps {
  initialPublishedCoursePage?: CourseListResponse;
  initialPublishedCoursePageNeedsRefresh?: boolean;
  initialCourseOverview?: CourseOverviewResponse;
  initialGuestHomePage?: GuestHomePageResponse;
  initialGuestHomeCopy?: GuestHomePageResponse;
  onOpenCourse: (
    course: Course | LearningCourse,
    options?: CourseOpenOptions,
  ) => void;
  onNavigatePage: NavigateTo;
  onNavigateBack?: () => void;
  /** The menu page `onNavigateBack` returns to, as the menu names it. */
  navigateBackSection?: string;
  onExitSettings?: () => void;
  showPageBackButton?: boolean;
  cataloguePathname?: string;
  routeCatalogueEnrollmentFilter?: Extract<
    CourseEnrollmentFilter,
    "all" | "enrolled" | "not-enrolled" | "free" | "wishlist"
  >;
  page?: string;
  section?: string | null;
  settingsTab?: string;
  discussionTab?: string;
  courseSlug?: string;
  quizId?: string;
  assignmentId?: string;
  username?: string;
  couponId?: string;
  miniPlayerCourseId?: string | null;
  learningBackground?: {
    courseSlug?: string;
    discussionTab?: string;
    page: string;
    pathname?: string;
    scrollLeft: number;
    scrollTop: number;
    section?: string;
    settingsTab?: string;
  } | null;
  /**
   * While a lesson fills the screen: the page and navigation section the
   * player was opened from, which the shell keeps highlighted.
   */
  learningOriginPage?: string | null;
  learningOriginSection?: string | null;
  learningMotionStageRef?: Ref<HTMLDivElement>;
  renderMain?: ((context: CoursesPageRenderContext) => ReactNode) | null;
}

export function CoursesPage({
  initialPublishedCoursePage,
  initialPublishedCoursePageNeedsRefresh = false,
  initialCourseOverview,
  initialGuestHomePage,
  initialGuestHomeCopy,
  onOpenCourse,
  onNavigatePage,
  onNavigateBack,
  navigateBackSection,
  onExitSettings,
  showPageBackButton = false,
  cataloguePathname = "/courses",
  routeCatalogueEnrollmentFilter = "all",
  page = "courses",
  section: requestedSection = null,
  settingsTab = SETTINGS_DEFAULT_TAB,
  discussionTab = "q-and-a",
  courseSlug,
  quizId,
  assignmentId,
  username,
  couponId,
  miniPlayerCourseId = null,
  learningBackground = null,
  learningOriginPage = null,
  learningOriginSection = null,
  learningMotionStageRef,
  renderMain = null,
}: CoursesPageProps) {
  const queryClient = useQueryClient();
  const warmCourseEditorChunk = useCallback((_course: Course) => {
    void loadCourseCreatePage().catch(() => undefined);
  }, []);
  const prepareCourseEditorEdit = useCallback(
    (course: Course) => {
      warmCourseEditorChunk(course);
      void prefetchCourseEditor(queryClient, course.id);
    },
    [queryClient, warmCourseEditorChunk],
  );
  // Keep the first client render identical to the prerender. Restore the
  // account-specific workspace role only after `/auth/me` identifies the
  // account below.
  const [role, setRole] = useState<CourseRole>("student");
  const [hydratedWorkspaceRoleKey, setHydratedWorkspaceRoleKey] = useState<
    string | null
  >(null);
  const [savedShellProfiles, setSavedShellProfiles] = useState<
    Record<CourseRole, ProfilePreferences | null>
  >({ student: null, creator: null });
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(
    () => getInitialSidebarShellState().mode,
  );
  const [sidebarWidth, setSidebarWidth] = useState(
    () => getInitialSidebarShellState().width,
  );
  const sidebarShellHydratedRef = useRef(false);
  // True only while React hydrates the prerendered page. The prerender always
  // describes the expanded sidebar and hydration does not patch mismatched
  // attributes, so the controls whose attributes follow the sidebar mode are
  // keyed on this and remounted once with their real values.
  const hydratingPrerender = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true,
  );
  const sidebarControlKey = hydratingPrerender ? "prerender" : "client";

  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [sidebarResizePreviewWidth, setSidebarResizePreviewWidth] = useState<
    number | null
  >(null);
  const [sidebarOverlaySwipeOffset, setSidebarOverlaySwipeOffset] = useState<
    number | null
  >(null);
  // Browser-only input capabilities are applied after startup so the loading
  // boundary remains deterministic across the build and the first client pass.
  // Compact navigation must start as the prerendered "wide" value: it gates
  // whole elements (mobile dock, sidebar controls), so reading the viewport
  // here makes hydration fail on phones (React #418) and React then discards
  // and re-renders the entire prerendered tree. The pre-hydration layout is
  // CSS-driven via data-navigation-layout, and the mount effect below applies
  // the real matchMedia value immediately after hydration.
  const [compactNavigation, setCompactNavigation] = useState(false);
  const [coarseNavigationInput, setCoarseNavigationInput] = useState(false);
  const [edgeSidebarOpen, setEdgeSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [academyTheme, setAcademyTheme] = useState(DEFAULT_ACADEMY_THEME);
  const [appliedAcademyTheme, setAppliedAcademyTheme] = useState(
    DEFAULT_ACADEMY_THEME,
  );
  const [palettePreviewTheme, setPalettePreviewTheme] = useState<string | null>(
    null,
  );
  const displayedAcademyTheme = palettePreviewTheme ?? academyTheme;
  const [sidebarPreferences, setSidebarPreferences] = useState(
    getDefaultSidebarPreferences,
  );
  const showSidebarOnMobile = sidebarPreferences.showSidebarOnMobile === true;
  const mobileSidebarNavigationActive =
    compactNavigation && showSidebarOnMobile;
  const sidebarAvailable = !compactNavigation || mobileSidebarNavigationActive;
  const [pageTabColors, setPageTabColors] = useState<PageTabColors>(
    PAGE_TAB_COLORS_DEFAULT,
  );
  // The "fixed" header layout no longer has a setting; a stored value from
  // before is ignored.
  const sidebarHeaderLayout = "inline";
  const selectedSidebarDockItems = normalizeSidebarDockItems(
    sidebarPreferences.dockItems,
  );
  const sidebarDockItems = normalizeSidebarDockOrder(
    sidebarPreferences.dockOrder,
  ).filter((item) => selectedSidebarDockItems.includes(item));
  const settingsInSidebarDock = sidebarDockItems.includes("settings");
  const readingModeDockIndex = sidebarDockItems.indexOf("reading-mode");
  const sidebarMaxWidth = clampSidebarMaxWidth(
    sidebarPreferences?.sidebarMaxWidth,
  );
  const showSidebarAppearanceControl = sidebarDockItems.includes("appearance");
  const showSidebarThemeIcon = sidebarDockItems.includes("theme");
  const [readingModePreferences, setReadingModePreferences] = useState({
    ...READING_MODE_DEFAULTS,
  });
  const readingModeEnabled = readingModePreferences.enabled;
  const [activeSection, setActiveSection] = useState(() => {
    if (page === "home") return "Home";
    if (page === "courses") return "Courses";
    if (requestedSection) return requestedSection;
    // Keep the initializer deterministic to avoid a server/client hydration
    // mismatch. Route props become authoritative in the effect below.
    return "Courses";
  });
  const [creatorEnrollmentFilter, setCreatorEnrollmentFilter] =
    useState<CourseEnrollmentFilter>("all");
  const [search, setSearch] = useSessionStorageState(
    COURSE_CATALOGUE_SEARCH_SESSION_KEY,
    "",
    isStoredString,
  );
  const debouncedSearch = useDebounce(search, DEFAULT_DEBOUNCE_DELAY_MS);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>("all");
  const filterOwnerRef = useRef<string | null>(null);
  const [sort, setSort] = useState<CourseSort>("latest");
  const wishlisted = useWishlistIds();
  const [storedPreferencesReady, setStoredPreferencesReady] = useState(false);
  const [courseMenu, setCourseMenu] = useState<string | null>(null);
  const [profileMenu, setProfileMenu] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [paletteMenu, setPaletteMenu] = useState(false);
  const [paletteMenuSource, setPaletteMenuSource] = useState<
    "appearance" | "theme"
  >("theme");
  const paletteMenuDockIndex = sidebarDockItems.indexOf(
    paletteMenuSource === "appearance" ? "appearance" : "theme",
  );
  const [readingModeMenu, setReadingModeMenu] = useState<
    "desktop" | "mobile" | null
  >(null);
  const [settingsQuickMenu, setSettingsQuickMenu] = useState<
    "desktop" | "mobile" | null
  >(null);
  const [settingsQuickMenuLoaded, setSettingsQuickMenuLoaded] = useState(false);
  const [sidebarTooltip, setSidebarTooltip] = useState<SidebarTooltip | null>(
    null,
  );
  const [navigationScrollFade, setNavigationScrollFade] = useState({
    top: false,
    bottom: false,
    overflow: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // The sheet (and the drawer stack it lazy-loads) mounts on the first open
  // request, or ahead of time on idle for compact viewports. Starting false
  // also keeps the first client render identical to the prerender.
  const [mobileNavigationSheetMounted, setMobileNavigationSheetMounted] =
    useState(false);
  const [pendingMobileMenuOpen, setPendingMobileMenuOpen] = useState(false);
  const [profileMenuSurfaceMounted, setProfileMenuSurfaceMounted] =
    useState(false);
  const [pendingProfileMenuOpen, setPendingProfileMenuOpen] = useState(false);
  const [logoutModalMounted, setLogoutModalMounted] = useState(false);
  const [mobilePaletteMenu, setMobilePaletteMenu] = useState(false);
  const [mobileMenuCollapsedSnapPoint, setMobileMenuCollapsedSnapPoint] =
    useState(MOBILE_DRAWER_INITIAL_SNAP_POINT);
  const [mobileMenuSnapPoint, setMobileMenuSnapPoint] = useState<
    number | string | null
  >(MOBILE_DRAWER_INITIAL_SNAP_POINT);
  const [mobileBottomNavHidden, setMobileBottomNavHidden] = useState(false);
  // The lesson player asks for the bottom menu when it is minimized: its
  // mini window rests on the menu.
  useEffect(() => {
    const reveal = () => setMobileBottomNavHidden(false);
    window.addEventListener(MOBILE_NAVIGATION_REVEAL_EVENT, reveal);
    return () =>
      window.removeEventListener(MOBILE_NAVIGATION_REVEAL_EVENT, reveal);
  }, []);
  const [notice, setNotice] = useState<ToastMessage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document === "undefined"
      ? false
      : Boolean(getDocumentFullscreenElement(document)),
  );
  const shortcutPlatform = useShortcutPlatform();
  useGlobalSearchShortcut(shortcutPlatform);
  const {
    data: authUser,
    isError: authUserError,
    isFetched: authUserFetched,
  } = useCurrentUser();
  const authIdentityHint = useAuthIdentityHint();
  const workspaceRoleHint = (() => {
    if (typeof window === "undefined" || !authIdentityHint) return null;
    try {
      const storedRole = localStorage.getItem(
        getWorkspaceRoleStorageKey(authIdentityHint.userId),
      );
      return storedRole === "creator" || storedRole === "student"
        ? storedRole
        : null;
    } catch {
      return null;
    }
  })();
  // Post-hydration view of the stored role hint. The server snapshot stays
  // null so the first client render matches the prerendered guest markup;
  // right after hydration it switches, letting creator/admin sessions hide
  // the guest-home preview without a hydration mismatch.
  const hydratedWorkspaceRoleHint = useSyncExternalStore(
    subscribeToNothing,
    () => workspaceRoleHint,
    () => null,
  );
  // Same idea for any signed-in browser: its home is not the guest home, so
  // a loading state stands in until the session check answers.
  const sessionPresentAtBoot = useSessionPresentAtBoot();
  const showGuestHomeWhilePending =
    hydratedWorkspaceRoleHint !== "creator" && !sessionPresentAtBoot;
  // Which home the account had last time, when it is not the usual one
  // (see store/homeHint.ts). Nothing while hydrating, like the hints above.
  const homeHint = useSyncExternalStore(
    subscribeToNothing,
    readHomeHint,
    () => null,
  );
  // A learner who had no courses last time has the guest home with a
  // greeting, not the home that lists courses.
  const learnerWasNotEnrolled = homeHint === "new-learner";
  const storeUser = useAuthStore((s) => s.user);
  // Once `/auth/me` has completed, its null result must win over any
  // in-memory login snapshot. Before that, the snapshot is useful only for
  // same-page navigation after login; it is never persisted across reloads.
  const activeUser = authUserFetched && !authUserError ? authUser : storeUser;
  const isAuthenticated = Boolean(activeUser);
  // The catalogue search belongs to whoever typed it. Its stored copy is
  // forgotten when the session ends (`forgetAccountBrowserState`), but this
  // page stays mounted through a session that ends without a reload, and
  // went on filtering the next account's catalogue by it.
  const activeUserId = activeUser?.id ?? null;
  const searchOwnerIdRef = useRef(activeUserId);
  useEffect(() => {
    const previousOwnerId = searchOwnerIdRef.current;
    searchOwnerIdRef.current = activeUserId;
    if (previousOwnerId && previousOwnerId !== activeUserId) setSearch("");
  }, [activeUserId, setSearch]);
  // The session has not been checked yet and nothing is remembered about the
  // account, so it is too early to offer "Login".
  const accountStatusUnknown =
    !isAuthenticated && !authUserFetched && !authIdentityHint;
  const userRoles = getUserRoles(activeUser);
  const isAdmin = hasAdminRole(userRoles);
  const allowedWorkspaceRoles = useMemo(
    () => getVisibleWorkspaceRoles(userRoles, role),
    [role, userRoles],
  );
  const canSwitchWorkspace =
    allowedWorkspaceRoles.includes("student") &&
    allowedWorkspaceRoles.includes("creator");
  const effectiveRole = useMemo(
    () => (isAuthenticated ? resolveWorkspaceRole(userRoles, role) : "student"),
    [isAuthenticated, role, userRoles],
  );
  const {
    canAccessDashboard,
    dashboardCapabilitiesResolved,
    dashboardPermissionPending,
    routeContentBlocked,
  } = useAcademyRouteGuardState();
  const isEditingOrCreatingCourse = page === "course-create";
  const isAuthReady = Boolean(storeUser) || authUserFetched;
  // Whether this page has shown someone signed out. Signing in after that
  // keeps the guest home up until the learner's own home is ready, just as
  // for a browser that opened the page signed out: signing out and back in
  // without a reload used to show the placeholders of a learner with
  // courses in between, whatever the account had.
  const [shownSignedOut, setShownSignedOut] = useState(false);
  if (isAuthReady && !isAuthenticated && !shownSignedOut) {
    setShownSignedOut(true);
  }
  // The Discussions page needs a session, and the route guard holds every
  // such page back until the session check has answered. A browser that was
  // signed in last time is shown the page meanwhile: its heading, tabs and
  // filters are the same whatever the answer, and it asks for nothing until
  // the answer is in (see DiscussionsWorkspace). Should the session turn out
  // to be gone, the guard sends the visitor to sign in as it always did.
  const discussionsWhileSessionPending =
    routeContentBlocked &&
    !isAuthReady &&
    sessionPresentAtBoot &&
    page === "workspace" &&
    activeSection === "Discussions";
  const workspaceRoleKey =
    storedPreferencesReady && authUserFetched
      ? (activeUser?.id ?? "guest")
      : null;
  const isWorkspaceRoleHydrated =
    workspaceRoleKey !== null && hydratedWorkspaceRoleKey === workspaceRoleKey;
  // The account is in its Admin or Instructor view, as far as can be told
  // before `effectiveRole` says so. That takes the session check and then
  // the saved view, and until both are in `effectiveRole` reads "student":
  // an admin's page used to open as a learner's and turn into their own.
  // First the view remembered from last time stands in, then the one the
  // account's saved choice (or, for an admin with none, its role) gives.
  const creatorViewExpected =
    (!isAuthReady && sessionPresentAtBoot && isDashboardHomeHint(homeHint)) ||
    (isAuthenticated &&
      !isWorkspaceRoleHydrated &&
      (workspaceRoleHint === "creator" ||
        (workspaceRoleHint === null && isAdmin)));
  const dashboardHomeExpected = page === "home" && creatorViewExpected;
  // The route guard holds a page back with a plain spinner in its place.
  // The home page is the exception while all that is awaited is whether the
  // account may see the dashboard: it shows the dashboard's own placeholder
  // meanwhile, or the learner's home when the account is in its Student
  // view, which does not depend on the answer.
  const routeContentHeld =
    routeContentBlocked &&
    !discussionsWhileSessionPending &&
    !(dashboardPermissionPending && page === "home");
  const isDashboardRoute =
    page === "home" && (effectiveRole === "creator" || dashboardHomeExpected);
  const roleNavigationItems = useMemo(
    () =>
      creatorViewExpected
        ? getRoleNavigationItems(
            "creator",
            isAuthenticated ? isAdmin : homeHint === "admin-dashboard",
          )
        : getRoleNavigationItems(effectiveRole, isAdmin),
    [creatorViewExpected, effectiveRole, homeHint, isAdmin, isAuthenticated],
  );
  const { isPending: isSigningOut, signOut } = useSignOut();
  const signOutAfterSync = useCallback(async () => {
    // The question has closed itself by now (see closeOnConfirm).
    const result = await signOut();
    if (result === "still-signed-in") {
      setNotice({
        type: "error",
        message:
          "We couldn't sign you out, so you're still signed in. Please try again.",
      });
    }
  }, [setNotice, signOut]);
  const isCourseCataloguePage =
    page === "courses" || learningBackground?.page === "courses";
  const isStudentCatalogueRoute =
    isCourseCataloguePage && effectiveRole === "student";
  const enrollmentFilter = isStudentCatalogueRoute
    ? routeCatalogueEnrollmentFilter
    : creatorEnrollmentFilter;
  const shouldLoadCourseSurface =
    (!renderMain || Boolean(learningBackground)) && !isEditingOrCreatingCourse;
  const shouldQueryCourses =
    isCourseCataloguePage &&
    shouldLoadCourseSurface &&
    // The published catalogue is public, so do not serialize it behind the
    // `/auth/me` request. A signed-out visitor can load courses while auth is
    // resolving; a known account still waits for its workspace role to avoid
    // showing the student catalogue in a creator workspace.
    (!isAuthenticated || isWorkspaceRoleHydrated);
  const shouldQueryCreatorCourses =
    isCourseCataloguePage &&
    isAuthReady &&
    shouldLoadCourseSurface &&
    isAuthenticated &&
    (effectiveRole === "creator" || workspaceRoleHint === "creator");

  const needsCompleteCourseList =
    enrollmentFilter !== "all" || statusFilter !== "all" || sort === "progress";
  const pagedCourseQuery = useInfiniteCourses({
    enabled:
      shouldQueryCourses &&
      effectiveRole === "student" &&
      !needsCompleteCourseList,
    search: debouncedSearch,
    sort: sort === "title" ? "title" : "latest",
    initialData: initialPublishedCoursePage,
    initialDataNeedsRefresh: initialPublishedCoursePageNeedsRefresh,
  });
  const completeCourseQuery = useCourses({
    enabled:
      shouldQueryCourses &&
      effectiveRole === "student" &&
      needsCompleteCourseList,
  });
  const pagedPublishedCourses = useMemo(
    () => pagedCourseQuery.data?.pages.flatMap((page) => page.courses) ?? [],
    [pagedCourseQuery.data?.pages],
  );
  const publishedCourses = needsCompleteCourseList
    ? (completeCourseQuery.data?.courses ?? pagedPublishedCourses)
    : pagedPublishedCourses;
  const hasPublishedCourseData =
    completeCourseQuery.data !== undefined ||
    pagedCourseQuery.data !== undefined;
  const isPublishedFetching = needsCompleteCourseList
    ? completeCourseQuery.isFetching
    : pagedCourseQuery.isFetching;
  const { data: enrolledCoursesData } = useEnrolledCourses({
    enabled:
      isCourseCataloguePage &&
      shouldLoadCourseSurface &&
      effectiveRole === "student" &&
      (isAuthenticated || (!authUserFetched && authStore.hasSessionHint())),
  });
  const myCoursesQuery = useMyCourses({
    enabled:
      enrollmentFilter !== "bin" &&
      ((shouldQueryCourses && effectiveRole === "creator") ||
        shouldQueryCreatorCourses),
  });
  const myCoursesData = myCoursesQuery.data;
  // Asked for on every tab, not only on Bin: the tab's badge is this list's
  // length, so asked for only once the tab was open it read 0 until clicked.
  const deletedCoursesQuery = useDeletedCourses(undefined, {
    enabled: shouldQueryCourses && isAdmin && effectiveRole === "creator",
  });
  const deletedCoursesData = deletedCoursesQuery.data;
  const isCourseCatalogueLoadError =
    effectiveRole === "student"
      ? (needsCompleteCourseList
          ? completeCourseQuery.isError && !completeCourseQuery.isFetching
          : pagedCourseQuery.isError && !pagedCourseQuery.isFetching) &&
        !hasPublishedCourseData
      : enrollmentFilter === "bin"
        ? deletedCoursesQuery.isError &&
          !deletedCoursesQuery.isFetching &&
          !deletedCoursesData
        : myCoursesQuery.isError &&
          !myCoursesQuery.isFetching &&
          !myCoursesData;

  const isRestoringCreatorWorkspace =
    isCourseCataloguePage &&
    Boolean(initialPublishedCoursePage) &&
    workspaceRoleHint === "creator" &&
    !authUserFetched;
  const isResolvingCreatorWorkspace =
    isCourseCataloguePage &&
    isAuthenticated &&
    !isWorkspaceRoleHydrated &&
    (effectiveRole === "creator" || workspaceRoleHint === "creator");
  const isLoadingCourses =
    isRestoringCreatorWorkspace ||
    isResolvingCreatorWorkspace ||
    // Keep the prerendered public catalogue visible while auth and saved
    // workspace preferences hydrate. Those requests must not replace usable
    // static course data with a skeleton.
    (isAuthenticated && !isWorkspaceRoleHydrated && !hasPublishedCourseData) ||
    (effectiveRole === "student"
      ? shouldQueryCourses && isPublishedFetching && !hasPublishedCourseData
      : enrollmentFilter === "bin"
        ? shouldQueryCourses &&
          isAdmin &&
          deletedCoursesQuery.isFetching &&
          !deletedCoursesData
        : shouldQueryCreatorCourses &&
          myCoursesQuery.isFetching &&
          !myCoursesData);

  useEffect(() => {
    if (
      creatorEnrollmentFilter === "bin" &&
      (!isAdmin || effectiveRole !== "creator")
    ) {
      setCreatorEnrollmentFilter("all");
    }
  }, [creatorEnrollmentFilter, isAdmin, effectiveRole]);

  useEffect(() => {
    if (!isCourseCataloguePage || !isWorkspaceRoleHydrated) return;
    if (
      effectiveRole === "creator" &&
      isStudentCatalogueFilterSubpath(cataloguePathname)
    ) {
      onNavigatePage?.("/courses");
    }
  }, [
    cataloguePathname,
    effectiveRole,
    isCourseCataloguePage,
    isWorkspaceRoleHydrated,
    onNavigatePage,
  ]);

  const handleEnrollmentFilterChange = useCallback(
    (filter: CourseEnrollmentFilter) => {
      if (isStudentCatalogueRoute) {
        onNavigatePage?.(getStudentCataloguePathForEnrollmentFilter(filter));
        return;
      }
      setCreatorEnrollmentFilter(filter);
    },
    [isStudentCatalogueRoute, onNavigatePage, setCreatorEnrollmentFilter],
  );
  const deleteCourseMutation = useDeleteCourse();
  const restoreCourseMutation = useRestoreCourse();
  const [deletingCourseIds, setDeletingCourseIds] = useState<Set<string>>(
    () => new Set(),
  );

  // The home greeting takes the name without the placeholder: given "Your
  // name" it greeted a learner who has no display name as "Good morning, Your".
  const shellProfileKnownName =
    activeUser?.displayName?.trim() ||
    (!authUserFetched ? authIdentityHint?.displayName : undefined);
  const shellProfileDisplayName = shellProfileKnownName || "Your name";
  const shellProfileSubtitle = useMemo(
    () =>
      getShellProfileSubtitle(
        effectiveRole,
        userRoles,
        activeUser?.username,
        canSwitchWorkspace,
      ),
    [activeUser?.username, canSwitchWorkspace, effectiveRole, userRoles],
  );
  const ProfileSubtitleIcon =
    effectiveRole === "student"
      ? Student
      : hasAdminRole(userRoles)
        ? ShieldCheck
        : Users;
  const shellProfileAvatarUrl = activeUser?.avatarDataUrl ?? null;
  const shellProfileAvatarSrcSet = activeUser?.avatarSrcSet ?? [];
  // Guests have no notifications endpoint access; an unauthenticated request
  // would only log a 401 console error on every public page.
  const { data: notificationSummary } = useNotificationSummary({
    enabled: isAuthenticated,
  });
  const unreadNotificationCount = notificationSummary?.unreadCount ?? 0;
  const profileRef = useRef<HTMLDivElement>(null);
  const coursesAppRef = useRef<HTMLDivElement>(null);
  const appliedThemeRef = useRef<"light" | "dark" | null>(null);
  const appliedPaletteRef = useRef<string | null>(null);
  const paletteStyleRequestRef = useRef(0);
  // Pointer-triggered display-mode commits stage their pointer position
  // here so the next reveal emanates from the interaction that caused it.
  // Keyboard and OS-triggered commits leave it null, and the theme effect
  // drains it on every application, so an unrelated earlier click can
  // never become the reveal origin. Palette changes instead pass their
  // origin straight from the interaction handler that commits them.
  const themeRevealOriginRef = useRef<ThemeRevealOrigin | null>(null);
  // Document-level dismiss listeners (outside click, global Escape) only
  // re-subscribe when navigation changes, so they reach the latest revert
  // handler through this ref instead of a stale render's closure.
  const revertPalettePreviewRef = useRef<
    ((origin?: ThemeRevealOrigin) => void) | null
  >(null);
  // The same for the two handlers the long-press effect calls. They are
  // declared after that effect, further down, and it reached them by name
  // before they existed in the source.
  const activateAppearanceOptionRef = useRef<
    | ((
        option: AppearanceOption,
        mobile?: boolean,
        source?: "appearance" | "theme",
      ) => void)
    | null
  >(null);
  const acknowledgeLongPressRef = useRef<(() => void) | null>(null);
  const openLogoutConfirm = useCallback(() => {
    setProfileMenu(false);
    setLogoutConfirmOpen(true);
  }, [setLogoutConfirmOpen, setProfileMenu]);
  const dismissProfileMenuThen = useBackDismiss({
    open: profileMenu,
    onDismiss: () => setProfileMenu(false),
  });
  useBackDismiss({
    open: paletteMenu,
    onDismiss: () => {
      revertPalettePreviewRef.current?.();
      setPaletteMenu(false);
    },
  });
  useBackDismiss({
    open: mobilePaletteMenu,
    onDismiss: () => {
      revertPalettePreviewRef.current?.();
      setMobilePaletteMenu(false);
    },
  });
  useBackDismiss({
    open: readingModeMenu !== null,
    onDismiss: () => setReadingModeMenu(null),
  });
  const appearanceControlsRef = useRef<HTMLDivElement>(null);
  const appearanceControlRectsRef = useRef<DOMRect[]>([]);
  const appearanceLayoutRef = useRef<boolean | null>(null);
  const appearanceAnimationsRef = useRef<Animation[]>([]);
  const appearanceModeTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileAppearanceModeTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePaletteTriggerRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const mainScrollportRef = useRef<HTMLElement>(null);
  useScrollingMark(mainScrollportRef);
  const mobileBottomNavRef = useRef<HTMLElement>(null);
  const mobileMoreRef = useRef<HTMLButtonElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const mobileMenuDismissThenRef = useRef<DrawerDismissThen>(null);
  const dismissSettingsQuickMenuThen = useBackDismiss({
    open: settingsQuickMenu !== null,
    onDismiss: () => setSettingsQuickMenu(null),
  });
  const toggleSettingsNavigationRef = useRef<(() => void) | null>(null);
  const toggleAppearanceRef = useRef<(() => void) | null>(null);
  const mobileMenuSnapPoints = useMemo(
    () => [mobileMenuCollapsedSnapPoint, 1],
    [mobileMenuCollapsedSnapPoint],
  );
  const isLearningSurface = Boolean(renderMain);
  // A page that a minimized lesson hands over to keeps the two boxes it was
  // drawn in behind the player (the grid it shared with the lesson, and its
  // own box in that grid), only without what made it a still picture behind
  // the lesson. Turned into the plain `display: contents` boxes a page
  // otherwise has, the browser rebuilt the whole page, and a phone then drew
  // the home page's picture, its laptop screen and the copy over them as
  // blanks for a frame. It keeps them until another page is shown.
  const routePageKey = getSurfacePageKey(page, cataloguePathname);
  const lessonBackgroundPageKey =
    renderMain && learningBackground
      ? getSurfacePageKey(learningBackground.page, learningBackground.pathname)
      : null;
  const [pageKeptFromLesson, setPageKeptFromLesson] = useState<string | null>(
    null,
  );
  if (
    lessonBackgroundPageKey !== null &&
    pageKeptFromLesson !== lessonBackgroundPageKey
  ) {
    setPageKeptFromLesson(lessonBackgroundPageKey);
  } else if (
    !renderMain &&
    pageKeptFromLesson !== null &&
    pageKeptFromLesson !== routePageKey
  ) {
    setPageKeptFromLesson(null);
  }
  const keepLessonPageBoxes =
    !renderMain && pageKeptFromLesson === routePageKey;
  // Every page's cards are the shared `ElevatedCard`, a lighter pane on a
  // ground deeper than the frame's. A lesson's page is the exception: its
  // scroller lies over the shell's own surfaces and its panels keep theirs.
  const onDeepGround = !renderMain;
  const { ref: mobileSheetSizeRef, snapPoint: mobileMenuContentSnapPoint } =
    useMobileProfileDrawerSize({
      open: mobileMenuOpen,
      popupRef: mobileSheetRef,
      initialSnapPoint: MOBILE_DRAWER_INITIAL_SNAP_POINT,
      contentKey: `${isAuthenticated}:${canSwitchWorkspace}:${effectiveRole}:${sidebarDockItems.length}`,
    });
  const activeNavigationSection = isLearningSurface
    ? learningOriginSection
    : (requestedSection ??
      (page === "home"
        ? effectiveRole === "creator" && !isAdmin
          ? "Dashboard"
          : "Home"
        : page === "courses"
          ? "Courses"
          : null));
  const isNavigationItemActive = (item: NavigationItemWithMetadata) => {
    const label = item[0];
    return (
      activeNavigationSection === label ||
      (label === "Notifications" && activeNavigationSection === "Notification")
    );
  };
  const sidebarResizeRef = useRef<SidebarResize | null>(null);
  const sidebarResizeSyncTimerRef = useRef<number | undefined>(undefined);
  useEffect(
    () => () => window.clearTimeout(sidebarResizeSyncTimerRef.current),
    [],
  );
  const sidebarScreenSwipeStartRef = useRef<
    ((event: SidebarScreenSwipeStartEvent) => void) | null
  >(null);
  const sidebarResizeMoveRef = useRef<
    ((event: PointerPositionEvent) => void) | null
  >(null);
  const sidebarResizeFinishRef = useRef<
    ((event: PointerPositionEvent, cancelled?: boolean) => void) | null
  >(null);
  const sidebarOverlaySwipeConsumedRef = useRef(false);
  const appearanceSwipeRef = useRef<AppearanceSwipe | null>(null);
  const appearanceSwipeConsumedRef = useRef(false);
  const dockLongPressRef = useRef<DockLongPress | null>(null);
  const dockLongPressConsumedUntilRef = useRef(0);
  const longPressAudioContextRef = useRef<AudioContext | null>(null);
  const sidebarTooltipTimerRef = useRef<number | null>(null);
  const usesMacShortcutStyle = shortcutPlatform === "mac";
  const primaryShortcutModifier = usesMacShortcutStyle ? "Meta" : "Control";
  const settingsShortcutKeys = usesMacShortcutStyle
    ? ["⌘", ","]
    : ["Ctrl", ","];
  const sidebarShortcutTitle = usesMacShortcutStyle ? "⌘+B" : "Ctrl+B";
  const showKeyboardShortcuts =
    sidebarPreferences.showKeyboardShortcuts !== false;
  const settingsShortcutTitle = usesMacShortcutStyle ? "⌘+," : "Ctrl+,";
  const settingsControlTitle = showKeyboardShortcuts
    ? `Open settings (${settingsShortcutTitle})`
    : "Open settings";

  useEffect(
    () =>
      subscribeToPointerGestureClaims(({ pointerId }) => {
        if (sidebarResizeRef.current?.pointerId === pointerId) {
          sidebarResizeRef.current = null;
          setSidebarResizing(false);
          setSidebarResizePreviewWidth(null);
          setSidebarOverlaySwipeOffset(0);
        }
      }),
    [],
  );

  useEffect(() => {
    try {
      const shellState = getInitialSidebarShellState();
      setSidebarMode(shellState.mode);
      setSidebarWidth(shellState.width);
      const storedTheme = localStorage.getItem("veolms-theme");
      setTheme(
        storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "device"
          ? storedTheme
          : "dark",
      );
      setAcademyTheme(getInitialAcademyTheme());
      setSidebarPreferences(getInitialSidebarPreferences());
      setPageTabColors(readPageTabColors());
      setReadingModePreferences(readReadingModePreferences());
    } catch {
      // Deterministic defaults remain usable when storage is unavailable.
    } finally {
      setStoredPreferencesReady(true);
    }
  }, []);

  useLayoutEffect(() => {
    let shellState = { mode: sidebarMode, width: sidebarWidth };
    const isInitialShellSync = !sidebarShellHydratedRef.current;
    if (isInitialShellSync) {
      sidebarShellHydratedRef.current = true;
      shellState = getInitialSidebarShellState();
      if (shellState.mode !== sidebarMode) setSidebarMode(shellState.mode);
      if (shellState.width !== sidebarWidth) setSidebarWidth(shellState.width);
    }

    applySidebarShellToDocument(shellState);
  }, [sidebarMode, sidebarWidth]);

  useEffect(() => {
    if (!authUserFetched) return;
    const storedRole = localStorage.getItem(
      getWorkspaceRoleStorageKey(activeUser?.id),
    );
    setRole(
      storedRole === "student"
        ? "student"
        : storedRole === "creator" || hasAdminRole(userRoles)
          ? "creator"
          : "student",
    );
    setHydratedWorkspaceRoleKey(activeUser?.id ?? "guest");
  }, [activeUser, authUserFetched, userRoles]);

  useEffect(
    () => () => {
      const press = dockLongPressRef.current;
      if (press) window.clearTimeout(press.timer);
      void longPressAudioContextRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    if (!storedPreferencesReady) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      // Drain the staged origin on every application: pointer commits stage
      // it right before changing `theme`, while keyboard and OS-triggered
      // applications find it null and reveal from the CSS corner fallback.
      const pointerOrigin = themeRevealOriginRef.current;
      themeRevealOriginRef.current = null;
      const nextTheme =
        theme === "device" ? (media.matches ? "dark" : "light") : theme;
      const commit = () => {
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.dataset.appearance = theme;
      };
      // Reveal light/dark flips with the circular view transition, but skip it
      // for the initial application so startup stays instant.
      if (appliedThemeRef.current && appliedThemeRef.current !== nextTheme) {
        applyWithThemeViewTransition(
          commit,
          "mode",
          pointerOrigin ?? undefined,
        );
      } else {
        commit();
      }
      appliedThemeRef.current = nextTheme;
      setResolvedTheme(nextTheme);
    };
    applyTheme();
    localStorage.setItem("veolms-theme", theme);
    if (theme !== "device") return undefined;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [storedPreferencesReady, theme]);

  useLayoutEffect(() => {
    if (!compactNavigation) {
      setMobileMenuCollapsedSnapPoint(MOBILE_DRAWER_INITIAL_SNAP_POINT);
      return undefined;
    }
    if (!isLearningSurface) return undefined;
    if (!mobileMenuOpen) return undefined;

    let frame: number | null = null;
    const updateLessonDrawerSnapPoint = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const nextSnapPoint = Math.max(
          getLearningMobileMenuSnapPoint(),
          mobileMenuContentSnapPoint,
        );
        setMobileMenuCollapsedSnapPoint((current) =>
          Math.abs(current - nextSnapPoint) < 0.002 ? current : nextSnapPoint,
        );
        setMobileMenuSnapPoint((current) =>
          current === 1 ? current : nextSnapPoint,
        );
      });
    };

    updateLessonDrawerSnapPoint();
    const player = document.querySelector<HTMLElement>(
      ".learning-workspace__player-wrap",
    );
    const resizeObserver =
      typeof ResizeObserver === "undefined" || !player
        ? null
        : new ResizeObserver(updateLessonDrawerSnapPoint);
    if (resizeObserver && player) resizeObserver.observe(player);
    window.addEventListener("resize", updateLessonDrawerSnapPoint);
    window.visualViewport?.addEventListener(
      "resize",
      updateLessonDrawerSnapPoint,
    );
    window.addEventListener("scroll", updateLessonDrawerSnapPoint, {
      passive: true,
    });

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLessonDrawerSnapPoint);
      window.visualViewport?.removeEventListener(
        "resize",
        updateLessonDrawerSnapPoint,
      );
      window.removeEventListener("scroll", updateLessonDrawerSnapPoint);
    };
  }, [
    compactNavigation,
    isLearningSurface,
    mobileMenuOpen,
    mobileMenuContentSnapPoint,
  ]);

  useEffect(() => {
    document.documentElement.dataset.elevatedSurfaces = String(
      localStorage.getItem(ELEVATED_SURFACES_KEY) !== "false",
    );
  }, []);

  useEffect(() => {
    if (!storedPreferencesReady) return;
    // Synchronization only: palette interaction handlers own the animated
    // reveals, so this covers the initial application once stored
    // preferences load and any change that arrives outside a handler.
    if (appliedPaletteRef.current === displayedAcademyTheme) return;
    appliedPaletteRef.current = displayedAcademyTheme;
    applyRootPalette(displayedAcademyTheme);
    setAppliedAcademyTheme(displayedAcademyTheme);
  }, [displayedAcademyTheme, storedPreferencesReady]);

  useEffect(() => {
    if (!storedPreferencesReady) return;
    persistAcademyTheme(academyTheme);
  }, [academyTheme, storedPreferencesReady]);

  useLayoutEffect(() => {
    if (!storedPreferencesReady) return undefined;
    const next = sidebarPreferences || {};
    const root = document.documentElement;
    const nextContentLayout = next.contentLayout || "framed";
    const contentLayoutChanged =
      (root.dataset.contentLayout || "framed") !== nextContentLayout;
    const scrollPosition = contentLayoutChanged
      ? readApplicationScrollPosition()
      : null;
    root.dataset.sidebarIconStyle = next.iconStyle || "multicolor";
    root.dataset.sidebarMonochromeMode = next.monochromeMode || "theme";
    root.dataset.contentLayout = nextContentLayout;
    root.dataset.sidebarHeaderLayout = "inline";
    root.dataset.sidebarGlow = normalizeSidebarGlow(next.glowPalette);
    root.dataset.sidebarGlowShape = normalizeSidebarGlowShape(next.glowShape);
    applySidebarGlowShapeSize(next.glowShapeSize, root);
    const nextSidebarBackdropBlur = normalizeSidebarGlowBlur(next.glowBlur);
    root.dataset.sidebarBackdropBlur =
      nextSidebarBackdropBlur === 0 ? "off" : "on";
    root.style.setProperty(
      "--sidebar-backdrop-blur",
      `${nextSidebarBackdropBlur}px`,
    );
    root.style.setProperty(
      "--sidebar-glow-intensity",
      String(normalizeSidebarGlowIntensity(next.glowIntensity) / 100),
    );
    root.dataset.collapsedTooltips = String(next.showCollapsedLabels !== false);
    root.dataset.collapsedSidebarLogo = String(
      next.showCollapsedLogo !== false,
    );
    root.dataset.activeFill = String(next.highlightActive !== false);
    root.dataset.sidebarMenuElevation = String(next.elevateMenus !== false);
    root.style.setProperty(
      "--sidebar-monochrome-color",
      next.monochromeColor || "#6c78ff",
    );
    localStorage.setItem("veolms-sidebar-preferences", JSON.stringify(next));

    if (!scrollPosition) return undefined;

    // The framed layout scrolls the main surface, while edge-to-edge scrolls
    // the document. Transfer the offset before paint so switching the owner
    // does not pull the settings page back to the top.
    void root.offsetHeight;
    const restoreScrollPosition = () =>
      scrollApplicationTo({ ...scrollPosition, behavior: "auto" });
    restoreScrollPosition();
    const frame = window.requestAnimationFrame(restoreScrollPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [sidebarPreferences, storedPreferencesReady]);

  useEffect(() => {
    if (!storedPreferencesReady) return;
    document.documentElement.dataset.pageTabColors = pageTabColors;
    localStorage.setItem(PAGE_TAB_COLORS_KEY, pageTabColors);
  }, [pageTabColors, storedPreferencesReady]);

  useEffect(() => {
    const syncReadingMode = () =>
      setReadingModePreferences(readReadingModePreferences());
    syncReadingMode();
    window.addEventListener(READING_MODE_CHANGE_EVENT, syncReadingMode);
    return () =>
      window.removeEventListener(READING_MODE_CHANGE_EVENT, syncReadingMode);
  }, []);

  useEffect(() => {
    if (!storedPreferencesReady) return;
    setSidebarWidth((currentWidth) => {
      const nextWidth = clampSidebarWidth(currentWidth, sidebarMaxWidth);
      if (nextWidth === currentWidth) return currentWidth;
      localStorage.setItem(
        "veolms-sidebar-width",
        String(Math.round(nextWidth)),
      );
      return nextWidth;
    });
  }, [sidebarMaxWidth, storedPreferencesReady]);

  useEffect(() => {
    const nextRole = resolveWorkspaceRole(userRoles, role);
    if (nextRole !== role) {
      setRole(nextRole);
    }
  }, [role, userRoles]);

  // An account that manages courses is answered by the API as a learner
  // while it is in its Student view (see `lib/learner-view`). What was
  // fetched under the other view lists and numbers lessons differently, so
  // it is fetched again when the view changes.
  useEffect(() => {
    if (!isWorkspaceRoleHydrated) return;
    const learnerView =
      isAuthenticated && canSwitchWorkspace && effectiveRole === "student";
    if (!setLearnerView(learnerView)) return;
    void queryClient.invalidateQueries({ queryKey: courseKeys.overviews() });
    void queryClient.invalidateQueries({ queryKey: learningProgressKeys.all });
    void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
  }, [
    canSwitchWorkspace,
    effectiveRole,
    isAuthenticated,
    isWorkspaceRoleHydrated,
    queryClient,
  ]);

  useEffect(() => {
    if (!storedPreferencesReady || !authUserFetched || !isWorkspaceRoleHydrated)
      return;
    localStorage.setItem(getWorkspaceRoleStorageKey(activeUser?.id), role);
    setCourseMenu(null);
    // The list filters belong to an account in one workspace view. They are
    // cleared when that changes, not when the creator opens the course
    // editor and comes back.
    const filterOwner = `${activeUser?.id ?? ""}|${role}|${effectiveRole}`;
    if (filterOwnerRef.current !== filterOwner) {
      filterOwnerRef.current = filterOwner;
      setCreatorEnrollmentFilter("all");
      setStatusFilter("all");
    }
    if (page === "home")
      setActiveSection(
        effectiveRole === "creator" && !isAdmin ? "Dashboard" : "Home",
      );
    else if (requestedSection === "Wishlist") setActiveSection("Courses");
    else if (requestedSection) setActiveSection(requestedSection);
    else if (page === "courses") setActiveSection("Courses");
    else setActiveSection("Courses");
  }, [
    activeUser?.id,
    authUserFetched,
    page,
    requestedSection,
    role,
    effectiveRole,
    isAdmin,
    isWorkspaceRoleHydrated,
    storedPreferencesReady,
  ]);

  useEffect(() => {
    if (page === "course-create") return;
    if (!authUserFetched) return;
    // The initial role is deterministic for SSR/hydration and may still be
    // "student" while the account-specific workspace role is being restored.
    // Do not redirect a valid creator route during that one render window.
    if (!isWorkspaceRoleHydrated || !isAuthenticated) return;

    if (effectiveRole !== "creator") {
      const forbiddenPages = ["students", "student-details", "quiz-builder"];
      if (
        (page && forbiddenPages.includes(page)) ||
        requestedSection === "Students" ||
        requestedSection === "Create Course"
      ) {
        onNavigatePage?.("/");
      }
    }
  }, [
    authUserFetched,
    effectiveRole,
    isAuthenticated,
    isWorkspaceRoleHydrated,
    onNavigatePage,
    page,
    requestedSection,
  ]);

  useEffect(() => {
    if (!storedPreferencesReady || !sidebarShellHydratedRef.current) return;
    localStorage.setItem("veolms-sidebar-mode", sidebarMode);
    localStorage.setItem(
      "veolms-sidebar-collapsed",
      String(sidebarMode === "collapsed"),
    );
    navigationRef.current?.scrollTo({ top: 0 });
    if (sidebarMode !== "hidden") setEdgeSidebarOpen(false);
  }, [sidebarMode, storedPreferencesReady]);

  useEffect(() => {
    if (!storedPreferencesReady) return undefined;
    const media = window.matchMedia(SIDEBAR_RESPONSIVE_COLLAPSE_QUERY);
    let releaseTransitionFrame: number | null = null;
    const applyResponsiveSidebarMode = (event: MediaQueryListEvent) => {
      document.documentElement.dataset.responsiveSidebarSwitching = "true";
      if (releaseTransitionFrame !== null) {
        window.cancelAnimationFrame(releaseTransitionFrame);
      }
      setSidebarMode((currentMode) =>
        getResponsiveSidebarMode(currentMode, event.matches),
      );
      releaseTransitionFrame = window.requestAnimationFrame(() => {
        releaseTransitionFrame = window.requestAnimationFrame(() => {
          delete document.documentElement.dataset.responsiveSidebarSwitching;
          releaseTransitionFrame = null;
        });
      });
    };

    media.addEventListener("change", applyResponsiveSidebarMode);
    return () => {
      media.removeEventListener("change", applyResponsiveSidebarMode);
      if (releaseTransitionFrame !== null) {
        window.cancelAnimationFrame(releaseTransitionFrame);
      }
      delete document.documentElement.dataset.responsiveSidebarSwitching;
    };
  }, [storedPreferencesReady]);

  // Layout effect so the real navigation mode is applied in the same frame
  // as hydration: the first render pass must use the prerendered "wide"
  // markup (see the compactNavigation state above), and painting that markup
  // on a phone would flash the wrong controls for a frame.
  useLayoutEffect(() => {
    const media = window.matchMedia(COMPACT_NAVIGATION_QUERY);
    const coarseInput = window.matchMedia("(hover: none), (pointer: coarse)");
    const syncNavigationMode = () => {
      setCompactNavigation(media.matches);
      setCoarseNavigationInput(coarseInput.matches);
      document.documentElement.dataset.navigationLayout = media.matches
        ? "compact"
        : "wide";
    };
    syncNavigationMode();
    media.addEventListener("change", syncNavigationMode);
    coarseInput.addEventListener("change", syncNavigationMode);
    return () => {
      media.removeEventListener("change", syncNavigationMode);
      coarseInput.removeEventListener("change", syncNavigationMode);
    };
  }, []);

  useEffect(() => {
    if (!pendingMobileMenuOpen || !mobileNavigationSheetMounted) {
      return undefined;
    }
    // A tap arrived before the sheet was warmed. Open only after the lazy
    // drawer module has resolved and its closed state has committed (two
    // frames after the Suspense retry), so the open transition runs from a
    // mounted drawer instead of being dismissed during its first mount.
    let cancelled = false;
    void loadMobileMenuDrawerModule().then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          setPendingMobileMenuOpen(false);
          setMobileMenuOpen(true);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pendingMobileMenuOpen, mobileNavigationSheetMounted]);

  useEffect(() => {
    if (!isAuthenticated || profileMenuSurfaceMounted) return undefined;
    if (profileMenu) {
      setProfileMenuSurfaceMounted(true);
      return undefined;
    }
    const mount = () => {
      void loadProfileMenuModule();
      setProfileMenuSurfaceMounted(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(mount, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(mount, 2000);
    return () => window.clearTimeout(handle);
  }, [isAuthenticated, profileMenu, profileMenuSurfaceMounted]);

  useEffect(() => {
    if (!pendingProfileMenuOpen || !profileMenuSurfaceMounted) {
      return undefined;
    }
    // A click arrived before the menu surface was warmed. Open only after
    // the lazy module resolves and the closed menu has committed, so the
    // opening click cannot race the menu's own dismiss listeners.
    let cancelled = false;
    void loadProfileMenuModule().then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          setPendingProfileMenuOpen(false);
          setProfileMenu(true);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pendingProfileMenuOpen, profileMenuSurfaceMounted]);

  useEffect(() => {
    if (!logoutConfirmOpen) return;
    setLogoutModalMounted(true);
    // The signed-out page is put up the moment "Sign out" is pressed. The
    // guest home (where a page that needs a session goes) is fetched while
    // the question is open, so it is ready by then.
    void guestHomeBody.preload();
    void prefetchGuestHomePage(queryClient);
  }, [logoutConfirmOpen, queryClient]);

  // Settings and Discussions are fetched once the shell is idle, or sooner
  // if the pointer or the keyboard reaches one of the ways into them. The page's own code comes
  // with the import, its route module with `PrefetchPageLinks` (rendered
  // below once this has run), and the stylesheets that route links are
  // fetched outright.
  const [settingsWarmed, setSettingsWarmed] = useState(false);
  useEffect(() => {
    let idleHandle = 0;
    let timeoutHandle = 0;
    const onIntent = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(SETTINGS_ENTRY_SELECTOR)
      ) {
        warm();
      }
    };
    const stop = () => {
      if (idleHandle) window.cancelIdleCallback?.(idleHandle);
      window.clearTimeout(timeoutHandle);
      document.removeEventListener("pointerover", onIntent, true);
      document.removeEventListener("focusin", onIntent, true);
      document.removeEventListener("pointerdown", onIntent, true);
    };
    function warm() {
      stop();
      setSettingsWarmed(true);
      void settingsPageBody.preload().catch(() => undefined);
      // Discussions likewise: it is in two pieces, and until both are here
      // the page is placeholders from top to bottom.
      void import("./workspace/WorkspacePages")
        .then((module) =>
          Promise.all([
            workspacePageBody.preload(),
            module.preloadDiscussionsWorkspace(),
          ]),
        )
        .catch(() => undefined);
      // The route's stylesheets are waited for before the page is shown.
      // Fetched here, they are in the browser's cache by then (a prefetch
      // hint alone is the browser's to ignore, and some do).
      for (const href of SETTINGS_ROUTE_STYLESHEETS) {
        void fetch(href).catch(() => undefined);
      }
    }
    document.addEventListener("pointerover", onIntent, {
      capture: true,
      passive: true,
    });
    document.addEventListener("focusin", onIntent, true);
    document.addEventListener("pointerdown", onIntent, {
      capture: true,
      passive: true,
    });
    // A visitor who has asked their browser to save data only pays for
    // Settings when they are about to open it.
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    if (!saveData) {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(warm, { timeout: 6000 });
      } else {
        timeoutHandle = window.setTimeout(warm, 3500);
      }
    }
    return stop;
  }, []);

  useEffect(() => {
    // The catalogue module is behind a route-body lazy(); warm it once the
    // shell is idle so navigating to /courses never shows its fallback.
    const warm = () => void loadCourseCatalogueModule();
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (mobileNavigationSheetMounted) return undefined;
    if (mobileMenuOpen) {
      setMobileNavigationSheetMounted(true);
      return undefined;
    }
    if (!compactNavigation) return undefined;
    // Warm the sheet while the main thread is idle so the first tap on the
    // "You" button opens it without waiting for the drawer chunk. The sheet
    // body renders the profile identity/menu, so warm that module with it.
    const mount = () => {
      void loadMobileMenuDrawerModule();
      void loadProfileMenuModule();
      setMobileNavigationSheetMounted(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(mount, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(mount, 1500);
    return () => window.clearTimeout(handle);
  }, [compactNavigation, mobileMenuOpen, mobileNavigationSheetMounted]);

  useEffect(() => {
    setMobileBottomNavHidden(false);
    if (!compactNavigation) return undefined;

    type ScrollSource = Document | Element;

    const rootScrollTop = () =>
      Math.max(
        0,
        document.scrollingElement?.scrollTop ??
          document.documentElement.scrollTop,
      );
    const resolveScrollSource = (target: EventTarget | null): ScrollSource => {
      if (
        target instanceof Element &&
        target !== document.documentElement &&
        target !== document.body
      ) {
        return target;
      }
      return document;
    };
    const readScrollTop = (source: ScrollSource) =>
      source instanceof Element
        ? Math.max(0, source.scrollTop)
        : rootScrollTop();

    const scrollPositions = new Map<ScrollSource, number>([
      [document, rootScrollTop()],
    ]);
    let pendingScrollSource: ScrollSource = document;
    let direction: -1 | 0 | 1 = 0;
    let directionalTravel = 0;
    let frame: number | null = null;
    // Only scrolling the visitor does hides or shows the menu: a finger on
    // the screen (and the glide after it), the wheel, the keys, the
    // scrollbar. A page that is switched, or has its place put back, also
    // changes the scroll position, and the menu would drop away and come
    // back for it (a lesson minimized onto a page that was scrolled).
    let fingerDown = false;
    let userScrollUntil = 0;
    const holdUserScroll = (ms: number) => {
      userScrollUntil = Math.max(userScrollUntil, performance.now() + ms);
    };
    // A finger on the lesson's player is moving the player (minimizing it,
    // or dragging the mini window), not scrolling the page.
    const startUserScroll = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(MOBILE_NAV_PLAYER_SELECTOR)
      ) {
        return;
      }
      fingerDown = true;
    };
    const endUserScroll = () => {
      if (!fingerDown) return;
      fingerDown = false;
      holdUserScroll(MOBILE_NAV_USER_SCROLL_GLIDE_MS);
    };
    const markWheelScroll = () =>
      holdUserScroll(MOBILE_NAV_USER_SCROLL_STEP_MS);
    const isUserScroll = () => {
      if (fingerDown) return true;
      if (performance.now() >= userScrollUntil) return false;
      // A glide keeps going for as long as it keeps scrolling.
      holdUserScroll(MOBILE_NAV_USER_SCROLL_STEP_MS);
      return true;
    };

    const revealNavigation = () => {
      direction = 0;
      directionalTravel = 0;
      setMobileBottomNavHidden(false);
    };

    const updateFromScroll = () => {
      frame = null;
      const nextScrollTop = readScrollTop(pendingScrollSource);
      const previousScrollTop = scrollPositions.get(pendingScrollSource) ?? 0;
      const delta = nextScrollTop - previousScrollTop;
      scrollPositions.set(pendingScrollSource, nextScrollTop);

      if (
        mobileMenuOpen ||
        nextScrollTop <= MOBILE_NAV_TOP_GUARD ||
        mobileBottomNavRef.current?.querySelector(":focus-visible")
      ) {
        revealNavigation();
        return;
      }

      if (Math.abs(delta) < 1 || !isUserScroll()) return;
      const nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        directionalTravel = 0;
      }
      directionalTravel += Math.abs(delta);

      if (
        direction === 1 &&
        nextScrollTop > MOBILE_NAV_HIDE_SCROLL_THRESHOLD &&
        directionalTravel >= MOBILE_NAV_HIDE_SCROLL_THRESHOLD
      ) {
        directionalTravel = 0;
        setMobileBottomNavHidden(true);
      } else if (
        direction === -1 &&
        directionalTravel >= MOBILE_NAV_SHOW_SCROLL_THRESHOLD
      ) {
        directionalTravel = 0;
        setMobileBottomNavHidden(false);
      }
    };

    const handleScroll = (event: Event) => {
      pendingScrollSource = resolveScrollSource(event.target);
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateFromScroll);
    };
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" ||
        event.key === "Home" ||
        event.key === "PageUp" ||
        event.key === "ArrowUp"
      ) {
        revealNavigation();
      }
      if (
        event.key === " " ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "End" ||
        event.key === "Home"
      ) {
        holdUserScroll(MOBILE_NAV_USER_SCROLL_GLIDE_MS);
      }
    };

    document.addEventListener("touchstart", startUserScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", endUserScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchcancel", endUserScroll, {
      capture: true,
      passive: true,
    });
    // A mouse or pen on a scrollbar.
    document.addEventListener("pointerdown", startUserScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerup", endUserScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("wheel", markWheelScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyboardNavigation);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("touchstart", startUserScroll, true);
      document.removeEventListener("touchend", endUserScroll, true);
      document.removeEventListener("touchcancel", endUserScroll, true);
      document.removeEventListener("pointerdown", startUserScroll, true);
      document.removeEventListener("pointerup", endUserScroll, true);
      document.removeEventListener("wheel", markWheelScroll, true);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [compactNavigation, mobileMenuOpen, page]);

  useEffect(() => {
    if (!compactNavigation) {
      setMobileMenuOpen(false);
      setMobilePaletteMenu(false);
      setSettingsQuickMenu((current) =>
        current === "mobile" ? null : current,
      );
      setReadingModeMenu((current) => (current === "mobile" ? null : current));
    }
  }, [compactNavigation]);

  useEffect(() => {
    if (!compactNavigation) return;

    if (mobileSidebarNavigationActive) {
      setMobileMenuOpen(false);
      setMobilePaletteMenu(false);
      setSettingsQuickMenu((current) =>
        current === "mobile" ? null : current,
      );
      setReadingModeMenu((current) => (current === "mobile" ? null : current));
      return;
    }

    sidebarResizeRef.current = null;
    setSidebarResizing(false);
    setSidebarResizePreviewWidth(null);
    setSidebarOverlaySwipeOffset(null);
    setEdgeSidebarOpen(false);
    setMobileBottomNavHidden(false);
  }, [compactNavigation, mobileSidebarNavigationActive]);

  useEffect(() => {
    if (paletteMenu || mobilePaletteMenu) {
      void ensureAcademyPaletteCatalogStylesheet().catch(() => undefined);
    }
    if (!paletteMenu && !mobilePaletteMenu) setPalettePreviewTheme(null);
  }, [mobilePaletteMenu, paletteMenu]);

  useEffect(() => {
    if (showSidebarThemeIcon || showSidebarAppearanceControl) return;
    setPalettePreviewTheme(null);
    setPaletteMenu(false);
    setMobilePaletteMenu(false);
  }, [showSidebarAppearanceControl, showSidebarThemeIcon]);

  useEffect(() => {
    let transitionPointer: {
      pointerId: number;
      kind: "palette" | "mode";
      key: string | null;
      startX: number;
      startY: number;
      longPressTimer: number | null;
      longPressModeControl: boolean;
      longPressActivated: boolean;
    } | null = null;
    let suppressNextModeClick = false;
    let resetSuppressedModeClickTimer: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let hasLastPointerPosition = false;
    const root = document.documentElement;
    const getThemeTransitionKind = (): "palette" | "mode" | null => {
      const kind = root.dataset.themeTransition;
      return kind === "palette" || kind === "mode" ? kind : null;
    };
    const findTransitionControlAt = (
      x: number,
      y: number,
      kind: "palette" | "mode",
    ) =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          kind === "palette"
            ? "[data-theme-swatch]"
            : "[data-appearance-mode-toggle], [data-appearance-mode-option]",
        ),
      ).find((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        );
      });
    const findAppearanceModeControlAt = (x: number, y: number) =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          "[data-appearance-mode-toggle]",
        ),
      ).find((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        );
      });
    const openAppearancePaletteFromControl = (control: HTMLButtonElement) =>
      activateAppearanceOptionRef.current?.(
        "theme",
        control.hasAttribute("data-mobile-palette-trigger"),
        "appearance",
      );
    const clearTransitionLongPress = (
      press: NonNullable<typeof transitionPointer>,
    ) => {
      if (press.longPressTimer !== null) {
        window.clearTimeout(press.longPressTimer);
        press.longPressTimer = null;
      }
    };
    const suppressNextModeClickOnce = () => {
      suppressNextModeClick = true;
      if (resetSuppressedModeClickTimer !== null) {
        window.clearTimeout(resetSuppressedModeClickTimer);
      }
      resetSuppressedModeClickTimer = window.setTimeout(() => {
        suppressNextModeClick = false;
        resetSuppressedModeClickTimer = null;
      }, 0);
    };
    const getTransitionControlKey = (
      button: HTMLButtonElement,
      kind: "palette" | "mode",
    ) =>
      kind === "palette"
        ? (button.dataset.themeSwatch ?? null)
        : (button.dataset.appearanceModeOption ?? "mode");
    const syncTransitionControlCursor = (x: number, y: number) => {
      const kind = getThemeTransitionKind();
      const overTransitionControl =
        kind !== null && Boolean(findTransitionControlAt(x, y, kind));
      if (overTransitionControl) {
        if (root.dataset.themeControlCursor !== "pointer") {
          root.dataset.themeControlCursor = "pointer";
        }
      } else if (root.dataset.themeControlCursor) {
        delete root.dataset.themeControlCursor;
      }
    };
    const onThemeTransitionPointerMove = (event: PointerEvent) => {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      hasLastPointerPosition = true;
      const press = transitionPointer;
      if (
        press?.pointerId === event.pointerId &&
        press.longPressTimer !== null &&
        Math.hypot(event.clientX - press.startX, event.clientY - press.startY) >
          APPEARANCE_LONG_PRESS_MOVE_TOLERANCE
      ) {
        clearTransitionLongPress(press);
        press.longPressModeControl = false;
      }
      if (getThemeTransitionKind()) {
        syncTransitionControlCursor(lastPointerX, lastPointerY);
      } else if (root.dataset.themeControlCursor) {
        delete root.dataset.themeControlCursor;
      }
    };
    const themeTransitionObserver = new MutationObserver(() => {
      if (!getThemeTransitionKind()) {
        delete root.dataset.themeControlCursor;
        return;
      }
      if (hasLastPointerPosition) {
        syncTransitionControlCursor(lastPointerX, lastPointerY);
      }
    });
    themeTransitionObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme-transition"],
    });
    const dispatchTransitionControlClick = (
      button: HTMLButtonElement,
      event: MouseEvent,
    ) => {
      button.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          composed: true,
          button: event.button,
          buttons: event.buttons,
          clientX: event.clientX,
          clientY: event.clientY,
          detail: event.detail,
          view: window,
        }),
      );
    };
    const isThemeTransitionSurfaceTarget = (target: EventTarget | null) =>
      getThemeTransitionKind() !== null &&
      (target === document || target === root || target === document.body);
    const onThemeTransitionPointerDown = (event: PointerEvent) => {
      const kind = getThemeTransitionKind();
      if (kind) {
        syncTransitionControlCursor(event.clientX, event.clientY);
      }
      if (
        !isThemeTransitionSurfaceTarget(event.target) ||
        !event.isPrimary ||
        event.button !== 0
      )
        return;
      if (!kind) return;
      const modeControl = findAppearanceModeControlAt(
        event.clientX,
        event.clientY,
      );
      const control = findTransitionControlAt(
        event.clientX,
        event.clientY,
        kind,
      );
      transitionPointer = {
        pointerId: event.pointerId,
        kind,
        key: control ? getTransitionControlKey(control, kind) : null,
        startX: event.clientX,
        startY: event.clientY,
        longPressTimer: null,
        longPressModeControl:
          Boolean(modeControl) && event.pointerType !== "mouse",
        longPressActivated: false,
      };
      if (modeControl && event.pointerType !== "mouse") {
        const pointerId = event.pointerId;
        const isMobile = modeControl.hasAttribute(
          "data-mobile-palette-trigger",
        );
        transitionPointer.longPressTimer = window.setTimeout(() => {
          const press = transitionPointer;
          if (!press || press.pointerId !== pointerId) return;
          press.longPressTimer = null;
          press.longPressActivated = true;
          dockLongPressConsumedUntilRef.current = performance.now() + 1000;
          acknowledgeLongPressRef.current?.();
          activateAppearanceOptionRef.current?.(
            "theme",
            isMobile,
            "appearance",
          );
        }, APPEARANCE_LONG_PRESS_DURATION);
      }
      // Prevent a press on the transition snapshot from being replayed
      // against the page beneath it when the reveal finishes.
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const onThemeTransitionPointerUp = (event: PointerEvent) => {
      const pressedControl = transitionPointer;
      if (pressedControl?.pointerId !== event.pointerId) return;
      clearTransitionLongPress(pressedControl);
      transitionPointer = null;
      event.preventDefault();
      event.stopImmediatePropagation();

      if (pressedControl.longPressActivated) {
        suppressNextModeClickOnce();
        return;
      }

      const control = findTransitionControlAt(
        event.clientX,
        event.clientY,
        pressedControl.kind,
      );
      if (
        !control ||
        getTransitionControlKey(control, pressedControl.kind) !==
          pressedControl.key
      )
        return;

      if (pressedControl.kind === "mode") {
        suppressNextModeClickOnce();
      }
      dispatchTransitionControlClick(control, event);
    };
    const onThemeTransitionPointerCancel = (event: PointerEvent) => {
      if (transitionPointer?.pointerId === event.pointerId) {
        clearTransitionLongPress(transitionPointer);
        transitionPointer = null;
      }
    };
    const onThemeTransitionContextMenu = (event: MouseEvent) => {
      if (!isThemeTransitionSurfaceTarget(event.target)) return;
      const control = findAppearanceModeControlAt(event.clientX, event.clientY);
      if (!control) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (transitionPointer) {
        clearTransitionLongPress(transitionPointer);
        transitionPointer.longPressModeControl = true;
        transitionPointer.longPressActivated = true;
      }
      openAppearancePaletteFromControl(control);
    };
    const onThemeTransitionSelectStart = (event: Event) => {
      if (transitionPointer?.longPressModeControl) event.preventDefault();
    };
    const onThemeTransitionClick = (event: MouseEvent) => {
      if (suppressNextModeClick && event.isTrusted) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressNextModeClick = false;
        if (resetSuppressedModeClickTimer !== null) {
          window.clearTimeout(resetSuppressedModeClickTimer);
          resetSuppressedModeClickTimer = null;
        }
        return;
      }

      const target = event.target;
      if (!isThemeTransitionSurfaceTarget(target)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const kind = getThemeTransitionKind();
      if (!kind) return;
      const control = findTransitionControlAt(
        event.clientX,
        event.clientY,
        kind,
      );
      if (control) dispatchTransitionControlClick(control, event);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const themeTransitionSurfaceTarget =
        isThemeTransitionSurfaceTarget(target);
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("[data-course-menu]")
      )
        setCourseMenu(null);
      const profileSurface =
        event.target instanceof Element &&
        event.target.closest("[data-profile-surface]");
      if (
        !(event.target instanceof Node) ||
        (!profileRef.current?.contains(event.target) && !profileSurface)
      ) {
        setProfileMenu(false);
      }
      if (
        sidebarMode === "hidden" &&
        edgeSidebarOpen &&
        (!(event.target instanceof Element) ||
          !event.target.closest(".courses-sidebar"))
      ) {
        setEdgeSidebarOpen(false);
      }
      if (
        !themeTransitionSurfaceTarget &&
        (!(event.target instanceof Element) ||
          !event.target.closest("[data-palette-menu], [data-palette-trigger]"))
      ) {
        revertPalettePreviewRef.current?.();
        setPaletteMenu(false);
      }
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(
          "[data-reading-mode-menu], [data-reading-mode-trigger], .reading-mode-quick-menu__select-menu",
        )
      ) {
        setReadingModeMenu(null);
      }
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(
          "[data-settings-quick-menu], [data-settings-quick-trigger]",
        )
      ) {
        setSettingsQuickMenu(null);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      const isEditingText = isEditingShortcutTarget(event.target);

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key === "," &&
        !isEditingText
      ) {
        event.preventDefault();
        toggleSettingsNavigationRef.current?.();
        setActiveSection("Settings");
        setCourseMenu(null);
        setProfileMenu(false);
        setPaletteMenu(false);
        setSettingsQuickMenu(null);
        return;
      }

      // Shift+D switches between the light and dark themes on any page.
      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.code === "KeyD" &&
        !event.repeat &&
        !isEditingText
      ) {
        event.preventDefault();
        toggleAppearanceRef.current?.();
        return;
      }

      if (event.key === "Escape") {
        setCourseMenu(null);
        setPendingProfileMenuOpen(false);
        setProfileMenu(false);
        revertPalettePreviewRef.current?.();
        setPaletteMenu(false);
        setReadingModeMenu(null);
        setSettingsQuickMenu(null);
        setPendingMobileMenuOpen(false);
        setMobileMenuOpen(false);
        setMobilePaletteMenu(false);
        setEdgeSidebarOpen(false);
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "b"
      ) {
        event.preventDefault();
        setSidebarMode((current) =>
          current === "expanded" ? "collapsed" : "expanded",
        );
        setPaletteMenu(false);
        setEdgeSidebarOpen(false);
      }
    };
    document.addEventListener("click", onThemeTransitionClick, true);
    document.addEventListener(
      "pointermove",
      onThemeTransitionPointerMove,
      true,
    );
    document.addEventListener(
      "pointerdown",
      onThemeTransitionPointerDown,
      true,
    );
    document.addEventListener("pointerup", onThemeTransitionPointerUp, true);
    document.addEventListener(
      "pointercancel",
      onThemeTransitionPointerCancel,
      true,
    );
    document.addEventListener(
      "contextmenu",
      onThemeTransitionContextMenu,
      true,
    );
    document.addEventListener(
      "selectstart",
      onThemeTransitionSelectStart,
      true,
    );
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      themeTransitionObserver.disconnect();
      if (transitionPointer) clearTransitionLongPress(transitionPointer);
      delete root.dataset.themeControlCursor;
      if (resetSuppressedModeClickTimer !== null) {
        window.clearTimeout(resetSuppressedModeClickTimer);
      }
      document.removeEventListener("click", onThemeTransitionClick, true);
      document.removeEventListener(
        "pointermove",
        onThemeTransitionPointerMove,
        true,
      );
      document.removeEventListener(
        "pointerdown",
        onThemeTransitionPointerDown,
        true,
      );
      document.removeEventListener(
        "pointerup",
        onThemeTransitionPointerUp,
        true,
      );
      document.removeEventListener(
        "pointercancel",
        onThemeTransitionPointerCancel,
        true,
      );
      document.removeEventListener(
        "contextmenu",
        onThemeTransitionContextMenu,
        true,
      );
      document.removeEventListener(
        "selectstart",
        onThemeTransitionSelectStart,
        true,
      );
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [edgeSidebarOpen, onNavigatePage, sidebarMode]);

  const navigation = roleNavigationItems.filter(
    ([label]) => label !== "Settings" || !settingsInSidebarDock,
  );
  const updateNavigationScrollFade = () => {
    const nav = navigationRef.current;
    if (!nav) return;

    const maxScrollTop = Math.max(0, nav.scrollHeight - nav.clientHeight);
    const hasOverflow = maxScrollTop > 2;
    const hasScrolled = hasOverflow && nav.scrollTop > 2;
    // Whether the menu items alone are taller than the list. The blank room
    // kept below them (and the gap before it) is left out of the sum, or the
    // room would be the very thing that keeps itself shown.
    const endSpace = nav.querySelector<HTMLElement>("[data-nav-end-space]");
    const endSpaceHeight = endSpace?.offsetHeight ?? 0;
    const endSpaceExtent =
      endSpaceHeight > 0
        ? endSpaceHeight +
          (Number.parseFloat(getComputedStyle(nav).rowGap) || 0)
        : 0;
    const next = {
      top: hasScrolled,
      bottom: hasScrolled && nav.scrollTop < maxScrollTop - 2,
      overflow: maxScrollTop - endSpaceExtent > 2,
    };

    setNavigationScrollFade((current) =>
      current.top === next.top &&
      current.bottom === next.bottom &&
      current.overflow === next.overflow
        ? current
        : next,
    );
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateNavigationScrollFade);
    const handleResize = () => updateNavigationScrollFade();
    window.addEventListener("resize", handleResize);
    // The list also changes height without the window doing so (the dock
    // below it turning vertical, the profile menu), which decides whether
    // its items still fit.
    const nav = navigationRef.current;
    const observer =
      nav && typeof ResizeObserver === "function"
        ? new ResizeObserver(handleResize)
        : null;
    if (nav) observer?.observe(nav);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [compactNavigation, effectiveRole, navigation, sidebarMode]);

  // The course cards no longer read the player's old browser-wide progress
  // maps; what earlier visits left behind is removed.
  useEffect(() => {
    forgetLegacyLearningProgress();
  }, []);

  const allCourses = useMemo(() => {
    if (effectiveRole !== "creator") {
      const enrolledSet = new Set<string>();
      // Courses the learner has watched any of, even while they still show
      // 0.00% (see `hasStartedCourse`).
      const startedSet = new Set<string>();
      const progressMap = new Map<string, number | null>();
      if (enrolledCoursesData?.courses) {
        for (const ec of enrolledCoursesData.courses) {
          enrolledSet.add(ec.courseId);
          if (ec.courseSlug) enrolledSet.add(ec.courseSlug);
          if (hasStartedCourse(ec)) {
            startedSet.add(ec.courseId);
            if (ec.courseSlug) startedSet.add(ec.courseSlug);
          }
          progressMap.set(ec.courseId, ec.progress);
          if (ec.courseSlug) progressMap.set(ec.courseSlug, ec.progress);
        }
      }
      if (typeof window !== "undefined") {
        const signedInUserId = authUser?.id;
        for (const ec of enrolledCoursesData?.courses || []) {
          // The server's figure, plus what this account has watched here
          // and not sent yet (see `getCatalogueCardProgressPercent`).
          //
          // The last-opened lesson is a resume pointer, not progress. It
          // used to stand in for it: opening lesson 45 of 50 showed 90%
          // on a course the learner had barely started.
          const nextProgress = getCatalogueCardProgressPercent({
            signedIn: Boolean(signedInUserId),
            serverPercent: ec.progress,
            totalLessons: ec.totalLessons,
            localItems: readLearningProgress(signedInUserId, ec.courseSlug)
              .items,
          });

          if (nextProgress != null) {
            progressMap.set(ec.courseId, nextProgress);
            if (ec.courseSlug) progressMap.set(ec.courseSlug, nextProgress);
          }
          // Watched here and not sent yet still counts as begun.
          if (nextProgress != null && nextProgress > 0) {
            startedSet.add(ec.courseId);
            if (ec.courseSlug) startedSet.add(ec.courseSlug);
          }
        }
      }
      return publishedCourses.map((summary) => {
        const course = adaptCourseSummaryToCatalogueCourse(
          summary,
          enrolledSet,
          progressMap,
        );
        return {
          ...course,
          started:
            startedSet.has(course.id) ||
            (course.slug ? startedSet.has(course.slug) : false),
        };
      });
    }
    if (enrollmentFilter === "bin") {
      return (deletedCoursesData?.courses || []).map(
        adaptDeletedCourseToCatalogueCourse,
      );
    }
    return (myCoursesData?.courses || []).map(adaptApiCourseToCatalogueCourse);
  }, [
    authUser?.id,
    deletedCoursesData?.courses,
    effectiveRole,
    enrollmentFilter,
    enrolledCoursesData,
    myCoursesData?.courses,
    publishedCourses,
  ]);

  const totalCoursesCount = useMemo(() => {
    if (effectiveRole !== "creator") {
      return publishedCourses.length;
    }
    return (
      (myCoursesData?.courses?.length ?? 0) +
      (deletedCoursesData?.courses?.length ?? 0)
    );
  }, [
    deletedCoursesData?.courses?.length,
    effectiveRole,
    myCoursesData?.courses?.length,
    publishedCourses.length,
  ]);

  const handleDeleteCourse = async (course: Course) => {
    setDeletingCourseIds((prev) => new Set(prev).add(course.id));
    try {
      await deleteCourseMutation.mutateAsync(course.id);
      setNotice(`${course.title} moved to Bin.`);
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setNotice(
        apiError?.message ||
          `Failed to move "${course.title}" to Bin. Please try again.`,
      );
      throw err;
    } finally {
      setDeletingCourseIds((prev) => {
        const next = new Set(prev);
        next.delete(course.id);
        return next;
      });
    }
  };

  const handleRestoreCourse = async (course: Course) => {
    try {
      await restoreCourseMutation.mutateAsync(course.id);
      setNotice(`${course.title} was restored.`);
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setNotice(
        apiError?.message ||
          `Failed to restore "${course.title}". Please try again.`,
      );
      throw err;
    }
  };

  const catalogueForQuickFilterCounts = useMemo(() => {
    if (effectiveRole === "creator") {
      return (myCoursesData?.courses || []).map(
        adaptApiCourseToCatalogueCourse,
      );
    }
    return allCourses;
  }, [allCourses, effectiveRole, myCoursesData?.courses]);

  const quickFilterCounts = useMemo(() => {
    const counts = getCourseQuickFilterCounts(catalogueForQuickFilterCounts, {
      wishlisted,
      role: effectiveRole,
      statusFilter,
      // See visibleCourses below: the student "All" list arrives already
      // searched, so the count must not narrow it a second time.
      search:
        !needsCompleteCourseList &&
        (effectiveRole === "student" || pagedCourseQuery.isPlaceholderData)
          ? ""
          : debouncedSearch,
    });
    if (effectiveRole === "creator") {
      return {
        ...counts,
        bin: deletedCoursesData?.courses?.length ?? 0,
      };
    }
    return counts;
  }, [
    catalogueForQuickFilterCounts,
    debouncedSearch,
    deletedCoursesData?.courses?.length,
    effectiveRole,
    needsCompleteCourseList,
    pagedCourseQuery.isPlaceholderData,
    statusFilter,
    wishlisted,
  ]);

  // Latch whether enrollment data was already present when the catalogue
  // page first rendered this visit. When it arrives later (the prerendered
  // public grid has painted and /auth/me resolved seconds after), the
  // contrasting-enrollment promotion would reorder painted cards and score
  // a large layout shift, so it is suppressed until the next visit.
  const enrollmentPromotionAllowedRef = useRef<boolean | null>(null);
  if (isCourseCataloguePage) {
    enrollmentPromotionAllowedRef.current ??= Boolean(enrolledCoursesData);
  } else {
    enrollmentPromotionAllowedRef.current = null;
  }
  const enrollmentPromotionAllowed = isCourseCataloguePage
    ? (enrollmentPromotionAllowedRef.current ?? true)
    : true;

  const visibleCourses = useMemo(
    () =>
      getVisibleCourses(allCourses, {
        wishlisted,
        role: effectiveRole,
        enrollmentFilter,
        statusFilter,
        // The student "All" list is searched by the server, which also
        // matches the full description. Filtering it again here on title
        // and short description hid a course found only by its long
        // description. Lists the server does not search keep this filter.
        search:
          !needsCompleteCourseList &&
          (effectiveRole === "student" || pagedCourseQuery.isPlaceholderData)
            ? ""
            : debouncedSearch,
        sort,
        enrollmentPromotionAllowed,
      }),
    [
      allCourses,
      effectiveRole,
      enrollmentFilter,
      enrollmentPromotionAllowed,
      debouncedSearch,
      needsCompleteCourseList,
      pagedCourseQuery.isPlaceholderData,
      sort,
      statusFilter,
      wishlisted,
    ],
  );

  const toggleWishlist = useToggleWishlistCourse();

  const resetCatalogue = () => {
    setSearch("");
    setStatusFilter("all");
    if (isStudentCatalogueRoute) {
      onNavigatePage?.("/courses");
    } else {
      setCreatorEnrollmentFilter("all");
    }
  };

  const closeMobileMenu = () => {
    setPendingMobileMenuOpen(false);
    setMobileMenuOpen(false);
    setProfileMenu(false);
    setMobilePaletteMenu(false);
    setSettingsQuickMenu((current) => (current === "mobile" ? null : current));
    setReadingModeMenu((current) => (current === "mobile" ? null : current));
  };

  const openMobileNavigationMenu = () => {
    const nextSnapPoint = isLearningSurface
      ? Math.max(getLearningMobileMenuSnapPoint(), mobileMenuContentSnapPoint)
      : mobileMenuContentSnapPoint;
    setMobilePaletteMenu(false);
    setMobileMenuCollapsedSnapPoint(nextSnapPoint);
    setMobileMenuSnapPoint(nextSnapPoint);
    if (!mobileNavigationSheetMounted) {
      // The drawer must commit once in its closed state before it can run an
      // open transition; mounting it directly with open=true makes Base UI
      // dismiss itself. Mount first, then the pending-open effect opens it.
      setMobileNavigationSheetMounted(true);
      setPendingMobileMenuOpen(true);
      return;
    }
    setMobileMenuOpen(true);
  };
  const dismissMobileMenuThen = (action: () => void) => {
    if (mobileMenuOpen && mobileMenuDismissThenRef.current) {
      mobileMenuDismissThenRef.current(action);
      return;
    }
    closeMobileMenu();
    action();
  };

  const selectNavigation = (
    label: string,
    item?: NavigationItemWithMetadata,
  ) => {
    setEdgeSidebarOpen(false);
    dismissMobileMenuThen(() => {
      onNavigatePage?.(getNavigationDestination(item ?? label));
    });
  };

  const toggleSettingsNavigation = () => {
    setSettingsQuickMenu(null);
    if (page !== "settings") {
      selectNavigation("Settings");
      return;
    }

    setEdgeSidebarOpen(false);
    dismissMobileMenuThen(() => onExitSettings?.());
  };
  toggleSettingsNavigationRef.current = toggleSettingsNavigation;

  const navigateSettingsQuickMenu = (tab: SettingsTab) => {
    const surface = settingsQuickMenu;
    rememberSettingsTab(tab);
    const navigate = () =>
      onNavigatePage?.(`/settings/${tab}`, { resetScroll: true });
    dismissSettingsQuickMenuThen(() => {
      if (surface === "mobile") {
        setEdgeSidebarOpen(false);
        dismissMobileMenuThen(navigate);
      } else {
        navigate();
      }
    });
  };

  const navigationUsesCompactInteraction =
    compactNavigation || coarseNavigationInput;
  // The first client render of a prerendered document stays deterministic so
  // hydration can match. SPA fallback and auth-gated remounts run this
  // initializer in the browser and adopt the head bootstrap before paint.
  const renderedSidebarMode = sidebarMode;
  const renderedSidebarWidth = sidebarWidth;
  const { collapsed: sidebarCollapsed, hidden: sidebarHidden } =
    getSidebarPresentation(renderedSidebarMode);
  const sidebarPresentedAsOverlay = sidebarHidden || compactNavigation;
  const sidebarVisuallyCollapsed =
    sidebarCollapsed && !sidebarPresentedAsOverlay;

  const sidebarControlAction = compactNavigation
    ? "Close navigation"
    : sidebarHidden
      ? "Pin navigation"
      : sidebarCollapsed
        ? "Expand navigation"
        : "Collapse navigation";
  const sidebarControlTooltipAction = compactNavigation
    ? "Close"
    : sidebarHidden
      ? "Pin"
      : sidebarCollapsed
        ? "Expand"
        : "Collapse";
  const sidebarControlTitle = showKeyboardShortcuts
    ? `${sidebarControlTooltipAction} (${sidebarShortcutTitle})`
    : sidebarControlTooltipAction;
  const sidebarBrandTitle = compactNavigation
    ? "Navigation"
    : sidebarHidden
      ? "Double-click to pin sidebar"
      : "Double-click to float sidebar";
  // At rest the dock is a row when expanded and a column on the rail. During
  // a drag, in either direction, it switches at one fixed sidebar width.
  const appearanceControlsHorizontal = sidebarResizing
    ? (sidebarResizePreviewWidth ??
        (sidebarVisuallyCollapsed
          ? SIDEBAR_COLLAPSED_WIDTH
          : renderedSidebarWidth)) > SIDEBAR_DOCK_VERTICAL_MAX_WIDTH
    : !sidebarVisuallyCollapsed;

  useLayoutEffect(() => {
    const group = appearanceControlsRef.current;
    if (!group) return;

    // The prerendered document always carries the expanded (horizontal) dock
    // class, and hydration does not patch a mismatched className. The head
    // bootstrap script corrects it before first paint; this keeps the DOM in
    // step with React wherever that script did not run.
    group.classList.toggle(
      "sidebar-appearance--horizontal",
      appearanceControlsHorizontal,
    );
    group.classList.toggle(
      "sidebar-appearance--vertical",
      !appearanceControlsHorizontal,
    );

    const controls = [
      ...group.querySelectorAll<HTMLElement>(
        ":scope > button, :scope > .sidebar-palette-wrap",
      ),
    ];
    const nextRects = controls.map((control) =>
      control.getBoundingClientRect(),
    );
    const previousRects = appearanceControlRectsRef.current;
    const layoutChanged =
      appearanceLayoutRef.current !== null &&
      appearanceLayoutRef.current !== appearanceControlsHorizontal;

    if (
      layoutChanged &&
      previousRects.length === nextRects.length &&
      window.localStorage.getItem("veolms-reduce-animations") !== "true" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      appearanceAnimationsRef.current.forEach((animation) =>
        animation.cancel(),
      );
      const animations = controls.flatMap((control, index) => {
        const previousRect = previousRects[index];
        const nextRect = nextRects[index];
        if (!previousRect || !nextRect) return [];
        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return [];
        return [
          control.animate(
            [
              { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
              { transform: "translate3d(0, 0, 0)" },
            ],
            {
              duration: 260,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            },
          ),
        ];
      });
      appearanceAnimationsRef.current = animations;
      void Promise.allSettled(
        animations.map((animation) => animation.finished),
      ).then(() => {
        if (appearanceAnimationsRef.current !== animations) return;
        animations.forEach((animation) => animation.cancel());
        appearanceAnimationsRef.current = [];
      });
    }

    appearanceControlRectsRef.current = nextRects;
    appearanceLayoutRef.current = appearanceControlsHorizontal;
  }, [appearanceControlsHorizontal, sidebarResizePreviewWidth, sidebarWidth]);

  useEffect(
    () => () => {
      appearanceAnimationsRef.current.forEach((animation) =>
        animation.cancel(),
      );
    },
    [],
  );

  const toggleAppearance = (mobile = false) => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    revertPalettePreviewRef.current?.();
    setReadingModeMenu(null);
    if (mobile) setMobilePaletteMenu(false);
    else setPaletteMenu(false);
  };
  toggleAppearanceRef.current = toggleAppearance;
  // The light/dark switch in the colour theme menu leaves the menu open.
  const changeAppearanceMode = (
    mode: "light" | "dark",
    origin?: ThemeRevealOrigin,
  ) => {
    if (mode === resolvedTheme) return;
    themeRevealOriginRef.current = origin ?? null;
    setTheme(mode);
  };
  const updateReadingMode = (preferences: Partial<ReadingModePreferences>) => {
    const next = persistReadingModePreferences({
      ...readReadingModePreferences(),
      ...preferences,
    });
    setReadingModePreferences(next);
  };
  const showReadingModeMenu = (mobile = false) => {
    revertPalettePreviewRef.current?.();
    setPaletteMenu(false);
    setMobilePaletteMenu(false);
    setSettingsQuickMenu(null);
    setReadingModeMenu(mobile ? "mobile" : "desktop");
  };
  const showSettingsQuickMenu = (mobile = false) => {
    revertPalettePreviewRef.current?.();
    setProfileMenu(false);
    setPaletteMenu(false);
    setMobilePaletteMenu(false);
    setReadingModeMenu(null);
    setSettingsQuickMenuLoaded(true);
    setSettingsQuickMenu(mobile ? "mobile" : "desktop");
  };
  const openSettingsQuickMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    mobile = false,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const target = mobile ? "mobile" : "desktop";
    if (settingsQuickMenu === target) {
      setSettingsQuickMenu(null);
      return;
    }
    showSettingsQuickMenu(mobile);
  };
  const openReadingModeMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    mobile = false,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (readingModeMenu === (mobile ? "mobile" : "desktop")) {
      setReadingModeMenu(null);
      return;
    }
    showReadingModeMenu(mobile);
  };
  const fullscreenActionLabel = isFullscreen ? "Exit fullscreen" : "Fullscreen";
  const toggleFullscreen = useCallback(async () => {
    try {
      setIsFullscreen(await toggleDocumentFullscreen(document));
    } catch {
      setNotice("Fullscreen is not available in this browser.");
    }
  }, [setNotice]);
  const emptyAreaDoubleTapHandlers = useEmptyAreaDoubleTap(
    () => void toggleFullscreen(),
  );

  useEffect(() => {
    const syncFullscreenState = () =>
      setIsFullscreen(Boolean(getDocumentFullscreenElement(document)));
    const handleFullscreenShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "F11" ||
        !canToggleDocumentFullscreen(document)
      )
        return;
      event.preventDefault();
      void toggleFullscreen();
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    window.addEventListener("keydown", handleFullscreenShortcut, true);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState,
      );
      window.removeEventListener("keydown", handleFullscreenShortcut, true);
    };
  }, [toggleFullscreen]);
  const consumeAppearanceGestureClick = (
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    const consumedLongPress =
      dockLongPressConsumedUntilRef.current > performance.now();
    if (!appearanceSwipeConsumedRef.current && !consumedLongPress) return false;
    appearanceSwipeConsumedRef.current = false;
    dockLongPressConsumedUntilRef.current = 0;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  // Applies a palette change as one synchronous commit: the root dataset
  // for CSS-driven colors plus the appliedAcademyTheme React mirror for
  // prop-driven surfaces (settings previews, dashboard charts). Handlers
  // run this inside the view transition so those React re-renders land
  // between the old and new snapshots and join the reveal instead of
  // flipping ahead of it. Flushing synchronously is only legal here, in
  // the interaction handler — never from an effect.
  const commitPalette = (nextTheme: string) => {
    appliedPaletteRef.current = nextTheme;
    applyRootPalette(nextTheme);
    setAppliedAcademyTheme(nextTheme);
  };

  const changePalette = (nextTheme: string, origin?: ThemeRevealOrigin) => {
    const requestId = ++paletteStyleRequestRef.current;
    // Selecting what is already displayed runs no transition; plain state
    // updates keep the committed selection and preview in sync.
    if (nextTheme === displayedAcademyTheme) {
      setAcademyTheme(nextTheme);
      setPalettePreviewTheme(null);
      return;
    }
    void ensureAcademyPaletteStylesheets(nextTheme)
      .then(() => {
        if (paletteStyleRequestRef.current !== requestId) return;
        applyWithThemeViewTransition(
          () =>
            flushSync(() => {
              setAcademyTheme(nextTheme);
              setPalettePreviewTheme(null);
              commitPalette(nextTheme);
            }),
          "palette",
          origin,
        );
      })
      .catch(() => undefined);
  };

  const previewAcademyTheme = (themeId: string, origin?: ThemeRevealOrigin) => {
    const requestId = ++paletteStyleRequestRef.current;
    // No transition when the previewed theme already matches the displayed
    // one; keyboard previews carry the focused swatch's center and pointer
    // previews carry the pointer position as the reveal origin.
    if (themeId === displayedAcademyTheme) {
      setPalettePreviewTheme(themeId);
      return;
    }
    void ensureAcademyPaletteStylesheets(themeId)
      .then(() => {
        if (paletteStyleRequestRef.current !== requestId) return;
        applyWithThemeViewTransition(
          () =>
            flushSync(() => {
              setPalettePreviewTheme(themeId);
              commitPalette(themeId);
            }),
          "palette",
          origin,
        );
      })
      .catch(() => undefined);
  };

  // Reverts an unconfirmed keyboard preview back to the committed theme.
  // Only the revert (previewed theme differing from the committed one)
  // runs a transition; otherwise clearing the preview changes nothing
  // displayed and stays silent. Keyboard Escape carries the focused
  // swatch's center; other dismissals pass nothing for the corner
  // fallback.
  const revertPalettePreview = (origin?: ThemeRevealOrigin) => {
    paletteStyleRequestRef.current += 1;
    if (!palettePreviewTheme || palettePreviewTheme === academyTheme) {
      setPalettePreviewTheme(null);
      return;
    }
    const committedTheme = academyTheme;
    applyWithThemeViewTransition(
      () =>
        flushSync(() => {
          setPalettePreviewTheme(null);
          commitPalette(committedTheme);
        }),
      "palette",
      origin,
    );
  };
  revertPalettePreviewRef.current = revertPalettePreview;

  const focusPaletteTrigger = (trigger: HTMLButtonElement | null) => {
    window.setTimeout(() => trigger?.focus({ preventScroll: true }), 0);
  };

  const confirmDesktopPaletteTheme = (themeId: string) => {
    changePalette(themeId);
    setPaletteMenu(false);
    focusPaletteTrigger(
      paletteMenuSource === "appearance"
        ? appearanceModeTriggerRef.current
        : paletteTriggerRef.current,
    );
  };

  const cancelDesktopPalettePreview = (origin?: ThemeRevealOrigin) => {
    revertPalettePreview(origin);
    setPaletteMenu(false);
    focusPaletteTrigger(
      paletteMenuSource === "appearance"
        ? appearanceModeTriggerRef.current
        : paletteTriggerRef.current,
    );
  };

  const confirmMobilePaletteTheme = (themeId: string) => {
    changePalette(themeId);
    setMobilePaletteMenu(false);
    focusPaletteTrigger(
      paletteMenuSource === "appearance"
        ? mobileAppearanceModeTriggerRef.current
        : mobilePaletteTriggerRef.current,
    );
  };

  const cancelMobilePalettePreview = (origin?: ThemeRevealOrigin) => {
    revertPalettePreview(origin);
    setMobilePaletteMenu(false);
    focusPaletteTrigger(
      paletteMenuSource === "appearance"
        ? mobileAppearanceModeTriggerRef.current
        : mobilePaletteTriggerRef.current,
    );
  };

  const activateAppearanceOption = (
    option: AppearanceOption,
    mobile = false,
    source: "appearance" | "theme" = "theme",
  ) => {
    setReadingModeMenu(null);
    if (option === "theme") {
      if (document.documentElement.dataset.themeTransition) {
        skipActiveThemeViewTransitions();
      }
      setPaletteMenuSource(source);
      if (mobile) setMobilePaletteMenu(true);
      else setPaletteMenu(true);
      return;
    }
    setTheme(option);
    revertPalettePreview();
    if (mobile) setMobilePaletteMenu(false);
    else setPaletteMenu(false);
  };
  activateAppearanceOptionRef.current = activateAppearanceOption;

  const openAppearanceThemeMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    mobile = false,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = mobile
      ? mobilePaletteMenu && paletteMenuSource === "appearance"
      : paletteMenu && paletteMenuSource === "appearance";
    if (isOpen) {
      revertPalettePreviewRef.current?.();
      if (mobile) setMobilePaletteMenu(false);
      else setPaletteMenu(false);
      return;
    }
    setReadingModeMenu(null);
    activateAppearanceOption("theme", mobile, "appearance");
  };

  const getLongPressAudioContext = () => {
    if (longPressAudioContextRef.current) {
      return longPressAudioContextRef.current;
    }
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return null;
    const context = new AudioContextConstructor();
    longPressAudioContextRef.current = context;
    return context;
  };

  const primeLongPressFeedback = () => {
    const context = getLongPressAudioContext();
    if (context?.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
  };

  const playLongPressPop = (context: AudioContext) => {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(460, now);
    oscillator.frequency.exponentialRampToValueAtTime(280, now + 0.065);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  };

  const acknowledgeLongPress = () => {
    try {
      if (navigator.vibrate?.(18)) return;
    } catch {
      // Use the audio acknowledgement when haptics are unavailable or rejected.
    }

    const context = getLongPressAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
      void context
        .resume()
        .then(() => playLongPressPop(context))
        .catch(() => undefined);
      return;
    }
    playLongPressPop(context);
  };
  acknowledgeLongPressRef.current = acknowledgeLongPress;

  const startDockLongPress = (
    event: ReactPointerEvent<HTMLButtonElement>,
    action: () => void,
    includeMouse = false,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (event.pointerType === "mouse" && !includeMouse) return;

    primeLongPressFeedback();
    const previousPress = dockLongPressRef.current;
    if (previousPress) window.clearTimeout(previousPress.timer);
    const pointerId = event.pointerId;
    const timer = window.setTimeout(() => {
      const press = dockLongPressRef.current;
      if (!press || press.pointerId !== pointerId) return;
      dockLongPressConsumedUntilRef.current = performance.now() + 1000;
      acknowledgeLongPress();
      press.action();
    }, APPEARANCE_LONG_PRESS_DURATION);
    dockLongPressRef.current = {
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer,
      action,
    };
    try {
      event.currentTarget.setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture is optional; the press still resolves on the button.
    }
  };

  const moveDockLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = dockLongPressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) <=
      APPEARANCE_LONG_PRESS_MOVE_TOLERANCE
    )
      return;
    window.clearTimeout(press.timer);
    dockLongPressRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Capture may already have been released by the browser.
    }
  };

  const finishDockLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const press = dockLongPressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    window.clearTimeout(press.timer);
    dockLongPressRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Capture may already have been released by the browser.
    }
  };

  const startAppearanceSwipe = (
    event: ReactPointerEvent<HTMLButtonElement>,
    source: AppearanceSwipeSource,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.stopPropagation();
    appearanceSwipeRef.current = {
      pointerId: event.pointerId,
      source,
      startX: event.clientX,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional; the button still receives the gesture end.
    }
  };

  const finishAppearanceSwipe = (
    event: ReactPointerEvent<HTMLButtonElement>,
    source: AppearanceSwipeSource,
    mobile = false,
  ) => {
    event.stopPropagation();
    const swipe = appearanceSwipeRef.current;
    if (
      !swipe ||
      swipe.pointerId !== event.pointerId ||
      swipe.source !== source
    )
      return;
    appearanceSwipeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Release can be a no-op when capture was unavailable.
    }

    const delta = event.clientX - swipe.startX;
    if (Math.abs(delta) < 28) return;

    appearanceSwipeConsumedRef.current = true;
    const options: readonly AppearanceOption[] = ["light", "dark", "theme"];
    const sourceIndex = options.indexOf(source);
    const direction = delta > 0 ? 1 : -1;
    const nextOption =
      options[(sourceIndex + direction + options.length) % options.length];
    // Only a swipe that lands on a different display mode stages the reveal
    // origin; swiping onto "theme" (or the current mode) changes nothing.
    if (nextOption !== "theme" && nextOption !== theme) {
      themeRevealOriginRef.current = themeRevealOriginFromClick(event);
    }
    activateAppearanceOption(nextOption!, mobile);
    window.setTimeout(() => {
      appearanceSwipeConsumedRef.current = false;
    }, 0);
  };

  const cancelAppearanceSwipe = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    const swipe = appearanceSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    appearanceSwipeRef.current = null;
    appearanceSwipeConsumedRef.current = false;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Release can be a no-op when capture was unavailable.
    }
  };
  const sidebarResizeContentVisible =
    sidebarResizing &&
    (sidebarResizePreviewWidth ?? SIDEBAR_COLLAPSED_WIDTH) >=
      SIDEBAR_COLLAPSED_WIDTH + SIDEBAR_CONTENT_REVEAL_DISTANCE;
  // The toggle's arrow flips as soon as a drag brings the sidebar down to the
  // collapsed width, without waiting for the pointer to be released.
  const sidebarDraggedToCollapsedWidth =
    sidebarResizing &&
    (sidebarResizePreviewWidth ?? renderedSidebarWidth) <=
      SIDEBAR_COLLAPSED_WIDTH;
  const sidebarClassName = [
    "courses-app",
    isDashboardRoute ? "courses-app--dashboard" : "",
    sidebarVisuallyCollapsed ? "courses-app--collapsed" : "",
    sidebarPresentedAsOverlay ? "courses-app--hidden" : "",
    sidebarPresentedAsOverlay && edgeSidebarOpen
      ? "courses-app--edge-open"
      : "",
    sidebarOverlaySwipeOffset !== null ? "courses-app--overlay-swiping" : "",
    sidebarResizing ? "courses-app--resizing" : "",
    sidebarResizeContentVisible ? "courses-app--resize-content-visible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // The prerendered document carries the expanded shell classes, and hydration
  // does not patch a mismatched className. The head bootstrap script adds the
  // collapsed class before first paint (getSidebarCollapsedMarkupBootstrapScript);
  // this keeps the DOM in step with React wherever that script did not run.
  useLayoutEffect(() => {
    const app = coursesAppRef.current;
    if (app && app.className !== sidebarClassName) {
      app.className = sidebarClassName;
    }
  }, [sidebarClassName]);

  // While the sidebar is dragged its width goes straight onto the shell,
  // ahead of React's state (see previewSidebarResizeWidth). Whatever a render
  // has just written for it, the shell is put back on the width the pointer
  // has reached; out of a drag, on the state's own value.
  useLayoutEffect(() => {
    const width =
      (sidebarResizing ? sidebarResizeRef.current?.previewWidth : undefined) ??
      sidebarResizePreviewWidth ??
      SIDEBAR_COLLAPSED_WIDTH;
    coursesAppRef.current?.style.setProperty(
      "--sidebar-resize-preview-width",
      `${width}px`,
    );
  });

  useEffect(() => {
    if (sidebarTooltipTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimerRef.current);
      sidebarTooltipTimerRef.current = null;
    }
    setSidebarTooltip(null);
  }, [
    activeNavigationSection,
    coarseNavigationInput,
    compactNavigation,
    showKeyboardShortcuts,
    sidebarHidden,
    sidebarMode,
  ]);

  const dismissSidebarTooltipImmediately = () => {
    if (sidebarTooltipTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimerRef.current);
      sidebarTooltipTimerRef.current = null;
    }
    setSidebarTooltip(null);
  };

  const showSidebarTooltip = (
    event:
      ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>,
    label: string,
    active: boolean,
    showWhenExpanded = false,
    preferenceControlled = true,
  ) => {
    if (
      (!sidebarCollapsed && !showWhenExpanded) ||
      sidebarHidden ||
      compactNavigation ||
      coarseNavigationInput
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextTooltip: SidebarTooltip = {
      label,
      active,
      top: rect.top + rect.height / 2,
      // The tooltip coordinate starts at the SVG tip; its flexible body
      // begins eight pixels later at the same visual offset as before.
      left: rect.right + 2,
      focusVisible:
        event.type === "focus" && event.currentTarget.matches(":focus-visible"),
      preferenceControlled,
    };

    if (sidebarTooltipTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimerRef.current);
      sidebarTooltipTimerRef.current = null;
    }
    if (event.type === "mouseenter") {
      sidebarTooltipTimerRef.current = window.setTimeout(() => {
        setSidebarTooltip(nextTooltip);
        sidebarTooltipTimerRef.current = null;
      }, 260);
      return;
    }
    setSidebarTooltip(nextTooltip);
  };

  const hideCollapsedNavigationTooltip = (
    event:
      ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>,
  ) => {
    if (sidebarTooltipTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipTimerRef.current);
      sidebarTooltipTimerRef.current = null;
    }
    if (
      event?.type === "mouseleave" &&
      document.activeElement === event.currentTarget
    )
      return;
    if (event?.type === "blur" && event.currentTarget.matches(":hover")) return;
    setSidebarTooltip(null);
  };

  const commitSidebarWidth = (value: number) => {
    const nextWidth = clampSidebarWidth(value, sidebarMaxWidth);
    setSidebarWidth(nextWidth);
    localStorage.setItem("veolms-sidebar-width", String(Math.round(nextWidth)));
  };

  // Removing the saved width, rather than saving the default, lets a later
  // change of the default reach this browser.
  const resetSidebarWidth = () => {
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    localStorage.removeItem("veolms-sidebar-width");
  };

  const createSidebarGesture = ({
    active,
    clientX,
    clientY,
    handle,
    pointerId,
    source,
    timeStamp,
  }: {
    active: boolean;
    clientX: number;
    clientY: number;
    handle: HTMLElement | null;
    pointerId: number;
    source: SidebarGestureSource;
    timeStamp: number;
  }): SidebarResize => {
    const overlayGesture = source === "overlay" || source === "overlay-rail";
    const screenOverlayAtStart =
      source === "screen" && sidebarPresentedAsOverlay;
    const collapsedAtStart =
      sidebarVisuallyCollapsed ||
      (sidebarPresentedAsOverlay && !overlayGesture);
    const expandedWidthAtStart = clampSidebarWidth(
      Math.max(SIDEBAR_MIN_WIDTH, sidebarWidth),
      sidebarMaxWidth,
    );
    const startWidth = collapsedAtStart
      ? SIDEBAR_COLLAPSED_WIDTH
      : expandedWidthAtStart;

    return {
      pointerId,
      source,
      screenOverlayAtStart,
      active,
      startedAt: timeStamp,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastTimestamp: timeStamp,
      velocityX: 0,
      startWidth,
      expandedWidthAtStart,
      modeAtStart: sidebarMode,
      collapsedAtStart,
      previewWidth: startWidth,
      handle,
    };
  };

  const activateSidebarGesture = (resize: SidebarResize) => {
    if (resize.active) return;
    resize.active = true;
    dismissSidebarTooltipImmediately();
    if (resize.screenOverlayAtStart) {
      sidebarOverlaySwipeConsumedRef.current = true;
      setEdgeSidebarOpen(true);
      setSidebarOverlaySwipeOffset(
        -resize.expandedWidthAtStart - SIDEBAR_HIDDEN_OFFSET_EXTRA,
      );
      try {
        resize.handle?.setPointerCapture?.(resize.pointerId);
      } catch {
        // Window-level pointer listeners keep the reveal gesture active.
      }
      return;
    }
    if (resize.source === "overlay") {
      sidebarOverlaySwipeConsumedRef.current = true;
      setSidebarOverlaySwipeOffset(0);
      try {
        resize.handle?.setPointerCapture?.(resize.pointerId);
      } catch {
        // Window-level pointer listeners keep the overlay gesture active.
      }
      return;
    }
    // A swipe may begin on a menu item. Once it has become a drag, the
    // sidebar swallows the click that could follow the finger lifting.
    // (Only swipes arrive here not yet active: a press on the resize line
    // itself starts its drag at once.)
    sidebarOverlaySwipeConsumedRef.current = true;
    setSidebarResizePreviewWidth(resize.previewWidth);
    setSidebarResizing(true);
    try {
      resize.handle?.setPointerCapture?.(resize.pointerId);
    } catch {
      // Window-level pointer listeners keep the gesture alive without capture.
    }
  };

  const startSidebarScreenSwipe = (event: SidebarScreenSwipeStartEvent) => {
    const startsOnSidebar =
      event.target instanceof Element &&
      Boolean(event.target.closest(".courses-sidebar"));
    const startsInOpenOverlay =
      sidebarPresentedAsOverlay && edgeSidebarOpen && startsOnSidebar;
    // A sideways swipe that begins on the pinned sidebar is a drag of its
    // resize line, wherever on the sidebar the finger is: any width between
    // the rail and the maximum, settling as that line settles.
    const dragsResizeLine =
      startsOnSidebar && !sidebarPresentedAsOverlay && !compactNavigation;
    if (
      !canStartSidebarTouchGesture({
        compactNavigation,
        enabled: !compactNavigation || mobileSidebarNavigationActive,
        hidden: sidebarPresentedAsOverlay,
        isPrimary: event.isPrimary,
        pointerType: event.pointerType,
      }) ||
      (!compactNavigation &&
        !startsInOpenOverlay &&
        renderMain &&
        event.clientX >= (event.splitX ?? window.innerWidth / 2)) ||
      sidebarResizeRef.current ||
      isSidebarSwipeExcludedTarget(event.target) ||
      isFocusedSidebarSwipeInput(event.target)
    )
      return;

    sidebarResizeRef.current = createSidebarGesture({
      active: false,
      clientX: event.clientX,
      clientY: event.clientY,
      handle: event.handle,
      pointerId: event.pointerId,
      source: startsInOpenOverlay
        ? "overlay"
        : dragsResizeLine
          ? "rail"
          : "screen",
      timeStamp: event.timeStamp,
    });
  };

  /**
   * Takes a dragged sidebar to a new width.
   *
   * The width is written onto the shell directly, so the sidebar and the
   * page beside it are laid out for it in this same frame. It used to travel
   * through React state alone, which re-rendered the whole shell for every
   * movement of the pointer: each of those renders took several frames, so
   * the layout followed the pointer in jumps and the text on the page
   * shuddered as it was dragged.
   *
   * React still hears the width where it changes what is rendered, at once,
   * and otherwise when the pointer comes to rest (the handle's reported
   * value). With the live size readout on, it hears every width as before.
   */
  const previewSidebarResizeWidth = (previousWidth: number, width: number) => {
    window.clearTimeout(sidebarResizeSyncTimerRef.current);
    const rendersDifferently =
      getSidebarResizeRenderKey(previousWidth) !==
      getSidebarResizeRenderKey(width);

    if (rendersDifferently) {
      // The appearance dock may be about to turn. Its controls glide from
      // where they are now, which React last measured when it last rendered.
      const dock = appearanceControlsRef.current;
      if (dock) {
        appearanceControlRectsRef.current = [
          ...dock.querySelectorAll<HTMLElement>(
            ":scope > button, :scope > .sidebar-palette-wrap",
          ),
        ].map((control) => control.getBoundingClientRect());
      }
    }

    coursesAppRef.current?.style.setProperty(
      "--sidebar-resize-preview-width",
      `${width}px`,
    );

    if (sidebarPreferences.showResizeDimensions === true) {
      setSidebarResizePreviewWidth(width);
      return;
    }
    if (rendersDifferently) {
      // The shell has to be rendered again, and that is the whole page with
      // it: long enough, done at once, to hold the drag still while the
      // pointer went on (the page was seen to fall behind the pointer each
      // time a fast drag passed one of these widths). The width itself is
      // already on the shell, so nothing waits for this render: it is done
      // in pieces between frames, and the sidebar takes its new arrangement
      // a few frames after the width that calls for it.
      startTransition(() => setSidebarResizePreviewWidth(width));
      return;
    }
    sidebarResizeSyncTimerRef.current = window.setTimeout(() => {
      const resize = sidebarResizeRef.current;
      // Likewise in pieces: the pointer has only paused, and a drag that
      // carries on must not find the page busy rendering.
      if (resize?.active) {
        startTransition(() =>
          setSidebarResizePreviewWidth(resize.previewWidth),
        );
      }
    }, SIDEBAR_RESIZE_STATE_SYNC_MS);
  };

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      (compactNavigation && !sidebarPresentedAsOverlay) ||
      (sidebarPresentedAsOverlay && !edgeSidebarOpen)
    )
      return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dismissSidebarTooltipImmediately();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    sidebarResizeRef.current = createSidebarGesture({
      active: true,
      clientX: event.clientX,
      clientY: event.clientY,
      handle: event.currentTarget,
      pointerId: event.pointerId,
      source: sidebarPresentedAsOverlay ? "overlay-rail" : "rail",
      timeStamp: event.timeStamp,
    });
    setSidebarResizePreviewWidth(sidebarResizeRef.current.previewWidth);
    setSidebarResizing(true);
  };

  const moveSidebarResize = (event: PointerPositionEvent) => {
    const resize = sidebarResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    if (
      (resize.source === "rail" || resize.source === "overlay-rail") &&
      event.pointerType !== "touch" &&
      event.buttons === 0
    ) {
      endSidebarResize(event, true);
      return;
    }

    const deltaX = event.clientX - resize.startX;
    const deltaY = event.clientY - resize.startY;
    if (!resize.active) {
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);
      if (
        verticalDistance >= SIDEBAR_GESTURE_ACTIVATION_DISTANCE &&
        verticalDistance > horizontalDistance * SIDEBAR_GESTURE_DIRECTION_RATIO
      ) {
        sidebarResizeRef.current = null;
        return;
      }
      if (horizontalDistance < SIDEBAR_GESTURE_ACTIVATION_DISTANCE) return;
      if (
        horizontalDistance <=
        verticalDistance * SIDEBAR_GESTURE_DIRECTION_RATIO
      )
        return;
      const opensCollapsedSidebar = resize.collapsedAtStart && deltaX > 0;
      const hidesCollapsedSidebar =
        resize.modeAtStart === "collapsed" && deltaX < 0;
      const closesExpandedSidebar = !resize.collapsedAtStart && deltaX < 0;
      const movesOverlay = resize.source === "overlay";
      // The resize line goes either way from any width.
      const dragsResizeLine = resize.source === "rail";
      if (
        !movesOverlay &&
        !dragsResizeLine &&
        !opensCollapsedSidebar &&
        !hidesCollapsedSidebar &&
        !closesExpandedSidebar
      ) {
        sidebarResizeRef.current = null;
        return;
      }
      activateSidebarGesture(resize);
    }

    event.preventDefault?.();
    const eventTimestamp = event.timeStamp || performance.now();
    const timestamp = Math.max(eventTimestamp, resize.lastTimestamp + 1);
    const elapsed = timestamp - resize.lastTimestamp;
    const instantaneousVelocity = (event.clientX - resize.lastX) / elapsed;
    resize.velocityX =
      resize.velocityX === 0 || elapsed > 80
        ? instantaneousVelocity
        : resize.velocityX * 0.35 + instantaneousVelocity * 0.65;
    resize.lastX = event.clientX;
    resize.lastTimestamp = timestamp;

    if (resize.screenOverlayAtStart) {
      const hiddenOffset =
        -resize.expandedWidthAtStart - SIDEBAR_HIDDEN_OFFSET_EXTRA;
      const revealOffset = Math.max(
        hiddenOffset,
        Math.min(0, hiddenOffset + Math.max(0, deltaX)),
      );
      setSidebarOverlaySwipeOffset(revealOffset);
      return;
    }
    if (resize.source === "overlay") {
      const offset =
        deltaX < 0
          ? Math.max(-resize.expandedWidthAtStart, deltaX)
          : Math.min(28, deltaX * 0.22);
      setSidebarOverlaySwipeOffset(offset);
      return;
    }

    const maximumWidth =
      resize.source === "screen"
        ? resize.expandedWidthAtStart
        : sidebarMaxWidth;
    const minimumWidth =
      resize.source === "overlay-rail"
        ? SIDEBAR_MIN_WIDTH
        : SIDEBAR_COLLAPSED_WIDTH;
    const previewWidth = Math.min(
      maximumWidth,
      Math.max(minimumWidth, resize.startWidth + deltaX),
    );
    const previousPreviewWidth = resize.previewWidth;
    resize.previewWidth = previewWidth;
    previewSidebarResizeWidth(previousPreviewWidth, previewWidth);
  };

  const endSidebarResize = (event: PointerPositionEvent, cancelled = false) => {
    const resize = sidebarResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    sidebarResizeRef.current = null;
    window.clearTimeout(sidebarResizeSyncTimerRef.current);
    try {
      resize.handle?.releasePointerCapture?.(resize.pointerId);
    } catch {
      // Capture may already have been released when the gesture ends.
    }

    if (!resize.active) return;

    if (resize.source === "screen" || resize.source === "rail") {
      window.setTimeout(() => {
        sidebarOverlaySwipeConsumedRef.current = false;
      }, 0);
    }

    if (resize.screenOverlayAtStart) {
      const revealDistance = resize.lastX - resize.startX;
      const revealThreshold =
        (resize.expandedWidthAtStart + SIDEBAR_HIDDEN_OFFSET_EXTRA) *
        SIDEBAR_REVEAL_COMMIT_THRESHOLD;
      const intentionalReveal = !cancelled && revealDistance >= revealThreshold;
      setSidebarOverlaySwipeOffset(null);
      setEdgeSidebarOpen(intentionalReveal);
      window.setTimeout(() => {
        sidebarOverlaySwipeConsumedRef.current = false;
      }, 0);
      return;
    }

    if (resize.source === "overlay") {
      setSidebarOverlaySwipeOffset(null);
      const totalDistance = resize.lastX - resize.startX;
      const finishedAt = event.timeStamp || performance.now();
      const averageVelocity =
        totalDistance / Math.max(1, finishedAt - resize.startedAt);
      const intentionalSwipe =
        !cancelled &&
        (Math.abs(totalDistance) >= SIDEBAR_FLING_MIN_DISTANCE ||
          Math.max(Math.abs(resize.velocityX), Math.abs(averageVelocity)) >=
            SIDEBAR_FLING_VELOCITY);

      if (intentionalSwipe && totalDistance < 0) {
        setEdgeSidebarOpen(false);
      } else if (intentionalSwipe && totalDistance > 0) {
        setSidebarWidth(resize.expandedWidthAtStart);
        setSidebarMode("expanded");
        setEdgeSidebarOpen(false);
      }
      window.setTimeout(() => {
        sidebarOverlaySwipeConsumedRef.current = false;
      }, 0);
      return;
    }

    setSidebarResizePreviewWidth(null);
    setSidebarResizing(false);

    if (resize.source === "overlay-rail") {
      if (!cancelled) {
        commitSidebarWidth(Math.max(SIDEBAR_MIN_WIDTH, resize.previewWidth));
      }
      return;
    }

    if (cancelled) {
      setSidebarWidth(resize.expandedWidthAtStart);
      setSidebarMode(resize.modeAtStart);
      return;
    }

    const totalDistance = resize.lastX - resize.startX;
    const finishedAt = event.timeStamp || performance.now();
    const averageVelocity =
      totalDistance / Math.max(1, finishedAt - resize.startedAt);
    const leftwardVelocity = Math.min(resize.velocityX, averageVelocity);
    const shouldHideCollapsedSidebar =
      resize.modeAtStart === "collapsed" &&
      totalDistance < 0 &&
      (Math.abs(totalDistance) >= SIDEBAR_FLING_MIN_DISTANCE ||
        leftwardVelocity <= -SIDEBAR_FLING_VELOCITY);

    if (shouldHideCollapsedSidebar) {
      setSidebarWidth(resize.expandedWidthAtStart);
      setSidebarMode("hidden");
      setPaletteMenu(false);
      setEdgeSidebarOpen(false);
      return;
    }

    const fastFling =
      Math.abs(totalDistance) >= SIDEBAR_FLING_MIN_DISTANCE &&
      Math.max(Math.abs(resize.velocityX), Math.abs(averageVelocity)) >=
        SIDEBAR_FLING_VELOCITY;
    const halfwayWidth =
      SIDEBAR_COLLAPSED_WIDTH +
      (resize.expandedWidthAtStart - SIDEBAR_COLLAPSED_WIDTH) / 2;
    const shouldExpand = resize.collapsedAtStart
      ? (fastFling && totalDistance > 0) || resize.previewWidth >= halfwayWidth
      : !(
          (fastFling && totalDistance < 0) ||
          resize.previewWidth <= halfwayWidth
        );

    if (!shouldExpand) {
      setSidebarWidth(resize.expandedWidthAtStart);
      setSidebarMode(resize.modeAtStart === "hidden" ? "hidden" : "collapsed");
      setPaletteMenu(false);
      setEdgeSidebarOpen(false);
      return;
    }

    setSidebarMode("expanded");
    if (resize.source === "screen") {
      setSidebarWidth(resize.expandedWidthAtStart);
      return;
    }
    commitSidebarWidth(Math.max(SIDEBAR_MIN_WIDTH, resize.previewWidth));
  };

  // Keep the resize alive even when the pointer leaves the narrow handle. The
  // pointer-capture path handles normal interaction; these document listeners
  // make quick drags and releases outside the handle finish predictably too.
  sidebarScreenSwipeStartRef.current = startSidebarScreenSwipe;
  sidebarResizeMoveRef.current = moveSidebarResize;
  sidebarResizeFinishRef.current = endSidebarResize;

  useEffect(() => {
    const startResizeFromHostedPlayer = (event: PointerEvent) => {
      const app = coursesAppRef.current;
      const player = document.querySelector(".learning-workspace__player-wrap");
      if (
        !app ||
        !player ||
        !isFullLearningPlayerSwipeTarget(event.target, event, player)
      )
        return;

      sidebarScreenSwipeStartRef.current?.({
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        clientX: event.clientX,
        clientY: event.clientY,
        timeStamp: event.timeStamp,
        target: event.target,
        handle: app,
        splitX: getLearningPlayerSwipeSplitX(player),
      });
    };
    const continueResize = (event: PointerEvent) =>
      sidebarResizeMoveRef.current?.(event);
    const finishResize = (event: PointerEvent) =>
      sidebarResizeFinishRef.current?.(event);
    const cancelResize = (event: PointerEvent) =>
      sidebarResizeFinishRef.current?.(event, true);
    window.addEventListener("pointerdown", startResizeFromHostedPlayer, true);
    window.addEventListener("pointermove", continueResize, {
      capture: true,
      passive: false,
    });
    window.addEventListener("pointerup", finishResize, true);
    window.addEventListener("pointercancel", cancelResize, true);
    return () => {
      window.removeEventListener(
        "pointerdown",
        startResizeFromHostedPlayer,
        true,
      );
      window.removeEventListener("pointermove", continueResize, true);
      window.removeEventListener("pointerup", finishResize, true);
      window.removeEventListener("pointercancel", cancelResize, true);
    };
  }, []);

  const handleSidebarResizeKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (sidebarCollapsed && event.key === "ArrowRight") {
        setSidebarMode("expanded");
        commitSidebarWidth(SIDEBAR_MIN_WIDTH);
      } else if (sidebarCollapsed && event.key === "ArrowLeft") {
        setSidebarMode("hidden");
        setPaletteMenu(false);
        setEdgeSidebarOpen(false);
      } else if (!sidebarCollapsed) {
        commitSidebarWidth(
          sidebarWidth + (event.key === "ArrowRight" ? 16 : -16),
        );
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      commitSidebarWidth(SIDEBAR_MIN_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      commitSidebarWidth(sidebarMaxWidth);
    }
  };

  const toggleSidebarWidth = () => {
    if (compactNavigation) {
      setEdgeSidebarOpen(false);
      return;
    }
    setSidebarMode((current) =>
      current === "expanded" ? "collapsed" : "expanded",
    );
    setPaletteMenu(false);
    setEdgeSidebarOpen(false);
  };

  const floatSidebar = useCallback(() => {
    setSidebarMode("hidden");
    setPaletteMenu(false);
    setEdgeSidebarOpen(true);
  }, [setPaletteMenu]);

  const sidebarToggleGesture = useSecondPressHold<HTMLButtonElement>({
    onPress: toggleSidebarWidth,
    onSecondPressHold: floatSidebar,
    deferFirstPress: compactNavigation,
    secondPressWindow: compactNavigation ? 700 : undefined,
  });
  const sidebarLogoGesture = useSecondPressHold<HTMLSpanElement>({
    onSecondPressHold: floatSidebar,
  });

  // Two presses on the brand, close together in time and place, float the
  // sidebar (or dock it again). They are counted here, as the pointer is
  // lifted, and not left to the browser's double click, which never came
  // for the logo itself: the logo takes hold of the pointer on a second
  // press (held, that press floats the sidebar too), and a press that is
  // taken hold of ends without a click. So it worked in the gaps around the
  // letters and nowhere on them.
  // The presses are taken on the brand and on the band behind it (see
  // `data-sidebar-brand-zone`), which runs the sidebar's whole width from
  // its top to just under the logo, so there is no need to aim.
  const sidebarBrandTapRef = useRef<{
    x: number;
    y: number;
    at: number;
  } | null>(null);
  const handleSidebarBrandPress = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest(".sidebar-collapse")
    ) {
      sidebarBrandTapRef.current = null;
      return;
    }
    const previous = sidebarBrandTapRef.current;
    const tap = { x: event.clientX, y: event.clientY, at: event.timeStamp };
    if (
      !previous ||
      tap.at - previous.at > SIDEBAR_BRAND_DOUBLE_TAP_MS ||
      Math.hypot(tap.x - previous.x, tap.y - previous.y) >
        SIDEBAR_BRAND_DOUBLE_TAP_DISTANCE
    ) {
      sidebarBrandTapRef.current = tap;
      return;
    }
    sidebarBrandTapRef.current = null;
    const shouldFloat = !sidebarHidden;
    setSidebarMode(shouldFloat ? "hidden" : "expanded");
    setPaletteMenu(false);
    setEdgeSidebarOpen(shouldFloat);
  };

  const preventSidebarBrandTextSelection = (
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    if (
      event.detail > 1 &&
      !(event.target as Element).closest(".sidebar-collapse")
    ) {
      event.preventDefault();
    }
  };

  const mobileNavigation = getMobilePrimaryNavigation(
    effectiveRole,
    navigation,
  );
  const mobileMoreNavigation = getMobileOverflowNavigation(
    navigation,
    mobileNavigation,
  );
  const mobileMoreActive = Boolean(
    activeNavigationSection &&
    mobileMoreNavigation.some(isNavigationItemActive),
  );
  useLayoutEffect(() => {
    if (!mobileMenuOpen) return;
    const nextSnapPoint = isLearningSurface
      ? Math.max(getLearningMobileMenuSnapPoint(), mobileMenuContentSnapPoint)
      : mobileMenuContentSnapPoint;
    setMobileMenuCollapsedSnapPoint(nextSnapPoint);
    setMobileMenuSnapPoint((current) =>
      current === 1 ? current : nextSnapPoint,
    );
  }, [isLearningSurface, mobileMenuOpen, mobileMenuContentSnapPoint]);
  const currentAcademyThemeIndex = academyThemes.findIndex(
    (item) => item.id === academyTheme,
  );

  // The guest home is a nested lazy chunk that normally starts downloading
  // only after the auth check resolves. Fetching it as soon as the home page
  // is active removes that extra network round trip from the first paint of
  // the course rows (the page's LCP) on cold loads.
  useEffect(() => {
    // A browser that was signed in last time shows its own home, not this.
    if (page === "home" && !sessionPresentAtBoot) {
      void guestHomeBody.preload();
    }
  }, [page, sessionPresentAtBoot]);

  // A visitor who arrived on another page is likely to open the home page
  // next. Its code and its courses are fetched once the browser is idle, so
  // it opens complete instead of showing its rows loading.
  useEffect(() => {
    // A browser that was signed in last time has its own home, not this.
    if (sessionPresentAtBoot || isAuthenticated || page === "home") {
      return undefined;
    }
    const warm = () => {
      void guestHomeBody.preload();
      void prefetchGuestHomePage(queryClient);
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, page, queryClient, sessionPresentAtBoot]);

  // The signed-in home used to load strictly in sequence: session check,
  // then its code, then its data, then the dashboard code. Its code can
  // download while the session check is still in flight, and its data can be
  // requested the moment the session is confirmed.
  useEffect(() => {
    if (page !== "home" || !(sessionPresentAtBoot || isAuthenticated)) return;
    if (
      workspaceRoleHint === "creator" ||
      dashboardHomeExpected ||
      effectiveRole === "creator"
    ) {
      void creatorDashboardBody.preload();
      return;
    }
    void import("./home/AuthenticatedHomeBoundary");
    void import("./home/learner/LearnerHome");
  }, [
    dashboardHomeExpected,
    effectiveRole,
    isAuthenticated,
    page,
    sessionPresentAtBoot,
    workspaceRoleHint,
  ]);
  // A layout effect, so that it runs before the home's own queries start
  // (they start from effects of components further down): asked for first,
  // those queries join these requests instead of making their own.
  useLayoutEffect(() => {
    // A remembered session may ask before the session check has answered:
    // this tab was signed in (the rule the catalogue uses), or the browser
    // was the last time it was open. Should the session have ended since,
    // the answer says so, as the session check's own would.
    const sessionExpected =
      isAuthenticated ||
      (!authUserFetched &&
        (authStore.hasSessionHint() || sessionPresentAtBoot));
    if (page !== "home" || !sessionExpected) return;
    if (
      dashboardHomeExpected ||
      effectiveRole === "creator" ||
      // Read here as well: the first pass of a page built ahead of time
      // runs before `homeHint` is given (it matches that page), and would
      // ask for a learner's courses on a dashboard's behalf.
      (!authUserFetched && isDashboardHomeHint(readHomeHint()))
    ) {
      // The dashboard's numbers, asked for beside its code and its
      // permission check instead of after them. Loaded on demand: the
      // module validates its answers, and that library stays out of the
      // code every page starts with.
      void import("./services/analytics").then(({ prefetchDashboard }) =>
        prefetchDashboard(queryClient),
      );
      // Whether the account may see the dashboard is asked with the session
      // check rather than after it, when this tab knows which account it
      // was. The route guard finds the answer waiting.
      if (!authUserFetched && authIdentityHint?.userId) {
        void prefetchCapabilities(queryClient, authIdentityHint.userId);
      }
      return;
    }
    // A learner's courses, their goal summary and their place in the course
    // the home leads with, in one request (see `prefetchLearnerHome`).
    prefetchLearnerHome(queryClient, readPinnedHomeCourseId());
  }, [
    authIdentityHint?.userId,
    authUserFetched,
    dashboardHomeExpected,
    effectiveRole,
    isAuthenticated,
    page,
    queryClient,
    sessionPresentAtBoot,
  ]);

  // Which home this account has is kept for the next time the page is
  // opened (see store/homeHint.ts). The Student view's own answer, whether
  // the learner has courses, is kept by the home that finds it out.
  useEffect(() => {
    if (!isAuthenticated || !isWorkspaceRoleHydrated) return;
    if (effectiveRole !== "creator") {
      if (isDashboardHomeHint(readHomeHint())) rememberHomeHint(null);
      return;
    }
    if (!dashboardCapabilitiesResolved) return;
    rememberHomeHint(
      canAccessDashboard ? (isAdmin ? "admin-dashboard" : "dashboard") : null,
    );
  }, [
    canAccessDashboard,
    dashboardCapabilitiesResolved,
    effectiveRole,
    isAdmin,
    isAuthenticated,
    isWorkspaceRoleHydrated,
  ]);

  const renderPageContent = ({
    surfaceCourseSlug = courseSlug,
    surfaceDiscussionTab = discussionTab,
    surfacePage = page,
    surfaceSection = requestedSection,
    surfaceSettingsTab = settingsTab,
    surfaceUsername = username,
  }: {
    surfaceCourseSlug?: string;
    surfaceDiscussionTab?: string;
    surfacePage?: string;
    surfaceSection?: string | null;
    surfaceSettingsTab?: string;
    surfaceUsername?: string;
  } = {}): ReactNode => {
    const homeIsTheRoute = surfacePage === "home" && page === "home";
    if (
      homeIsTheRoute &&
      (dashboardHomeExpected || effectiveRole === "creator")
    ) {
      // The dashboard, or what stands in for it while the session is
      // checked, the saved view restored, its permission read and its code
      // fetched. All of that is one wait to whoever is watching, so it is
      // one placeholder, and the same element from the first to the last
      // of it: a new one for each step would start its pulse again.
      const dashboardReady =
        effectiveRole === "creator" &&
        !dashboardHomeExpected &&
        !routeContentBlocked;
      return (
        // Keyed, so that it is not taken for the boundary of the home it
        // replaces: React would keep that home in the page, hidden, behind
        // the placeholder, and the frame is laid out by what is in it.
        <Suspense key="dashboard" fallback={<CreatorDashboardSkeleton />}>
          {dashboardReady ? (
            <CreatorDashboard
              onNavigatePage={onNavigatePage}
              academyTheme={appliedAcademyTheme}
              resolvedTheme={resolvedTheme}
            />
          ) : (
            <DashboardOnItsWay />
          )}
        </Suspense>
      );
    }
    if (routeContentHeld) {
      return (
        <AcademyRouteSkeleton
          page={surfacePage}
          role={effectiveRole}
          quizId={quizId}
        />
      );
    }

    const surfaceActiveSection =
      surfaceSection ?? (surfacePage === "courses" ? "Courses" : activeSection);
    if (surfacePage === "public-profile") {
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <PublicProfilePageRoute
            username={surfaceUsername}
            onNavigateBack={showPageBackButton ? onNavigateBack : undefined}
          />
        </Suspense>
      );
    }
    // Before the pages that are chosen by section: opened from another
    // page (a learner's row in Students, say) this one keeps that section.
    if (surfacePage === "progress") {
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="progress" />}>
          <ProgressPage
            username={surfaceUsername}
            onNavigatePage={onNavigatePage}
            onNavigateBack={showPageBackButton ? onNavigateBack : undefined}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (surfacePage === "home" && effectiveRole === "creator") {
      return (
        <Suspense fallback={<CreatorDashboardSkeleton />}>
          <CreatorDashboard
            onNavigatePage={onNavigatePage}
            academyTheme={appliedAcademyTheme}
            resolvedTheme={resolvedTheme}
          />
        </Suspense>
      );
    }
    if (effectiveRole === "student" && surfacePage === "home") {
      const showGuestHomePreview = isAuthReady
        ? !isAuthenticated
        : Boolean(initialGuestHomePage) && showGuestHomeWhilePending;
      const guestHomeCourseCardActions = {
        wishlisted,
        onWishlist: toggleWishlist,
        onOpenCourse,
        courseMenu,
        setCourseMenu,
        setNotice,
      };
      // The home of a learner with no courses: the guest home, greeting
      // them. It can be up before the session has answered (see
      // `learnerWasNotEnrolled`), so the name this tab remembers stands in.
      const newLearnerHome = (
        <GuestHome
          onNavigatePage={onNavigatePage}
          courseCardActions={guestHomeCourseCardActions}
          initialPage={initialGuestHomePage}
          initialCopy={initialGuestHomeCopy}
          learnerName={shellProfileKnownName?.trim() ?? ""}
        />
      );
      // Someone who has just signed in on this page: the guest home they
      // signed in over stays until their own home is ready, so the page
      // swaps once. It stands in from the moment they are signed in, both
      // while the home's code loads and while their courses are on the way;
      // the code's loading state used to be the learner's placeholders, and
      // the page went guest home, placeholders, guest home, their home.
      const justSignedInHome =
        initialGuestHomePage &&
        (showGuestHomeWhilePending ||
          (shownSignedOut && hydratedWorkspaceRoleHint !== "creator")) ? (
          <GuestHome
            onNavigatePage={onNavigatePage}
            courseCardActions={guestHomeCourseCardActions}
            initialPage={initialGuestHomePage}
            initialCopy={initialGuestHomeCopy}
          />
        ) : undefined;
      // The guest home's hero picture is the page's largest paint. Emitting
      // its preload here (not inside the lazy GuestHome) places it in the
      // prerendered document head, so the browser starts the download before
      // hydration instead of after the auth check. One link per art-directed
      // source, matching the hero's <picture>.
      return (
        <LearnerHomeContent
          showGuestHomePreview={showGuestHomePreview}
          isAuthReady={isAuthReady}
          onNavigatePage={onNavigatePage}
          guestHomeCourseCardActions={guestHomeCourseCardActions}
          initialGuestHomePage={initialGuestHomePage}
          initialGuestHomeCopy={initialGuestHomeCopy}
          showGuestHomeWhilePending={showGuestHomeWhilePending}
          learnerWasNotEnrolled={learnerWasNotEnrolled}
          newLearnerHome={newLearnerHome}
          justSignedInHome={justSignedInHome}
          shellProfileKnownName={shellProfileKnownName}
          onOpenCourse={onOpenCourse}
        />
      );
    }
    if (surfacePage === "settings") {
      return (
        <Suspense fallback={null}>
          <SettingsPage
            tab={surfaceSettingsTab}
            role={role}
            userRoles={userRoles}
            isAuthenticated={isAuthenticated}
            isAuthReady={isAuthReady}
            onNavigatePage={onNavigatePage}
            onExitSettings={onExitSettings}
            showBackButton={showPageBackButton}
            theme={theme}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => void toggleFullscreen()}
            onThemeChange={(next, origin) => {
              if (next !== theme) themeRevealOriginRef.current = origin ?? null;
              setTheme(next);
            }}
            academyTheme={appliedAcademyTheme}
            onAcademyThemeChange={changePalette}
            pageTabColors={pageTabColors}
            onPageTabColorsChange={setPageTabColors}
            sidebarPreferences={sidebarPreferences}
            onSidebarPreferencesChange={setSidebarPreferences}
            sidebarMode={renderedSidebarMode}
            onSidebarModeChange={setSidebarMode}
            sidebarWidthIsDefault={sidebarWidth === SIDEBAR_DEFAULT_WIDTH}
            onSidebarWidthReset={resetSidebarWidth}
          />
        </Suspense>
      );
    }
    if (surfacePage === "workspace") {
      return (
        <Suspense
          fallback={
            surfaceActiveSection === "Discussions" ? null : (
              <AcademyPageFallback />
            )
          }
        >
          <WorkspacePage
            section={surfaceActiveSection}
            role={role}
            discussionTab={surfaceDiscussionTab}
            sessionPending={discussionsWhileSessionPending}
            onNavigatePage={onNavigatePage}
            setNotice={setNotice}
            onSignOut={() => {
              localStorage.removeItem(
                getWorkspaceRoleStorageKey(activeUser?.id),
              );
              setRole("student");
            }}
          />
        </Suspense>
      );
    }
    if (surfacePage === "course-create") {
      return (
        <Suspense fallback={<CourseEditorRouteFallback />}>
          <CourseCreatePage
            onNavigatePage={onNavigatePage}
            bottomNavHidden={mobileBottomNavHidden}
          />
        </Suspense>
      );
    }
    if (surfacePage === "course-overview") {
      return (
        <Suspense fallback={null}>
          {/* The course page is built into the document. As for the
              catalogue and the guest home, the document preloads the page's
              code and links its stylesheets, so the built page is kept
              through hydration and is styled from its first paint. */}
          <link
            rel="modulepreload"
            href={COURSE_OVERVIEW_CHUNK_URL_PLACEHOLDER}
          />
          {COURSE_OVERVIEW_JS_URLS.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <ChunkStylesheets hrefs={COURSE_OVERVIEW_CSS_URLS} />
          <CourseOverviewPage
            courseSlug={surfaceCourseSlug}
            initialOverview={initialCourseOverview}
            onNavigateCourses={
              onNavigateBack ?? (() => onNavigatePage("/courses"))
            }
            backSection={onNavigateBack ? navigateBackSection : "Courses"}
            onNavigatePage={onNavigatePage}
            role={role}
            // The page is the same for everyone but for three parts, which
            // hold their places until these have answered (see
            // `courseViewerState`): the session, and for someone signed in
            // the view they are in.
            viewerSettled={
              isAuthReady && (!isAuthenticated || isWorkspaceRoleHydrated)
            }
            presumeGuest={!isAuthReady && !sessionPresentAtBoot}
          />
        </Suspense>
      );
    }
    if (surfacePage === "reviews" || surfaceActiveSection === "Reviews") {
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <ReviewsPage onNavigatePage={onNavigatePage} setNotice={setNotice} />
        </Suspense>
      );
    }
    if (surfacePage === "coupon-builder") {
      if (!isAuthReady) {
        return (
          <main
            data-coupon-surface=""
            className="mx-auto w-full max-w-[1320px]"
          >
            <CenteredLoadingSpinner
              label="Loading coupon builder"
              className="min-h-52 py-24"
            />
          </main>
        );
      }
      if (!activeUser || !isStaffRole(userRoles)) {
        return (
          <Suspense fallback={<AcademyPageFallback />}>
            <CouponsAccessDenied onNavigatePage={onNavigatePage} />
          </Suspense>
        );
      }
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <CouponBuilderPage
            couponId={couponId}
            onNavigatePage={onNavigatePage}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (surfacePage === "home-page-settings") {
      if (!isAuthReady) return <AcademyPageFallback />;
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <HomePageSettingsPage
            canManage={Boolean(activeUser) && isAdmin}
            onNavigatePage={onNavigatePage}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (surfacePage === "coupons" || surfaceActiveSection === "Coupons") {
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="coupons" />}>
          <CouponsPage onNavigatePage={onNavigatePage} setNotice={setNotice} />
        </Suspense>
      );
    }
    if (surfacePage === "orders" || surfaceActiveSection === "Orders") {
      return (
        <Suspense
          fallback={
            <div
              className="grid min-h-52 place-items-center"
              aria-label="Loading orders"
            >
              <CircleNotch size={26} className="animate-spin text-(--accent)" />
            </div>
          }
        >
          <OrdersPageRoute
            onNavigatePage={onNavigatePage}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (
      surfacePage === "purchase-history" ||
      surfaceActiveSection === "Purchase History"
    ) {
      return (
        <Suspense
          fallback={
            <div
              className="grid min-h-52 place-items-center"
              aria-label="Loading order history"
            >
              <CircleNotch size={26} className="animate-spin text-(--accent)" />
            </div>
          }
        >
          <OrderHistoryPageRoute
            onNavigatePage={onNavigatePage}
            onNavigateBack={onNavigateBack}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (
      surfacePage === "notifications" ||
      surfaceActiveSection === "Notifications" ||
      surfaceActiveSection === "Notification"
    ) {
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <NotificationsPage
            onNavigatePage={onNavigatePage}
            onNavigateBack={onNavigateBack}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (surfacePage === "quiz-builder") {
      if (effectiveRole !== "creator") {
        return null;
      }
      return (
        <Suspense
          fallback={
            <AcademyRouteSkeleton page="quiz-builder" quizId={quizId} />
          }
        >
          <QuizBuilderPage quizId={quizId} onNavigatePage={onNavigatePage} />
        </Suspense>
      );
    }
    if (surfacePage === "quiz-attempt") {
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <QuizDirectAttemptPage
            assignmentId={assignmentId}
            onNavigatePage={onNavigatePage}
          />
        </Suspense>
      );
    }
    if (surfacePage === "quizzes") {
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="quizzes" />}>
          <QuizAnalyticsPage role={role} onNavigatePage={onNavigatePage} />
        </Suspense>
      );
    }
    if (surfacePage === "student-details") {
      if (effectiveRole !== "creator") {
        return null;
      }
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="student-details" />}>
          <StudentDetailsPage
            username={surfaceUsername}
            onNavigatePage={onNavigatePage}
            setNotice={setNotice}
          />
        </Suspense>
      );
    }
    if (surfacePage === "students" || surfaceActiveSection === "Students") {
      if (effectiveRole !== "creator") {
        return null;
      }
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="students" />}>
          <StudentsPage onNavigatePage={onNavigatePage} setNotice={setNotice} />
        </Suspense>
      );
    }
    if (surfacePage === "analytics" || surfaceActiveSection === "Analytics") {
      if (effectiveRole !== "creator") {
        return null;
      }
      return (
        <Suspense fallback={<AcademyRouteSkeleton page="analytics" />}>
          <AnalyticsDashboardPage
            role={role}
            isAdmin={isAdmin}
            onNavigatePage={onNavigatePage}
          />
        </Suspense>
      );
    }
    if (surfacePage === "placeholder") {
      return (
        <Suspense fallback={<AcademyPageFallback />}>
          <PlaceholderPage
            section={surfaceActiveSection}
            role={role}
            userRoles={userRoles}
          />
        </Suspense>
      );
    }
    return (
      <CourseCatalogueContent
        effectiveRole={effectiveRole}
        surfaceActiveSection={surfaceActiveSection}
        isAdmin={isAdmin}
        activeUser={activeUser}
        authUserFetched={authUserFetched}
        isLoadingCourses={isLoadingCourses}
        isCourseCatalogueLoadError={isCourseCatalogueLoadError}
        needsCompleteCourseList={needsCompleteCourseList}
        completeCourseQuery={completeCourseQuery}
        pagedCourseQuery={pagedCourseQuery}
        enrollmentFilter={enrollmentFilter}
        deletedCoursesQuery={deletedCoursesQuery}
        myCoursesQuery={myCoursesQuery}
        initialPublishedCoursePage={initialPublishedCoursePage}
        wishlisted={wishlisted}
        quickFilterCounts={quickFilterCounts}
        handleEnrollmentFilterChange={handleEnrollmentFilterChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        visibleCourses={visibleCourses}
        totalCoursesCount={totalCoursesCount}
        toggleWishlist={toggleWishlist}
        onOpenCourse={onOpenCourse}
        prepareCourseEditorEdit={prepareCourseEditorEdit}
        courseMenu={courseMenu}
        setCourseMenu={setCourseMenu}
        setNotice={setNotice}
        onNavigatePage={onNavigatePage}
        resetCatalogue={resetCatalogue}
        handleDeleteCourse={handleDeleteCourse}
        handleRestoreCourse={handleRestoreCourse}
        deletingCourseIds={deletingCourseIds}
      />
    );
  };

  return (
    <div
      ref={coursesAppRef}
      className={sidebarClassName}
      onPointerDownCapture={(event) =>
        startSidebarScreenSwipe({
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
      style={
        {
          "--sidebar-resize-preview-width": `${sidebarResizePreviewWidth ?? SIDEBAR_COLLAPSED_WIDTH}px`,
          "--sidebar-overlay-swipe-offset": `${sidebarOverlaySwipeOffset ?? 0}px`,
        } as CSSProperties
      }
    >
      {sidebarAvailable && (
        <>
          {sidebarPresentedAsOverlay && (
            <div
              className="sidebar-edge-trigger"
              aria-hidden="true"
              onPointerEnter={() => setEdgeSidebarOpen(true)}
            />
          )}
          <aside
            className="courses-sidebar touch-pan-y"
            data-header-layout={sidebarHeaderLayout}
            aria-label={`${effectiveRole === "creator" ? "Creator" : "Student"} navigation`}
            aria-hidden={
              sidebarPresentedAsOverlay && !edgeSidebarOpen ? "true" : undefined
            }
            inert={
              sidebarPresentedAsOverlay && !edgeSidebarOpen ? true : undefined
            }
            onPointerEnter={() =>
              sidebarPresentedAsOverlay && setEdgeSidebarOpen(true)
            }
            onPointerLeave={() =>
              sidebarPresentedAsOverlay &&
              !coarseNavigationInput &&
              setEdgeSidebarOpen(false)
            }
            onFocusCapture={() =>
              sidebarPresentedAsOverlay && setEdgeSidebarOpen(true)
            }
            onClickCapture={(event) => {
              if (!sidebarOverlaySwipeConsumedRef.current) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            {...emptyAreaDoubleTapHandlers}
          >
            {/* The background shapes: the inner box draws them, the outer
                one blurs and fades them (see navigation.css). */}
            <span className="courses-sidebar__bokeh" aria-hidden="true">
              <span />
            </span>
            <SidebarResizeHandle
              compactNavigation={compactNavigation}
              sidebarPresentedAsOverlay={sidebarPresentedAsOverlay}
              edgeSidebarOpen={edgeSidebarOpen}
              sidebarControlKey={sidebarControlKey}
              primaryShortcutModifier={primaryShortcutModifier}
              showKeyboardShortcuts={showKeyboardShortcuts}
              sidebarShortcutTitle={sidebarShortcutTitle}
              sidebarMaxWidth={sidebarMaxWidth}
              sidebarResizePreviewWidth={sidebarResizePreviewWidth}
              renderedSidebarWidth={renderedSidebarWidth}
              sidebarCollapsed={sidebarCollapsed}
              handleSidebarResizeKeyDown={handleSidebarResizeKeyDown}
              toggleSidebarWidth={toggleSidebarWidth}
              dismissSidebarTooltipImmediately={
                dismissSidebarTooltipImmediately
              }
              startSidebarResize={startSidebarResize}
              moveSidebarResize={moveSidebarResize}
              endSidebarResize={endSidebarResize}
              sidebarResizeRef={sidebarResizeRef}
            />
            {/* The band the brand stands in, behind everything else in the
                sidebar: a press beside, above or just under the logo counts
                as one on it. */}
            <span
              aria-hidden="true"
              data-sidebar-brand-zone=""
              data-double-tap-ignore
              className="absolute inset-x-0 top-0 -z-10 h-14"
              onMouseDown={preventSidebarBrandTextSelection}
              onPointerUp={handleSidebarBrandPress}
            />
            <SidebarBrand
              sidebarBrandTitle={sidebarBrandTitle}
              preventSidebarBrandTextSelection={
                preventSidebarBrandTextSelection
              }
              handleSidebarBrandPress={handleSidebarBrandPress}
              sidebarLogoGesture={sidebarLogoGesture}
              sidebarControlKey={sidebarControlKey}
              sidebarControlAction={sidebarControlAction}
              compactNavigation={compactNavigation}
              sidebarCollapsed={sidebarCollapsed}
              primaryShortcutModifier={primaryShortcutModifier}
              sidebarControlTitle={sidebarControlTitle}
              sidebarToggleGesture={sidebarToggleGesture}
              sidebarVisuallyCollapsed={sidebarVisuallyCollapsed}
              sidebarPresentedAsOverlay={sidebarPresentedAsOverlay}
              sidebarDraggedToCollapsedWidth={sidebarDraggedToCollapsedWidth}
            />

            <SidebarNavigation
              navigationScrollFade={navigationScrollFade}
              navigationRef={navigationRef}
              setSidebarTooltip={setSidebarTooltip}
              updateNavigationScrollFade={updateNavigationScrollFade}
              navigation={navigation}
              isNavigationItemActive={isNavigationItemActive}
              sidebarPreferences={sidebarPreferences}
              primaryShortcutModifier={primaryShortcutModifier}
              selectNavigation={selectNavigation}
              navigationUsesCompactInteraction={
                navigationUsesCompactInteraction
              }
              showSidebarTooltip={showSidebarTooltip}
              hideCollapsedNavigationTooltip={hideCollapsedNavigationTooltip}
              showKeyboardShortcuts={showKeyboardShortcuts}
              settingsShortcutKeys={settingsShortcutKeys}
              sidebarResizing={sidebarResizing}
              sidebarResizePreviewWidth={sidebarResizePreviewWidth}
              renderedSidebarWidth={renderedSidebarWidth}
            />

            <div className="courses-profile" ref={profileRef}>
              <SidebarProfileMenuLayer
                isAuthenticated={isAuthenticated}
                profileMenuSurfaceMounted={profileMenuSurfaceMounted}
                profileMenu={profileMenu}
                effectiveRole={effectiveRole}
                allowedWorkspaceRoles={allowedWorkspaceRoles}
                userRoles={userRoles}
                activeUser={activeUser}
                shellProfileDisplayName={shellProfileDisplayName}
                shellProfileAvatarUrl={shellProfileAvatarUrl}
                shellProfileAvatarSrcSet={shellProfileAvatarSrcSet}
                unreadNotificationCount={unreadNotificationCount}
                sidebarPresentedAsOverlay={sidebarPresentedAsOverlay}
                compactNavigation={compactNavigation}
                setProfileMenu={setProfileMenu}
                setRole={setRole}
                setEdgeSidebarOpen={setEdgeSidebarOpen}
                dismissProfileMenuThen={dismissProfileMenuThen}
                dismissMobileMenuThen={dismissMobileMenuThen}
                onNavigatePage={onNavigatePage}
                setSidebarMode={setSidebarMode}
                sidebarHidden={sidebarHidden}
                openLogoutConfirm={openLogoutConfirm}
              />
              <SidebarProfileButton
                isAuthenticated={isAuthenticated}
                shellProfileDisplayName={shellProfileDisplayName}
                shellProfileSubtitle={shellProfileSubtitle}
                profileMenu={profileMenu}
                profileMenuSurfaceMounted={profileMenuSurfaceMounted}
                setProfileMenuSurfaceMounted={setProfileMenuSurfaceMounted}
                setPendingProfileMenuOpen={setPendingProfileMenuOpen}
                setProfileMenu={setProfileMenu}
                shellProfileAvatarUrl={shellProfileAvatarUrl}
                shellProfileAvatarSrcSet={shellProfileAvatarSrcSet}
                unreadNotificationCount={unreadNotificationCount}
                canSwitchWorkspace={canSwitchWorkspace}
                ProfileSubtitleIcon={ProfileSubtitleIcon}
                effectiveRole={effectiveRole}
                userRoles={userRoles}
                accountStatusUnknown={accountStatusUnknown}
                authUserFetched={authUserFetched}
                authIdentityHint={authIdentityHint}
                onNavigatePage={onNavigatePage}
              />
              <SidebarAppearanceDock
                appearanceControlsRef={appearanceControlsRef}
                appearanceControlsHorizontal={appearanceControlsHorizontal}
                sidebarPreferences={sidebarPreferences}
                readingModeDockIndex={readingModeDockIndex}
                paletteMenuDockIndex={paletteMenuDockIndex}
                sidebarDockItems={sidebarDockItems}
                appearanceModeTriggerRef={appearanceModeTriggerRef}
                paletteMenu={paletteMenu}
                paletteMenuSource={paletteMenuSource}
                consumeAppearanceGestureClick={consumeAppearanceGestureClick}
                cancelDesktopPalettePreview={cancelDesktopPalettePreview}
                activateAppearanceOption={activateAppearanceOption}
                openAppearanceThemeMenu={openAppearanceThemeMenu}
                startDockLongPress={startDockLongPress}
                moveDockLongPress={moveDockLongPress}
                finishDockLongPress={finishDockLongPress}
                paletteTriggerRef={paletteTriggerRef}
                setReadingModeMenu={setReadingModeMenu}
                setPaletteMenuSource={setPaletteMenuSource}
                setPaletteMenu={setPaletteMenu}
                startAppearanceSwipe={startAppearanceSwipe}
                finishAppearanceSwipe={finishAppearanceSwipe}
                cancelAppearanceSwipe={cancelAppearanceSwipe}
                displayedAcademyTheme={displayedAcademyTheme}
                readingModeEnabled={readingModeEnabled}
                readingModeMenu={readingModeMenu}
                showReadingModeMenu={showReadingModeMenu}
                openReadingModeMenu={openReadingModeMenu}
                page={page}
                learningOriginPage={learningOriginPage}
                settingsControlTitle={settingsControlTitle}
                primaryShortcutModifier={primaryShortcutModifier}
                settingsQuickMenu={settingsQuickMenu}
                toggleSettingsNavigation={toggleSettingsNavigation}
                openSettingsQuickMenu={openSettingsQuickMenu}
                showSettingsQuickMenu={showSettingsQuickMenu}
                isFullscreen={isFullscreen}
                fullscreenActionLabel={fullscreenActionLabel}
                toggleFullscreen={toggleFullscreen}
                sidebarCollapsed={sidebarCollapsed}
                readingModePreferences={readingModePreferences}
                updateReadingMode={updateReadingMode}
                changePalette={changePalette}
                previewAcademyTheme={previewAcademyTheme}
                confirmDesktopPaletteTheme={confirmDesktopPaletteTheme}
                resolvedTheme={resolvedTheme}
                changeAppearanceMode={changeAppearanceMode}
              />
              {settingsQuickMenuLoaded && (
                <Suspense fallback={null}>
                  <SettingsQuickMenu
                    id="desktop-settings-quick-menu"
                    isOpen={settingsQuickMenu === "desktop"}
                    activeTab={
                      page === "settings"
                        ? normalizeSettingsTab(settingsTab)
                        : null
                    }
                    onNavigate={navigateSettingsQuickMenu}
                    showSignedInTabs={isAuthenticated}
                  />
                </Suspense>
              )}
            </div>
          </aside>
        </>
      )}

      {sidebarTooltip && (
        <div
          className={`sidebar-nav-tooltip${sidebarTooltip.active ? " is-active" : ""}${sidebarTooltip.focusVisible ? " is-focus-visible" : ""}${sidebarTooltip.preferenceControlled ? " is-preference-controlled" : ""}`}
          aria-hidden="true"
          style={
            {
              "--sidebar-tooltip-top": `${sidebarTooltip.top}px`,
              "--sidebar-tooltip-left": `${sidebarTooltip.left}px`,
            } as CSSProperties
          }
        >
          <SidebarTooltipSurface />
          <span className="sidebar-nav-tooltip__body">
            <span className="sidebar-nav-tooltip__label">
              {sidebarTooltip.label}
            </span>
          </span>
        </div>
      )}

      <ShellDragSurface />
      <ShellMainFrame
        mainScrollportRef={mainScrollportRef}
        onDeepGround={onDeepGround}
        renderMain={renderMain}
        page={page}
        mobileSidebarNavigationActive={mobileSidebarNavigationActive}
        cataloguePathname={cataloguePathname}
        learningMotionStageRef={learningMotionStageRef}
        keepLessonPageBoxes={keepLessonPageBoxes}
        routeContentBlocked={routeContentBlocked}
        effectiveRole={effectiveRole}
        quizId={quizId}
        learningBackground={learningBackground}
        renderPageContent={renderPageContent}
        routeContentHeld={routeContentHeld}
        compactNavigation={compactNavigation}
        mobileBottomNavHidden={mobileBottomNavHidden}
      />

      <FloatingScrollbar
        scrollportRef={mainScrollportRef}
        className={renderMain ? "floating-scrollbar--learning-page" : undefined}
        rightEdgeSelector={
          renderMain ? ".learning-workspace__lesson-column" : undefined
        }
        enableHorizontalDrag={Boolean(renderMain)}
      />

      {compactNavigation && !mobileSidebarNavigationActive && (
        <MobileBottomNavigation
          mobileBottomNavRef={mobileBottomNavRef}
          mobileBottomNavHidden={mobileBottomNavHidden}
          effectiveRole={effectiveRole}
          setMobileBottomNavHidden={setMobileBottomNavHidden}
          mobileNavigation={mobileNavigation}
          isNavigationItemActive={isNavigationItemActive}
          sidebarPreferences={sidebarPreferences}
          selectNavigation={selectNavigation}
          mobileMoreRef={mobileMoreRef}
          mobileMoreActive={mobileMoreActive}
          mobileMenuOpen={mobileMenuOpen}
          openMobileNavigationMenu={openMobileNavigationMenu}
          shellProfileAvatarUrl={shellProfileAvatarUrl}
          shellProfileAvatarSrcSet={shellProfileAvatarSrcSet}
          isAuthenticated={isAuthenticated}
          unreadNotificationCount={unreadNotificationCount}
        />
      )}

      {mobileNavigationSheetMounted ? (
        <Suspense fallback={null}>
          <Drawer
            open={mobileMenuOpen}
            dismissThenRef={mobileMenuDismissThenRef}
            onOpenChange={(open) => {
              if (open) setMobileMenuOpen(true);
              else closeMobileMenu();
            }}
            onOpenChangeComplete={(open) => {
              if (!open) setMobileMenuSnapPoint(mobileMenuCollapsedSnapPoint);
            }}
            snapPoints={mobileMenuSnapPoints}
            snapPoint={mobileMenuSnapPoint}
            onSnapPointChange={setMobileMenuSnapPoint}
            snapToSequentialPoints
            showSwipeHandle
            triggerId="mobile-navigation-trigger"
          >
            <DrawerContent
              ref={mobileSheetSizeRef}
              id="mobile-navigation-sheet"
              aria-labelledby="mobile-navigation-title"
              aria-describedby="mobile-navigation-description"
              initialFocus={mobileSheetRef}
              finalFocus={mobileMoreRef}
              tabIndex={-1}
              className="mobile-menu-sheet [--mobile-menu-sheet-top-space:3px] data-expanded:rounded-none data-[swipe-axis=y]:[--drawer-content-max-height:100dvh] rounded-t-[22px] px-3 pb-[max(14px,var(--app-safe-area-bottom))]"
              floatingContent={
                <>
                  {mobilePaletteMenu && (
                    <AcademyPaletteMenu
                      themes={academyThemes}
                      selectedTheme={displayedAcademyTheme}
                      id="mobile-theme-menu"
                      className="sidebar-palette-menu mobile-palette-menu absolute! right-auto bottom-[calc(68px_+_var(--app-viewport-safe-area-bottom))] left-3 z-[190]! w-[min(216px,calc(100vw_-_24px))]! max-h-[calc(100dvh_-_92px_-_env(safe-area-inset-top))] overflow-y-auto"
                      mobile
                      onSelect={changePalette}
                      onPreview={previewAcademyTheme}
                      onConfirm={confirmMobilePaletteTheme}
                      onCancel={cancelMobilePalettePreview}
                      appearanceMode={resolvedTheme}
                      onAppearanceModeChange={changeAppearanceMode}
                    />
                  )}
                  {settingsQuickMenuLoaded && (
                    <Suspense fallback={null}>
                      <SettingsQuickMenu
                        id="mobile-settings-quick-menu"
                        className="settings-quick-menu--mobile absolute! right-3 bottom-[calc(68px_+_var(--app-viewport-safe-area-bottom))] left-auto z-[190]! w-[min(250px,calc(100vw_-_24px))]! min-w-[min(200px,calc(100vw_-_24px))]! max-h-[calc(100dvh_-_92px_-_env(safe-area-inset-top))] overflow-y-auto"
                        isOpen={settingsQuickMenu === "mobile"}
                        activeTab={
                          page === "settings"
                            ? normalizeSettingsTab(settingsTab)
                            : null
                        }
                        onNavigate={navigateSettingsQuickMenu}
                        showSignedInTabs={isAuthenticated}
                      />
                    </Suspense>
                  )}
                  {readingModeMenu === "mobile" && (
                    <Suspense fallback={null}>
                      <ReadingModeQuickMenu
                        id="mobile-reading-mode-quick-settings"
                        className="reading-mode-quick-menu--mobile"
                        preferences={readingModePreferences}
                        onChange={updateReadingMode}
                      />
                    </Suspense>
                  )}
                </>
              }
              data-sidebar-swipe-ignore
              onPointerDownCapture={(event) => {
                if (
                  mobilePaletteMenu &&
                  (!(event.target instanceof Element) ||
                    (!event.target.closest("[data-mobile-palette-menu]") &&
                      !event.target.closest("[data-mobile-palette-trigger]")))
                )
                  setMobilePaletteMenu(false);
              }}
            >
              <div
                className="mobile-menu-sheet__body"
                {...emptyAreaDoubleTapHandlers}
              >
                <DrawerTitle id="mobile-navigation-title" className="sr-only">
                  Profile and navigation
                </DrawerTitle>
                <DrawerDescription
                  id="mobile-navigation-description"
                  className="sr-only"
                >
                  Profile actions, additional navigation, and appearance
                  controls
                </DrawerDescription>
                <MobileSheetProfile
                  isAuthenticated={isAuthenticated}
                  activeUser={activeUser}
                  shellProfileDisplayName={shellProfileDisplayName}
                  shellProfileAvatarUrl={shellProfileAvatarUrl}
                  shellProfileAvatarSrcSet={shellProfileAvatarSrcSet}
                  unreadNotificationCount={unreadNotificationCount}
                  setProfileMenu={setProfileMenu}
                  setEdgeSidebarOpen={setEdgeSidebarOpen}
                  dismissProfileMenuThen={dismissProfileMenuThen}
                  dismissMobileMenuThen={dismissMobileMenuThen}
                  onNavigatePage={onNavigatePage}
                  accountStatusUnknown={accountStatusUnknown}
                  authUserFetched={authUserFetched}
                  authIdentityHint={authIdentityHint}
                />
                <MobileSheetProfileMenu
                  isAuthenticated={isAuthenticated}
                  effectiveRole={effectiveRole}
                  allowedWorkspaceRoles={allowedWorkspaceRoles}
                  userRoles={userRoles}
                  unreadNotificationCount={unreadNotificationCount}
                  mobileMoreNavigation={mobileMoreNavigation}
                  isNavigationItemActive={isNavigationItemActive}
                  sidebarPreferences={sidebarPreferences}
                  selectNavigation={selectNavigation}
                  setProfileMenu={setProfileMenu}
                  setRole={setRole}
                  setEdgeSidebarOpen={setEdgeSidebarOpen}
                  dismissProfileMenuThen={dismissProfileMenuThen}
                  dismissMobileMenuThen={dismissMobileMenuThen}
                  onNavigatePage={onNavigatePage}
                  closeMobileMenu={closeMobileMenu}
                  setLogoutConfirmOpen={setLogoutConfirmOpen}
                />
                <MobileSheetAppearance
                  mobilePaletteMenu={mobilePaletteMenu}
                  sidebarDockItems={sidebarDockItems}
                  mobileAppearanceModeTriggerRef={
                    mobileAppearanceModeTriggerRef
                  }
                  paletteMenuSource={paletteMenuSource}
                  consumeAppearanceGestureClick={consumeAppearanceGestureClick}
                  cancelMobilePalettePreview={cancelMobilePalettePreview}
                  activateAppearanceOption={activateAppearanceOption}
                  openAppearanceThemeMenu={openAppearanceThemeMenu}
                  startDockLongPress={startDockLongPress}
                  moveDockLongPress={moveDockLongPress}
                  finishDockLongPress={finishDockLongPress}
                  mobilePaletteTriggerRef={mobilePaletteTriggerRef}
                  currentAcademyThemeIndex={currentAcademyThemeIndex}
                  setReadingModeMenu={setReadingModeMenu}
                  setPaletteMenuSource={setPaletteMenuSource}
                  setMobilePaletteMenu={setMobilePaletteMenu}
                  startAppearanceSwipe={startAppearanceSwipe}
                  finishAppearanceSwipe={finishAppearanceSwipe}
                  cancelAppearanceSwipe={cancelAppearanceSwipe}
                  displayedAcademyTheme={displayedAcademyTheme}
                  readingModeEnabled={readingModeEnabled}
                  readingModeMenu={readingModeMenu}
                  showReadingModeMenu={showReadingModeMenu}
                  openReadingModeMenu={openReadingModeMenu}
                  page={page}
                  learningOriginPage={learningOriginPage}
                  sidebarPreferences={sidebarPreferences}
                  settingsControlTitle={settingsControlTitle}
                  primaryShortcutModifier={primaryShortcutModifier}
                  settingsQuickMenu={settingsQuickMenu}
                  toggleSettingsNavigation={toggleSettingsNavigation}
                  openSettingsQuickMenu={openSettingsQuickMenu}
                  showSettingsQuickMenu={showSettingsQuickMenu}
                  isFullscreen={isFullscreen}
                  fullscreenActionLabel={fullscreenActionLabel}
                  toggleFullscreen={toggleFullscreen}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </Suspense>
      ) : null}

      {logoutModalMounted ? (
        <Suspense fallback={null}>
          <LogoutConfirmModal
            isOpen={logoutConfirmOpen}
            isPending={isSigningOut}
            onClose={() => setLogoutConfirmOpen(false)}
            onConfirm={() => void signOutAfterSync()}
          />
        </Suspense>
      ) : null}

      {notice && (
        <ToastNotification
          message={notice}
          type="info"
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* The Settings route's own module and the stylesheets it links,
          asked for ahead of the visit (see the warm-up effect). React puts
          these in the document's head. */}
      {settingsWarmed ? <PrefetchPageLinks page="/settings" /> : null}

      {/* Last, where the shell's `::after` overlay draws it on mouse
          devices: above everything else that shares its level. */}
      <FrameEdge surface="shell" />
    </div>
  );
}
