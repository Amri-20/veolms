import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/BookOpen";
import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { ConfettiIcon as Confetti } from "@phosphor-icons/react/Confetti";
import type {
  LearningHistoryCourse,
  LearningHistoryDay,
} from "@veolms/contracts";
import { formatDay } from "./progressDates";
import {
  dayStanding,
  describeStanding,
  formatDuration,
  formatGoal,
  progressPanelClasses,
} from "./progressFormat";

function CourseThumbnail({ course }: { course: LearningHistoryCourse }) {
  if (!course.thumbnailUrl) {
    return (
      <span
        aria-hidden="true"
        className="grid aspect-video w-20 shrink-0 place-items-center rounded-lg bg-(--accent)/12 text-(--accent)"
      >
        <BookOpen size={18} weight="duotone" />
      </span>
    );
  }
  return (
    <img
      src={course.thumbnailUrl}
      alt=""
      width={80}
      height={45}
      loading="lazy"
      decoding="async"
      className="aspect-video w-20 shrink-0 rounded-lg object-cover"
    />
  );
}

/**
 * One day in full: the time against that day's goal, and the courses it
 * went to. A day recorded before courses were kept has a total only.
 */
export function ProgressDayDetail({
  date,
  day,
  goalMinutes,
  courseById,
  onNavigatePage,
}: {
  date: string | null;
  day: LearningHistoryDay | undefined;
  /** The goal of a day without a record: the learner's goal now. */
  goalMinutes: number;
  courseById: ReadonlyMap<string, LearningHistoryCourse>;
  onNavigatePage?: (path: string) => void;
}) {
  if (!date) {
    return (
      <section className={`${progressPanelClasses} p-4 sm:p-6`}>
        <p className="text-sm text-(--muted)">
          Choose a day on the calendar to see what it went to.
        </p>
      </section>
    );
  }

  const standing = dayStanding(day);
  const seconds = day?.seconds ?? 0;
  const dayGoalMinutes = day?.goalMinutes ?? goalMinutes;
  const shares = (day?.courses ?? []).flatMap((share) => {
    const course = courseById.get(share.courseId);
    return course ? [{ ...share, course }] : [];
  });

  return (
    <section
      className={`${progressPanelClasses} p-4 sm:p-6`}
      aria-labelledby="progress-day-title"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 id="progress-day-title" className="text-base font-semibold">
            {formatDay(date)}
          </h2>
          <p className="mt-1 text-sm text-(--muted)">
            <strong className="font-semibold text-(--text)">
              {formatDuration(seconds)}
            </strong>{" "}
            of the {formatGoal(dayGoalMinutes)} goal
            {day && day.completions > 0
              ? ` · ${day.completions} ${day.completions === 1 ? "lesson" : "lessons"} finished`
              : ""}
          </p>
        </div>
        <p
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
            standing === "beyond"
              ? "bg-emerald-500/15 text-emerald-500"
              : standing === "completed"
                ? "bg-(--accent)/15 text-(--accent)"
                : "bg-(--text)/8 text-(--muted)"
          }`}
        >
          {standing === "beyond" ? (
            <Confetti size={15} weight="fill" aria-hidden="true" />
          ) : null}
          {standing === "completed" ? (
            <CheckCircle size={15} weight="fill" aria-hidden="true" />
          ) : null}
          {describeStanding(day)}
        </p>
      </div>

      {shares.length > 0 ? (
        <ul className="mt-4 grid gap-2.5">
          {shares.map(({ course, seconds: courseSeconds, completions }) => (
            <li key={course.id}>
              <a
                href={`/courses/${encodeURIComponent(course.slug)}/overview`}
                onClick={(event) => {
                  if (
                    !onNavigatePage ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.button !== 0
                  ) {
                    return;
                  }
                  event.preventDefault();
                  onNavigatePage(
                    `/courses/${encodeURIComponent(course.slug)}/overview`,
                  );
                }}
                className="flex items-center gap-3 rounded-xl border border-(--text)/8 p-2.5 transition-colors hover:bg-(--text)/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
              >
                <CourseThumbnail course={course} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold text-(--text)">
                    {course.title}
                  </strong>
                  <span className="mt-0.5 block text-xs text-(--muted)">
                    {formatDuration(courseSeconds)}
                    {completions > 0
                      ? ` · ${completions} ${completions === 1 ? "lesson" : "lessons"} finished`
                      : ""}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : standing !== "none" ? (
        <p className="mt-4 text-xs text-(--muted)">
          The courses of this day were not recorded.
        </p>
      ) : null}
    </section>
  );
}
