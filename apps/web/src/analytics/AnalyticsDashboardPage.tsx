import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { DownloadSimpleIcon as DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { ArrowCounterClockwiseIcon as ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { LoadingTab, downloadCsv } from "@veolms/analytics-ui";
import type {
  AnalyticsExportSection,
  AnalyticsTabContribution,
  AnalyticsTabFilters,
} from "@veolms/web-core";
import { handleRovingTabKeyDown } from "../accessibility/rovingTabFocus";
import { elevatedCardTokenScopeClasses } from "../components/ElevatedCard";
import { PageHeading } from "../components/PageHeading";
import { SwipeableTabPanel } from "../navigation/SwipeableTabPanel";
import type { NavigateTo } from "../routing/navigation";
import { ThemedSelect, type ThemedSelectOption } from "../ThemedSelect";
import { useWebContributions } from "../lib/web-contributions";
import { useMyCourses } from "../services/courses";
import { SettingsTabBar } from "../settings/SettingsTabBar";
import type { PageTabDefinition } from "../settings/settingsTabs";
import { useSettingsTabShortcuts } from "../settings/useSettingsTabShortcuts";
import { selectTriggerClass } from "./analyticsShared";
import { CORE_ANALYTICS_TABS } from "./analyticsTabs";
import "../styles/features/settings/foundation.css";
import "../styles/features/settings/preferences-responsive.css";

interface Props {
  role: "student" | "creator";
  isAdmin: boolean;
  /** The section from the path (`/analytics/<tab>`); the overview without one. */
  tab?: string;
  onNavigatePage?: NavigateTo;
}

type RangeKey = AnalyticsTabFilters["rangeKey"];

const RANGE_OPTIONS: ReadonlyArray<{
  key: RangeKey;
  label: string;
  days: number;
}> = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
];
const DEFAULT_RANGE: RangeKey = "30d";
const DEFAULT_TAB = "overview";
const ANALYTICS_PATH = "/analytics";

/** `/analytics` for the overview, `/analytics/<tab>` for any other section. */
export function analyticsTabPath(tabId: string): string {
  return tabId === DEFAULT_TAB ? ANALYTICS_PATH : `${ANALYTICS_PATH}/${tabId}`;
}

function isRangeKey(value: string | null): value is RangeKey {
  return RANGE_OPTIONS.some((option) => option.key === value);
}

function useDateRangeParams(rangeKey: RangeKey) {
  return useMemo(() => {
    const option = RANGE_OPTIONS.find(
      (candidate) => candidate.key === rangeKey,
    )!;
    // Through the end of today (UTC), so the range is the same for every
    // request made today. With "now" to the millisecond no two requests
    // matched: the server's response cache never hit, and this page
    // refetched everything each time it was opened.
    const to = new Date();
    to.setUTCHours(24, 0, 0, 0);
    const from = new Date(to.getTime() - option.days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [rangeKey]);
}

function DateRangeTabs({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className="flex gap-1 sm:gap-1.5 rounded-[12px] sm:rounded-[14px] border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_80%,var(--surface))] p-1 sm:p-1.5"
    >
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          tabIndex={value === option.key ? 0 : -1}
          onClick={() => onChange(option.key)}
          onKeyDown={handleRovingTabKeyDown}
          className={`rounded-[8px] sm:rounded-[10px] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            value === option.key
              ? "bg-(--card-surface,var(--surface)) text-(--text) shadow-[var(--card-compact-shadow)]"
              : "text-(--muted) hover:text-(--text) hover:bg-[color-mix(in_srgb,var(--text)_5%,transparent)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 sm:h-10 shrink-0 items-center gap-2 rounded-[9px] sm:rounded-[10px] px-3 sm:px-3.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 ${
        primary
          ? "bg-(--accent) text-(--on-accent) hover:bg-(--accent-hover)"
          : "border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_75%,var(--surface))] text-(--text) hover:bg-[color-mix(in_srgb,var(--text)_5%,var(--surface))]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: "Track your academy's performance with actionable insights.",
  revenue: "Dive deep into your academy's revenue performance.",
  courses: "Measure how your courses and content drive learning outcomes.",
};

const noop = () => {};

/**
 * The analytics page, laid out like Settings: the heading scrolls away, the
 * section tabs stay pinned (same bar, same colours, same Alt+1… and arrow
 * shortcuts, same swipe between sections on touch), and the filters and
 * the open section scroll under them.
 */
function AnalyticsContent({
  isAdmin,
  tab,
  onNavigatePage,
}: {
  isAdmin: boolean;
  tab: string | undefined;
  onNavigatePage: NavigateTo | undefined;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const contributions = useWebContributions();
  const tabListRef = useRef<HTMLElement>(null);

  const tabs = useMemo(() => {
    const extra = contributions.analyticsTabs.filter(
      (tab) => isAdmin || !tab.adminOnly,
    );
    return [...CORE_ANALYTICS_TABS, ...extra].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }, [contributions.analyticsTabs, isAdmin]);
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const tabDefinitions = useMemo<PageTabDefinition<string>[]>(
    () => tabs.map(({ id, label, Icon, tone }) => ({ id, label, Icon, tone })),
    [tabs],
  );

  const activeTab: AnalyticsTabContribution =
    tabs.find((candidate) => candidate.id === tab) ??
    tabs.find((candidate) => candidate.id === DEFAULT_TAB) ??
    tabs[0]!;
  const activeTabRef = useRef(activeTab.id);
  activeTabRef.current = activeTab.id;

  // The sections used to live in `?tab=`; a saved link of that shape opens
  // the same section at its path, with the rest of the query kept.
  const legacyTab = searchParams.get("tab");
  useEffect(() => {
    if (!legacyTab) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete("tab");
    const query = rest.toString();
    const destination = `${analyticsTabPath(legacyTab)}${query ? `?${query}` : ""}`;
    if (onNavigatePage) onNavigatePage(destination);
    else window.history.replaceState(window.history.state, "", destination);
  }, [legacyTab, onNavigatePage, searchParams]);

  const requestedRange = searchParams.get("range");
  const range: RangeKey = isRangeKey(requestedRange)
    ? requestedRange
    : DEFAULT_RANGE;
  const [courseId, setCourseId] = useState<string>("all");
  const dateRangeParams = useDateRangeParams(range);
  const myCourses = useMyCourses();

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // A section is a path of its own (`/analytics/revenue`), as on Settings;
  // the range and course stay in the query string and travel with it.
  const selectTab = useCallback(
    (id: string) => {
      if (id === activeTabRef.current) return;
      const query = window.location.search.replace(/^\?/, "");
      const destination = `${analyticsTabPath(id)}${query ? `?${query}` : ""}`;
      if (onNavigatePage) onNavigatePage(destination, { resetScroll: true });
      else window.location.assign(destination);
    },
    [onNavigatePage],
  );
  const getCurrentTab = useCallback(() => activeTabRef.current, []);
  useSettingsTabShortcuts({
    tabIds,
    getCurrentTab,
    onNavigate: selectTab,
  });

  // A course card's "Analytics" link opens this page with ?course=<id>, which
  // used to be ignored. It is read once and becomes the selected course only
  // if it is one of the courses in the list below.
  const [requestedCourseId, setRequestedCourseId] = useState(
    () => searchParams.get("course") || null,
  );
  const myCourseRecords = myCourses.data?.courses;
  useEffect(() => {
    if (!requestedCourseId || !myCourseRecords) return;
    setRequestedCourseId(null);
    if (myCourseRecords.some((course) => course.id === requestedCourseId)) {
      setCourseId(requestedCourseId);
    }
  }, [requestedCourseId, myCourseRecords]);

  const changeCourse = (nextCourseId: string) => {
    setRequestedCourseId(null);
    setCourseId(nextCourseId);
  };

  const filters: AnalyticsTabFilters = useMemo(
    () => ({
      ...dateRangeParams,
      courseId: courseId === "all" ? undefined : courseId,
      rangeKey: range,
    }),
    [dateRangeParams, courseId, range],
  );

  const courseOptions: ThemedSelectOption<string>[] = [
    [
      "all",
      isAdmin ? "All Courses" : "All my courses",
    ] as ThemedSelectOption<string>,
    ...(myCourses.data?.courses ?? []).map(
      (course) => [course.id, course.title] as ThemedSelectOption<string>,
    ),
  ];

  const [exportSections, setExportSections] = useState<
    AnalyticsExportSection[] | null
  >(null);
  const handleExportChange = useCallback(
    (sections: AnalyticsExportSection[] | null) => setExportSections(sections),
    [],
  );
  const exportCsv = () => {
    if (!exportSections) return;
    const day = (iso: string) => iso.slice(0, 10);
    downloadCsv(
      `analytics-${activeTab.id}-${day(filters.from)}-to-${day(filters.to)}.csv`,
      exportSections,
    );
  };

  const isFiltered = range !== DEFAULT_RANGE || courseId !== "all";
  const resetFilters = () => {
    setRequestedCourseId(null);
    setCourseId("all");
    updateParams({ range: null, course: null });
  };

  const rangeDays = RANGE_OPTIONS.find((option) => option.key === range)!.days;
  const TabComponent = activeTab.component;

  return (
    <div
      className={`settings-page ${elevatedCardTokenScopeClasses}`}
      aria-labelledby="analytics-page-title"
    >
      {/* As in Settings, only the tabs stay pinned; the heading scrolls
          away, so the header takes no box of its own. */}
      <header className="settings-page__topbar contents!">
        <div className="settings-page__heading mb-2">
          <PageHeading
            id="analytics-page-title"
            title="Analytics"
            description={
              TAB_DESCRIPTIONS[activeTab.id] ??
              (isAdmin
                ? "Track your academy's performance with actionable insights."
                : "See how your courses are performing.")
            }
            copyClassName="settings-page__heading-copy"
          />
          <ToolbarButton
            icon={<DownloadSimple size={16} weight="bold" aria-hidden="true" />}
            label="Export CSV"
            onClick={exportCsv}
            disabled={!exportSections}
            primary
          />
        </div>

        <SettingsTabBar
          tabs={tabDefinitions}
          activeTab={activeTab.id}
          idPrefix="analytics-tab"
          panelId="analytics-tab-panel"
          label="Analytics sections"
          navRef={tabListRef}
          onPrepare={noop}
          onSelect={selectTab}
        />
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <DateRangeTabs
          value={range}
          onChange={(next) =>
            updateParams({ range: next === DEFAULT_RANGE ? null : next })
          }
        />
        <div className="w-full sm:w-72">
          <ThemedSelect
            value={courseId}
            onValueChange={changeCourse}
            options={courseOptions}
            ariaLabel="Course"
            searchable
            triggerClassName={selectTriggerClass}
          />
        </div>
        <p className="hidden md:block text-xs text-(--muted)">
          Compared with the previous {rangeDays} days
        </p>
        {isFiltered ? (
          <div className="ml-auto">
            <ToolbarButton
              icon={
                <ArrowCounterClockwise
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                />
              }
              label="Reset"
              onClick={resetFilters}
            />
          </div>
        ) : null}
      </div>

      <SwipeableTabPanel
        tabs={tabIds}
        activeTab={activeTab.id}
        onTabChange={selectTab}
        tabListRef={tabListRef}
        id="analytics-tab-panel"
        className="settings-tab-content pb-8"
        stateAttribute="data-analytics-tab"
        labelledBy={`analytics-tab-${activeTab.id}`}
        nativeOnFinePointer
        focusable={false}
      >
        {(panelTab) =>
          panelTab === activeTab.id ? (
            <Suspense fallback={<LoadingTab />}>
              <TabComponent
                key={activeTab.id}
                filters={filters}
                isAdmin={isAdmin}
                onExportChange={handleExportChange}
              />
            </Suspense>
          ) : null
        }
      </SwipeableTabPanel>
    </div>
  );
}

export function AnalyticsDashboardPage({
  role,
  isAdmin,
  tab,
  onNavigatePage,
}: Props) {
  if (role !== "creator") {
    return null;
  }
  return (
    <AnalyticsContent
      isAdmin={isAdmin}
      tab={tab}
      onNavigatePage={onNavigatePage}
    />
  );
}
