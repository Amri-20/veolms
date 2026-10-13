import { CaretLeftIcon as CaretLeft } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon as CaretRight } from "@phosphor-icons/react/CaretRight";
import type { LearningHistoryDay } from "@veolms/contracts";
import {
  addMonths,
  dayOfMonth,
  formatDay,
  formatMonth,
  monthOf,
  monthWeeks,
} from "./progressDates";
import {
  dayStanding,
  describeStanding,
  formatDuration,
  progressPanelClasses,
  standingFillClasses,
  type DayStanding,
} from "./progressFormat";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// What a day's number is written in over each fill.
const standingTextClasses: Record<DayStanding, string> = {
  none: "text-(--muted)",
  under: "text-(--text)",
  completed: "text-(--on-accent)",
  beyond: "text-white",
};

const monthButtonClasses =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-(--text)/12 text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-(--muted)";

const legend: Array<[DayStanding, string]> = [
  ["under", "Studied"],
  ["completed", "Goal completed"],
  ["beyond", "Extra time"],
];

/**
 * A month, a square for each day: empty when nothing was learned, tinted
 * when something was, filled when the goal was met and green when it was
 * passed. A day that was missed is only empty; it is not marked.
 */
export function ProgressCalendar({
  month,
  today,
  dayByDate,
  selectedDate,
  loading,
  onSelectDate,
  onChangeMonth,
}: {
  /** `YYYY-MM`. */
  month: string;
  today: string;
  dayByDate: ReadonlyMap<string, LearningHistoryDay>;
  selectedDate: string | null;
  /** The month's days are still being fetched. */
  loading: boolean;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}) {
  const isCurrentMonth = month >= monthOf(today);
  return (
    <section
      className={`${progressPanelClasses} p-4 sm:p-6`}
      aria-labelledby="progress-calendar-title"
      aria-busy={loading}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="progress-calendar-title" className="text-base font-semibold">
          {formatMonth(month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={monthButtonClasses}
            onClick={() => onChangeMonth(addMonths(month, -1))}
            aria-label={`Show ${formatMonth(addMonths(month, -1))}`}
          >
            <CaretLeft size={16} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={monthButtonClasses}
            onClick={() => onChangeMonth(addMonths(month, 1))}
            disabled={isCurrentMonth}
            aria-label={`Show ${formatMonth(addMonths(month, 1))}`}
          >
            <CaretRight size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-semibold text-(--muted) sm:gap-1.5"
      >
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
        {monthWeeks(month)
          .flat()
          .map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;
            const day = dayByDate.get(date);
            const future = date > today;
            const standing = future ? "none" : dayStanding(day);
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                onClick={() => onSelectDate(date)}
                aria-pressed={selected}
                aria-current={date === today ? "date" : undefined}
                aria-label={
                  future
                    ? formatDay(date)
                    : `${formatDay(date)}: ${formatDuration(day?.seconds ?? 0)}. ${describeStanding(day)}`
                }
                className={`grid h-9 cursor-pointer place-items-center rounded-lg text-xs font-semibold tabular-nums transition-[background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-default disabled:opacity-35 sm:h-10 sm:text-sm ${
                  standingFillClasses[standing] ||
                  "border border-(--text)/10 hover:bg-(--text)/5 disabled:hover:bg-transparent"
                } ${standingTextClasses[standing]} ${
                  selected
                    ? "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]"
                    : date === today
                      ? "shadow-[0_0_0_1.5px_var(--text)]"
                      : ""
                }`}
              >
                {dayOfMonth(date)}
              </button>
            );
          })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-(--muted)">
        {legend.map(([standing, label]) => (
          <li key={standing} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-3 rounded-[4px] ${standingFillClasses[standing]}`}
            />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
