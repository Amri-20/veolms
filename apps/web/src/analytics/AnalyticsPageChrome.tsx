import { useMemo, type ReactNode, type RefObject } from "react";
import { DownloadSimpleIcon as DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { ArrowCounterClockwiseIcon as ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import {
  AnalyticsTabPlaceholder,
  LoadingTab,
} from "@veolms/analytics-ui/skeletons";
import type { AnalyticsTabContribution } from "@veolms/web-core";
import { handleRovingTabKeyDown } from "../accessibility/rovingTabFocus";
import { elevatedCardTokenScopeClasses } from "../components/ElevatedCard";
import { PageHeading } from "../components/PageHeading";
import { ThemedSelect, type ThemedSelectOption } from "../ThemedSelect";
import { useWebContributions } from "../lib/web-contributions";
import { useCapabilities } from "../services/authorization";
import { SettingsTabBar } from "../settings/SettingsTabBar";
import type { PageTabDefinition } from "../settings/settingsTabs";
import { CORE_ANALYTICS_TABS } from "./analyticsTabs";

/**
 * The analytics page's frame: heading, Export button, the pinned section
 * tabs and the filter row. Drawn by the page itself, and by the route's
 * loading state before the page's code has arrived, so the frame is on
 * screen at once and only the numbers come later. Light on purpose: no
 * chart code is reached from here.
 */

export type AnalyticsRangeKey = "7d" | "30d" | "3m" | "1y";

export const ANALYTICS_RANGE_OPTIONS: ReadonlyArray<{
  key: AnalyticsRangeKey;
  label: string;
  days: number;
}> = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
];
export const ANALYTICS_DEFAULT_RANGE: AnalyticsRangeKey = "30d";
export const ANALYTICS_DEFAULT_TAB = "overview";

export function isAnalyticsRangeKey(
  value: string | null | undefined,
): value is AnalyticsRangeKey {
  return ANALYTICS_RANGE_OPTIONS.some((option) => option.key === value);
}

const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: "Track your academy's performance with actionable insights.",
  revenue: "Dive deep into your academy's revenue performance.",
  courses: "Measure how your courses and content drive learning outcomes.",
};

/**
 * Whether the Revenue section is for this person: the revenue permission
 * opens it, and so does an instructor's own-course analytics. Course
 * analytics held for every course (a team role) stop short of money, as
 * the API does.
 */
function useSeesRevenue(seesAcademyRevenue: boolean): boolean {
  const { data, can, canOnCourse } = useCapabilities({
    enabled: !seesAcademyRevenue,
  });
  if (seesAcademyRevenue) return true;
  if (!data) return false;
  return (
    can("analytics.revenue.read") || !canOnCourse("analytics.course.read", null)
  );
}

