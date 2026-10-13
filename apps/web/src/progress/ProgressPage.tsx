import { LockKeyIcon as LockKey } from "@phosphor-icons/react/LockKey";
import { WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/WarningCircle";
import type {
  LearningCommunityLearner,
  LearningHistoryCourse,
  LearningHistoryDay,
} from "@veolms/contracts";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { PageHeading } from "../components/PageHeading";
import { EmptyState } from "../components/analytics/StatTiles";
import { getApiError } from "../lib/api-error";
import {
  useLearningCommunity,
  useLearningHistory,
} from "../services/learning-goals";
import { LearnerAvatar } from "./LearnerAvatar";
import { ProgressCalendar } from "./ProgressCalendar";
import { ProgressCommunity } from "./ProgressCommunity";
import { ProgressDayDetail } from "./ProgressDayDetail";
import { ProgressFigures } from "./ProgressFigures";
import { ProgressPageSkeleton } from "./ProgressPageSkeleton";
import { ProgressSharingSwitch } from "./ProgressSharingSwitch";
import { ProgressWeekChart } from "./ProgressWeekChart";
import {
  addDays,
  dayOfMonth,
  daysBetween,
  deviceToday,
  firstDayOf,
  formatMonth,
  lastDayOf,
  monthOf,
} from "./progressDates";
import { monthFigures, progressPanelClasses } from "./progressFormat";

interface ProgressPageProps {
  /** Whose progress, from `/progress/:username`. The viewer's own without. */
  username?: string;
  onNavigatePage?: (path: string) => void;
  onNavigateBack?: () => void;
  setNotice?: (message: string) => void;
}

const pageClasses =
  "mx-auto flex w-full min-w-0 max-w-[1800px] flex-col gap-6 font-sans";

const quietLinkClasses =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg border border-(--text)/12 px-3 text-sm font-semibold text-(--text) transition-colors hover:bg-(--text)/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";

/**
 * A learner's progress over time: the month in figures, the last seven
 * days against the goal, a calendar of every day, the chosen day in full
 * with the courses it went to, and the members who share theirs.
 *
 * It is the viewer's own unless the address names someone else, who must
 * have chosen to share (an admin can see anyone's).
 */
export function ProgressPage(props: ProgressPageProps) {
  // Another learner is another page: the month and the chosen day start over.
  return <ProgressView key={props.username ?? ""} {...props} />;
}

function ProgressView({
  username,
  onNavigatePage,
  onNavigateBack,
  setNotice,
}: ProgressPageProps) {
  const learnerUsername = username?.trim().toLowerCase() || null;
  // The device's day, until the answer says what day it is for the learner.
  const [deviceDay] = useState(deviceToday);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  // One request covers what the page opens on: this month and the last
  // seven days, with a day to spare either side for a learner whose
  // calendar is a day ahead of or behind this device's.
  const currentMonth = monthOf(deviceDay);
  const weekStart = addDays(deviceDay, -7);
  const monthStart = firstDayOf(currentMonth);
  const tomorrow = addDays(deviceDay, 1);
  const monthEnd = lastDayOf(currentMonth);
  const recent = useLearningHistory({
    username: learnerUsername,
    from: weekStart < monthStart ? weekStart : monthStart,
    to: tomorrow > monthEnd ? tomorrow : monthEnd,
  });

  const shownMonth = pickedMonth ?? currentMonth;
  const isCurrentMonth = shownMonth === currentMonth;
  const earlier = useLearningHistory(
    {
      username: learnerUsername,
      from: firstDayOf(shownMonth),
      to: lastDayOf(shownMonth),
    },
    { enabled: !isCurrentMonth && recent.isSuccess },
  );
  const community = useLearningCommunity({ enabled: recent.isSuccess });

  const monthData = isCurrentMonth ? recent.data : earlier.data;
  const { dayByDate, courseById } = useMemo(() => {
    const days = new Map<string, LearningHistoryDay>();
    const courses = new Map<string, LearningHistoryCourse>();
    for (const history of [recent.data, earlier.data]) {
      for (const day of history?.days ?? []) days.set(day.date, day);
      for (const course of history?.courses ?? []) {
        courses.set(course.id, course);
      }
    }
    return { dayByDate: days, courseById: courses };
  }, [recent.data, earlier.data]);

  if (recent.isPending) return <ProgressPageSkeleton />;

  if (!recent.data) {
    const error = getApiError(recent.error);
    const isPrivate = error.status === 403;
    const isMissing = error.status === 404;
    return (
      <main className={pageClasses} aria-labelledby="progress-page-title">
        <PageHeading
          id="progress-page-title"
          title="Progress"
          description="A learner's days of learning and the goals they have met."
          onNavigateBack={onNavigateBack}
        />
        <section className={progressPanelClasses}>
          <EmptyState
            icon={
              isPrivate ? (
                <LockKey size={20} weight="duotone" aria-hidden="true" />
              ) : (
                <WarningCircle size={20} weight="duotone" aria-hidden="true" />
              )
            }
            title={
              isPrivate
                ? "This progress is private"
                : isMissing
                  ? "Learner not found"
                  : "Progress could not be loaded"
            }
            message={
              isPrivate
                ? "This learner has not chosen to share their progress."
                : isMissing
                  ? "There is no learner at this address."
                  : error.message
            }
            action={
              isPrivate || isMissing ? (
                learnerUsername ? (
                  <Button
                    motion="static"
                    className="h-9 text-xs"
                    onClick={() => onNavigatePage?.("/progress")}
                  >
                    See your progress
                  </Button>
                ) : undefined
              ) : (
                <Button
                  motion="static"
                  className="h-9 text-xs"
                  onClick={() => void recent.refetch()}
                >
                  Try again
                </Button>
              )
            }
          />
        </section>
      </main>
    );
  }

  const { learner, isOwn, shared, goalMinutes, today } = recent.data;
  const weekDates = daysBetween(addDays(today, -6), today);
  const monthDays = (monthData?.days ?? []).filter(
    (day) => monthOf(day.date) === shownMonth,
  );
  const todayMonth = monthOf(today);
  const daysSoFar =
    shownMonth === todayMonth
      ? dayOfMonth(today)
      : shownMonth < todayMonth
        ? dayOfMonth(lastDayOf(shownMonth))
        : 0;

  // The chosen day, as long as it is on show. Otherwise today; in an
  // earlier month, the last day of it that has something recorded.
  const selectedDate =
    pickedDate &&
    (monthOf(pickedDate) === shownMonth || weekDates.includes(pickedDate))
      ? pickedDate
      : shownMonth === todayMonth
        ? today
        : (monthDays.at(-1)?.date ?? null);

  const selectDate = (date: string) => {
    setPickedDate(date);
    // A bar of the week can belong to the month before the one on show.
    if (monthOf(date) !== shownMonth) setPickedMonth(monthOf(date));
  };
  const changeMonth = (month: string) => {
    setPickedMonth(month);
    setPickedDate(null);
  };
  const openLearner = (entry: LearningCommunityLearner) =>
    onNavigatePage?.(
      entry.isYou
        ? "/progress"
        : `/progress/${encodeURIComponent(entry.learner.username)}`,
    );

  return (
    <main className={pageClasses} aria-labelledby="progress-page-title">
      <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-4 pt-1">
        <div className="flex min-w-0 items-center gap-3.5">
          <PageHeading
            id="progress-page-title"
            title={isOwn ? "Progress" : `${learner.name}'s progress`}
            description={
              isOwn
                ? "Your learning day by day, and the goals you have met."
                : shared
                  ? "Shared with the academy's members."
                  : "Private. You can see it as an admin."
            }
            onNavigateBack={onNavigateBack}
          />
        </div>
        {isOwn ? (
          <ProgressSharingSwitch shared={shared} setNotice={setNotice} />
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className={quietLinkClasses}
              onClick={() => onNavigatePage?.("/progress")}
            >
              Your progress
            </button>
            <LearnerAvatar learner={learner} size="lg" />
          </div>
        )}
      </header>

      <ProgressFigures
        figures={monthData ? monthFigures(monthDays, daysSoFar) : undefined}
        monthLabel={formatMonth(shownMonth)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProgressWeekChart
          dates={weekDates}
          dayByDate={dayByDate}
          goalMinutes={goalMinutes}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
        />
        <ProgressCalendar
          month={shownMonth}
          today={today}
          dayByDate={dayByDate}
          selectedDate={selectedDate}
          loading={!monthData}
          onSelectDate={selectDate}
          onChangeMonth={changeMonth}
        />
      </div>

      <ProgressDayDetail
        date={selectedDate}
        day={selectedDate ? dayByDate.get(selectedDate) : undefined}
        goalMinutes={goalMinutes}
        courseById={courseById}
        onNavigatePage={onNavigatePage}
      />

      <ProgressCommunity
        learners={community.data?.learners}
        loading={community.isPending}
        failed={community.isError}
        currentLearnerId={learner.id}
        onOpenLearner={openLearner}
      />
    </main>
  );
}
