import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Play } from "@phosphor-icons/react/Play";
import { Button } from "../../components/Button";
import { getCoursePlayerPath } from "../../learning/coursePlayerNavigation";
import type { NavigateTo } from "../../routing/navigation";
import { useLearningProgressResumeContext } from "../../services/learning-progress";
import {
  priceBarActionClasses,
  priceBarPaddingClasses,
  priceBarSurfaceClasses,
} from "./CoursePriceBar";

interface CourseLearnerProgressBarProps {
  /** The course's slug, or its id when it has none. */
  courseKey: string;
  courseTitle: string;
  /** How much of the course is done, 0 to 100. */
  progress: number;
  totalLessons: number;
  onNavigatePage?: NavigateTo;
}

const placeholder =
  "animate-pulse rounded-md bg-[color-mix(in_srgb,var(--text)_10%,transparent)]";

/**
 * What an enrolled learner gets where a visitor gets the price: how far they
 * are, the lesson that comes next, and the button that opens it.
 *
 * The percentage comes with the course; the lesson and the count of lessons
 * done are asked for here and arrive a moment later, so their places are held
 * until then and the bar keeps its height.
 */
export function CourseLearnerProgressBar({
  courseKey,
  courseTitle,
  progress,
  totalLessons,
  onNavigatePage,
}: CourseLearnerProgressBarProps) {
  const resume = useLearningProgressResumeContext(courseKey);
  const place = resume.data;
  const percent = Math.min(100, Math.max(0, Math.round(progress)));
  const lessonCount = place?.totalLessons ?? totalLessons;
  const isComplete = percent >= 100;
  const lesson = isComplete ? null : (place?.resumeLesson ?? null);
  const hasStarted =
    percent > 0 ||
    (place?.completedLessons ?? 0) > 0 ||
    (lesson?.progressPercent ?? 0) > 0;

  const actionLabel = isComplete
    ? "Review Course"
    : hasStarted
      ? "Continue Learning"
      : "Start Learning";
  // A lesson left part-way is carried on with; one not opened yet comes next.
  const lessonLead = !hasStarted
    ? "Start with"
    : lesson && lesson.progressPercent > 0
      ? "Continue"
      : "Up next";

  const openCourse = () => {
    onNavigatePage?.(
      lesson
        ? getCoursePlayerPath(courseKey, lesson.lessonNumber)
        : `/learn/${encodeURIComponent(courseKey)}`,
    );
  };

  return (
    <section
      className={priceBarSurfaceClasses}
      aria-label="Your progress in this course"
    >
      <div
        className={`${priceBarPaddingClasses} flex flex-col gap-3.5 @2xl/price:flex-row @2xl/price:items-center @2xl/price:gap-6`}
      >
        <div className="flex min-w-0 flex-col gap-2.5 @2xl/price:w-64 @2xl/price:shrink-0">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[2.15rem] leading-none font-[850] tracking-[-0.03em] whitespace-nowrap text-(--text) max-[640px]:text-[1.95rem]">
              {percent}%
            </span>
            <span className="truncate text-[0.86rem] text-(--muted)">
              {place
                ? `${place.completedLessons} of ${lessonCount} lessons done`
                : "complete"}
            </span>
          </div>
          <span
            role="progressbar"
            aria-label={`${courseTitle} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_12%,transparent)]"
          >
            <span
              className="block h-full rounded-full bg-(--accent)"
              style={{ width: `${percent}%` }}
            />
          </span>
        </div>

        <div className="flex min-h-10.5 min-w-0 flex-1 flex-col justify-center gap-1 @2xl/price:border-l @2xl/price:border-[color-mix(in_srgb,var(--text)_12%,transparent)] @2xl/price:pl-6">
          {isComplete ? (
            <>
              <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <CheckCircle size={15} weight="fill" aria-hidden="true" />
                Completed
              </p>
              <p className="m-0 truncate text-[0.95rem] font-semibold text-(--text)">
                You have finished all {lessonCount} lesson
                {lessonCount === 1 ? "" : "s"}
              </p>
            </>
          ) : lesson ? (
            <>
              <p className="m-0 truncate text-xs text-(--muted)">
                {lessonLead}
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                Lesson {lesson.lessonNumber}
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                {lesson.sectionTitle}
              </p>
              <p
                className="m-0 truncate text-[0.95rem] font-semibold text-(--text)"
                title={lesson.title}
              >
                {lesson.title}
              </p>
            </>
          ) : resume.isPending ? (
            <>
              <span className={`${placeholder} h-3 w-40`} />
              <span className={`${placeholder} h-4 w-64 max-w-full`} />
            </>
          ) : null}
        </div>

        <Button
          className={`${priceBarActionClasses} w-full @2xl/price:w-56`}
          onClick={openCourse}
        >
          <Play
            size="1.15em"
            weight="fill"
            className="shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{actionLabel}</span>
        </Button>
      </div>
    </section>
  );
}