/** The page's own sections and the ones plugins registered, in order. */
export function useAnalyticsTabs(
  isAdmin: boolean,
): readonly AnalyticsTabContribution[] {
  const contributions = useWebContributions();
  const seesRevenue = useSeesRevenue(isAdmin);
  return useMemo(() => {
    const extra = contributions.analyticsTabs.filter(
      (tab) => isAdmin || !tab.adminOnly,
    );
    const core = CORE_ANALYTICS_TABS.filter(
      (tab) => seesRevenue || tab.id !== "revenue",
    );
    return [...core, ...extra].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [contributions.analyticsTabs, isAdmin, seesRevenue]);
}

export function resolveAnalyticsTab(
  tabs: readonly AnalyticsTabContribution[],
  tabId: string | undefined,
): AnalyticsTabContribution {
  return (
    tabs.find((candidate) => candidate.id === tabId) ??
    tabs.find((candidate) => candidate.id === ANALYTICS_DEFAULT_TAB) ??
    tabs[0]!
  );
}

/**
 * A section named in the path that no one has registered yet: a plugin's,
 * before the plugin has run. Nothing is selected rather than the wrong
 * tab, until it arrives.
 */
function isUnregisteredTab(
  tabs: readonly AnalyticsTabContribution[],
  tabId: string | undefined,
): boolean {
  return (
    tabId !== undefined &&
    tabId !== ANALYTICS_DEFAULT_TAB &&
    !tabs.some((candidate) => candidate.id === tabId)
  );
}

function DateRangeTabs({
  value,
  onChange,
}: {
  value: AnalyticsRangeKey;
  onChange?: (value: AnalyticsRangeKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className="flex gap-1 sm:gap-1.5 rounded-[12px] sm:rounded-[14px] border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_80%,var(--surface))] p-1 sm:p-1.5"
    >
      {ANALYTICS_RANGE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          tabIndex={value === option.key ? 0 : -1}
          disabled={!onChange}
          onClick={() => onChange?.(option.key)}
          onKeyDown={handleRovingTabKeyDown}
          className={`rounded-[8px] sm:rounded-[10px] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:cursor-default ${
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

export function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
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

const noop = () => {};

export interface AnalyticsPageChromeProps {
  tabs: readonly AnalyticsTabContribution[];
  /** Null while the section from the path is not registered yet. */
  activeTab: AnalyticsTabContribution | null;
  isAdmin: boolean;
  range: AnalyticsRangeKey;
  courseId: string;
  courseOptions: readonly ThemedSelectOption<string>[];
  /** Without these the controls are drawn inert (the loading state). */
  onSelectTab?: (id: string) => void;
  onRangeChange?: (range: AnalyticsRangeKey) => void;
  onCourseChange?: (courseId: string) => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  onReset?: () => void;
  navRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function AnalyticsPageChrome({
  tabs,
  activeTab,
  isAdmin,
  range,
  courseId,
  courseOptions,
  onSelectTab,
  onRangeChange,
  onCourseChange,
  onExport,
  exportDisabled = false,
  onReset,
  navRef,
  children,
}: AnalyticsPageChromeProps) {
  const tabDefinitions = useMemo<PageTabDefinition<string>[]>(
    () => tabs.map(({ id, label, Icon, tone }) => ({ id, label, Icon, tone })),
    [tabs],
  );
  const rangeDays = ANALYTICS_RANGE_OPTIONS.find(
    (option) => option.key === range,
  )!.days;
  const localNavRef = useMemo(
    () => ({ current: null as HTMLElement | null }),
    [],
  );

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
              (activeTab && TAB_DESCRIPTIONS[activeTab.id]) ??
              (isAdmin
                ? "Track your academy's performance with actionable insights."
                : "See how your courses are performing.")
            }
            copyClassName="settings-page__heading-copy"
          />
          <ToolbarButton
            icon={<DownloadSimple size={16} weight="bold" aria-hidden="true" />}
            label="Export CSV"
            onClick={onExport}
            disabled={exportDisabled}
            primary
          />
        </div>

        <SettingsTabBar
          tabs={tabDefinitions}
          activeTab={activeTab?.id ?? ""}
          idPrefix="analytics-tab"
          panelId="analytics-tab-panel"
          label="Analytics sections"
          navRef={navRef ?? localNavRef}
          onPrepare={noop}
          onSelect={onSelectTab ?? noop}
        />
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <DateRangeTabs value={range} onChange={onRangeChange} />
        <div className="w-full sm:w-72">
          <ThemedSelect
            value={courseId}
            onValueChange={onCourseChange ?? noop}
            options={courseOptions}
            ariaLabel="Course"
            searchable
            disabled={!onCourseChange}
            triggerClassName="!h-9 sm:!h-10 !rounded-[9px] sm:!rounded-[10px] !border !border-[color-mix(in_srgb,var(--text)_12%,transparent)] !bg-[color-mix(in_srgb,var(--canvas)_75%,var(--surface))] !px-2.5 sm:!px-3.5 !text-xs sm:!text-sm !font-medium !text-(--text) focus:!border-(--accent)"
          />
        </div>
        <p className="hidden md:block text-xs text-(--muted)">
          Compared with the previous {rangeDays} days
        </p>
        {onReset ? (
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
              onClick={onReset}
            />
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/** What a section shows before its numbers: its own cards, or grey blocks. */
export function AnalyticsTabLoading({
  tab,
}: {
  tab: AnalyticsTabContribution | undefined;
}) {
  return tab?.placeholder ? (
    <AnalyticsTabPlaceholder spec={tab.placeholder} />
  ) : (
    <LoadingTab />
  );
}

/**
 * The route's loading state: the frame with the section from the path
 * and that section's placeholder, drawn while the page's code is on its
 * way. The filters show their defaults, inert.
 */
export function AnalyticsPageLoading({
  isAdmin,
  tab,
}: {
  isAdmin: boolean;
  tab: string | undefined;
}) {
  const tabs = useAnalyticsTabs(isAdmin);
  const activeTab = isUnregisteredTab(tabs, tab)
    ? null
    : resolveAnalyticsTab(tabs, tab);
  const range: AnalyticsRangeKey = (() => {
    if (typeof window === "undefined") return ANALYTICS_DEFAULT_RANGE;
    const requested = new URLSearchParams(window.location.search).get("range");
    return isAnalyticsRangeKey(requested) ? requested : ANALYTICS_DEFAULT_RANGE;
  })();
  return (
    <AnalyticsPageChrome
      tabs={tabs}
      activeTab={activeTab}
      isAdmin={isAdmin}
      range={range}
      courseId="all"
      courseOptions={[["all", isAdmin ? "All Courses" : "All my courses"]]}
      exportDisabled
    >
      <div
        id="analytics-tab-panel"
        role="tabpanel"
        aria-labelledby={
          activeTab ? `analytics-tab-${activeTab.id}` : undefined
        }
        className="settings-tab-content pb-8"
      >
        <AnalyticsTabLoading tab={activeTab ?? undefined} />
      </div>
    </AnalyticsPageChrome>
  );
}
