import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { ListBullets } from "@phosphor-icons/react/ListBullets";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { Button } from "../../components/Button";
import type { NavigateTo } from "../../routing/navigation";
import { getCourseRouteKey, type Course } from "../catalogue";
import { getCourseEditorPath } from "../courseEditorRouting";
import {
  priceBarActionClasses,
  priceBarPaddingClasses,
  priceBarSurfaceClasses,
} from "./CoursePriceBar";
import { HoverFillIcon } from "./HoverFillIcon";
import { quietButtonClasses } from "./overviewStyles";

interface CourseManagerBarProps {
  course: Course;
  /** What the course sells for, as the catalogue words it; "Free" when free. */
  priceLabel: string;
  onNavigatePage?: NavigateTo;
}

const statusLabels: Record<Course["lifecycleStatus"], string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

/**
 * The status dot's colour: green for a course learners can see, the accent
 * for one still being written, grey for one put away.
 */
const statusDotClasses: Record<Course["lifecycleStatus"], string> = {
  published: "bg-emerald-500",
  draft: "bg-(--accent)",
  archived: "bg-(--muted)",
};

/**
 * What someone who manages the course gets where a learner gets their
 * progress and a visitor the price: the course's state at a glance, and the
 * ways into the editor. The About and Curriculum boxes under it carry their
 * own "Edit" links to the matching editor tab.
 */
export function CourseManagerBar({
  course,
  priceLabel,
  onNavigatePage,
}: CourseManagerBarProps) {
  const status = course.lifecycleStatus;
  const go = (path: string) => () => onNavigatePage?.(path);
  const editorPath = (step: "basics" | "curriculum") =>
    getCourseEditorPath({ mode: "edit", courseId: course.id, step });

  return (
    <section
      className={priceBarSurfaceClasses}
      aria-label="Manage this course"
      data-fixed-radius
    >
      <div
        className={`${priceBarPaddingClasses} flex flex-col gap-4 @2xl/price:flex-row @2xl/price:items-center @2xl/price:justify-between @2xl/price:gap-6`}
      >
        {/* The course's state: whether learners can see it and what it
            sells for. (The overview carries no enrolment count.) */}
        <dl className="m-0 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-[0.9rem] text-(--text)">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Status</dt>
            <dd className="m-0 inline-flex items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${statusDotClasses[status]}`}
              />
              {statusLabels[status]}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-(--muted)">Price</dt>
            <dd className="m-0 font-semibold">{priceLabel}</dd>
          </div>
        </dl>

        {/* On a phone the two quiet buttons share a row and the primary
            one takes the next; wider, all three sit on one line. */}
        <div className="grid grid-cols-2 gap-2.5 @md/price:flex @md/price:items-center @md/price:justify-end">
          <button
            type="button"
            className={quietButtonClasses}
            onClick={go(
              `/learn/${encodeURIComponent(getCourseRouteKey(course))}`,
            )}
          >
            <ArrowSquareOut size={17} weight="bold" aria-hidden="true" />
            <span>Open course</span>
          </button>
          <button
            type="button"
            className={quietButtonClasses}
            onClick={go(editorPath("curriculum"))}
          >
            <ListBullets size={17} weight="bold" aria-hidden="true" />
            <span>Edit curriculum</span>
          </button>
          <Button
            motion="static"
            className={`${priceBarActionClasses} col-span-2 @md/price:col-span-1 @md/price:min-w-44`}
            onClick={go(editorPath("basics"))}
          >
            <HoverFillIcon icon={PencilSimple} />
            <span>Edit course</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
