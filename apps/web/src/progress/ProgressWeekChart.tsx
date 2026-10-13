import type { LearningHistoryDay } from "@veolms/contracts";
import { formatDay, formatWeekday } from "./progressDates";
import {
  dayStanding,
  describeStanding,
  formatDuration,
  formatGoal,
  progressPanelClasses,
  standingFillClasses,
} from "./progressFormat";

/**
 * The last seven days as bars against the goal. A bar that passes its goal
 * is drawn in two parts, the goal and then the extra in green, as the
 * laptop on the learner's home draws today's.
 */
export function ProgressWeekChart({
  dates,
  dayByDate,
  goalMinutes,
  selectedDate,
  onSelectDate,
}: {
  /** The seven days, oldest first. */
  dates: readonly string[];
  dayByDate: ReadonlyMap<string, LearningHistoryDay>;
  /** The learner's goal now: where the line is drawn. */
  goalMinutes: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const goalSeconds = goalMinutes * 60;
  // The chart is as tall as its longest day, and always tall enough for the
  // goal's line to stand clear of the top.
  const tallest = Math.max(
    goalSeconds * 1.25,
    ...dates.map((date) => dayByDate.get(date)?.seconds ?? 0),
  );
  const share = (seconds: number) => `${(seconds / tallest) * 100}%`;

  return (
    <section
      className={`${progressPanelClasses} p-4 sm:p-6`}
      aria-labelledby="progress-week-title"
    >
      <h2 id="progress-week-title" className="text-base font-semibold">
        Last 7 days
      </h2>
      <p className="mt-0.5 text-xs text-(--muted)">
        The line is the {formatGoal(goalMinutes)} goal
      </p>

      <div className="relative mt-5 grid h-44 grid-cols-7 gap-1.5 sm:gap-3">
        <span
          aria-hidden="true"
          // Measured in the bars' own height: each column keeps a line
          // above its bar for the day's time.
          style={{
            bottom: `calc((100% - 1.5rem) * ${goalSeconds / tallest})`,
          }}
          className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-(--muted)/60"
        />
        {dates.map((date) => {
          const day = dayByDate.get(date);
          const standing = dayStanding(day);
          const seconds = day?.seconds ?? 0;
          const dayGoalSeconds = (day?.goalMinutes ?? goalMinutes) * 60;
          const beyond = standing === "beyond";
          const selected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-pressed={selected}
              aria-label={`${formatDay(date)}: ${formatDuration(seconds)}. ${describeStanding(day)}`}
              className={`group flex h-full min-w-0 cursor-pointer flex-col rounded-lg px-0.5 text-center transition-colors hover:bg-(--text)/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) ${
                selected ? "bg-(--text)/6" : ""
              }`}
            >
              <span className="flex h-6 shrink-0 items-center justify-center truncate text-[0.68rem] leading-none font-semibold text-(--muted) tabular-nums">
                {seconds >= 60 ? formatDuration(seconds) : ""}
              </span>
              <span className="flex min-h-0 flex-1 flex-col justify-end">
                {beyond ? (
                  <>
                    <span
                      style={{ height: share(seconds - dayGoalSeconds) }}
                      className={`mx-auto mb-0.5 block w-full max-w-10 shrink-0 rounded-t-md ${standingFillClasses.beyond}`}
                    />
                    <span
                      style={{ height: share(dayGoalSeconds) }}
                      className={`mx-auto block w-full max-w-10 shrink-0 ${standingFillClasses.completed}`}
                    />
                  </>
                ) : (
                  <span
                    // A day with a few minutes still shows as a sliver.
                    style={{
                      height: share(seconds),
                      minHeight: seconds ? 3 : 0,
                    }}
                    className={`mx-auto block w-full max-w-10 shrink-0 rounded-t-md ${standingFillClasses[standing]}`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="mt-2 grid grid-cols-7 gap-1.5 border-t border-(--text)/8 pt-2 text-center text-xs text-(--muted) sm:gap-3"
      >
        {dates.map((date) => (
          <span
            key={date}
            className={
              date === selectedDate ? "font-semibold text-(--text)" : ""
            }
          >
            {formatWeekday(date)}
          </span>
        ))}
      </div>
    </section>
  );
}
