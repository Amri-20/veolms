import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/BookOpen";
import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { EyeIcon as Eye } from "@phosphor-icons/react/Eye";
import { PaperPlaneTiltIcon as PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { PlayIcon as Play } from "@phosphor-icons/react/Play";
import { PushPinIcon as PushPin } from "@phosphor-icons/react/PushPin";
import type { EnrolledCourse } from "@veolms/contracts";
import { useRef } from "react";
import { CourseActionMenu, MenuAction } from "../../courses/CourseActionMenu";
import type { NavigateTo } from "../../routing/navigation";
import { GuestHomeLink } from "../guest/GuestHomeLink";
import { LearnerCourseThumbnail } from "./LearnerCourseThumbnail";
import {
  getEnrolledCourseOverviewHref,
  VIEW_COURSE_CURRICULUM_HINT,
} from "./learnerHomePlan";
import { useIsCutOff } from "./useIsCutOff";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * The card's action, drawn as the catalogue's card draws its own. It and
 * the picture both go into the course, so it lights up under the pointer on
 * either (`data-course-start` marks the two).
 */
const actionClasses =
  "relative z-20 flex min-h-9 w-full items-center justify-center gap-2.5 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_70%,transparent)] bg-(--accent) px-3.25 text-sm font-semibold text-(--on-accent) shadow-[0_10px_22px_color-mix(in_srgb,var(--accent-shadow)_48%,transparent)] transition-colors duration-150 group-has-[[data-course-start]:hover]/card:bg-(--accent-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) @lg/courses:min-h-11 @lg/courses:gap-3 @lg/courses:text-[15px]";

/**
 * One of the learner's courses. Its picture and its action go back into the
 * course, at the lesson to carry on with. Everything else on the card (the
 * name, the counts, the progress, the space around them) leads to the
 * course's own page, where its curriculum is, and says so under the
 * pointer. A name too long for its line says itself in full instead: that
 * is what the pointer is on it for. The menu holds the other places.
 *
 * A course that has not been started offers only to start it: it has no
 * progress to show, so no bar and no word about it. Once there is progress
 * the card shows how far the learner is and offers to continue.
 *
 * In a single column (a phone) it is a row with a small thumbnail, so a few
 * courses fit on a screen; from two columns up it is the same card the
 * catalogue shows, thumbnail on top, as tall as the others in its row.
 */
export function LearnerCourseCard({
  course,
  href,
  priority,
  menuOpen,
  setMenuOpen,
  onOpen,
  onPin,
  onNavigatePage,
}: {
  course: EnrolledCourse;
  /** The course's address in the player, for the card to be a real link. */
  href: string;
  /** Its thumbnail is among the first pictures on the page. */
  priority: boolean;
  menuOpen: boolean;
  setMenuOpen: (courseId: string | null) => void;
  onOpen: () => void;
  /** Makes this the course the home's hero leads with. */
  onPin: () => void;
  onNavigatePage: NavigateTo;
}) {
  const progress = course.progress ?? 0;
  const completed = progress >= 100;
  const started = progress > 0;
  const action = completed ? "Review" : started ? "Continue" : "Start";
  const actionLabel = completed ? "Review Course" : `${action} Learning`;
  const ActionIcon = completed ? BookOpen : Play;
  const closeThen = (run: () => void) => {
    setMenuOpen(null);
    run();
  };
  const overviewHref = getEnrolledCourseOverviewHref(course);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleCutOff = useIsCutOff(titleRef, course.courseTitle);

  return (
    <article
      aria-label={
        started
          ? `${course.courseTitle}, ${progress}% complete`
          : course.courseTitle
      }
      className="group/card relative flex min-w-0 items-center gap-3.5 overflow-hidden rounded-2xl border border-(--card-border,var(--border)) bg-(--card-surface,var(--surface)) bg-(image:--raised-surface-image) p-3 shadow-(--card-shadow) transition-[background-color,box-shadow] duration-200 hover:bg-(--card-surface-hover,var(--hover)) hover:shadow-(--card-hover-shadow) @lg/courses:flex-col @lg/courses:items-stretch @lg/courses:gap-0 @lg/courses:p-0"
    >
      <div className="relative aspect-video w-30 shrink-0 overflow-hidden rounded-lg bg-[#05070c] @lg/courses:w-auto @lg/courses:rounded-none">
        <LearnerCourseThumbnail course={course} priority={priority} />
        <span
          aria-hidden="true"
          className="absolute inset-0 hidden place-items-center bg-slate-950/50 opacity-0 transition-opacity duration-200 group-has-[[data-course-start]:focus-visible]/card:opacity-100 group-has-[[data-course-start]:hover]/card:opacity-100 motion-reduce:transition-none @lg/courses:grid"
        >
          <span className="grid size-14 place-items-center rounded-full bg-black/70 text-white shadow-[0_10px_28px_rgb(0_0_0/0.5)]">
            <Play size={26} weight="fill" />
          </span>
        </span>
        {/* The picture is the pointer's way into the course. The action
            below is the same link with its name on it, and the one the
            keyboard reaches. */}
        <GuestHomeLink
          href={href}
          onNavigatePage={onOpen}
          tabIndex={-1}
          aria-hidden="true"
          title={actionLabel}
          data-course-start=""
          className="absolute inset-0 z-20"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col @lg/courses:px-4 @lg/courses:pt-2.5 @lg/courses:pb-4">
        <div className="flex min-w-0 items-start gap-1">
          <div className="min-w-0 flex-1">
            {/* A name that is cut off takes the pointer from the link under
                it, to say itself in full, and leads where that link does. */}
            <h3
              ref={titleRef}
              title={titleCutOff ? course.courseTitle : undefined}
              onClick={
                titleCutOff ? () => onNavigatePage(overviewHref) : undefined
              }
              className={`truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.015em] text-(--text) @lg/courses:text-base @lg/courses:leading-10 @2xl/courses:text-lg ${
                titleCutOff ? "relative z-20 cursor-pointer" : ""
              }`}
            >
              {course.courseTitle}
            </h3>
            <p className="truncate text-[0.8125rem] leading-5 text-(--muted) @lg/courses:leading-6">
              {plural(course.totalSections, "Section", "Sections")}
              <span aria-hidden="true" className="mx-2">
                •
              </span>
              {plural(course.totalLessons, "Lecture", "Lectures")}
            </p>
          </div>
          <CourseActionMenu
            open={menuOpen}
            onOpenChange={(open) => setMenuOpen(open ? course.courseId : null)}
            ariaLabel={`Actions for ${course.courseTitle}`}
            className="relative z-30 -mt-2 -mr-2 shrink-0 @lg/courses:mt-0"
            dataMenu=""
          >
            <MenuAction
              Icon={PushPin}
              label="Pin to Home"
              onClick={() => closeThen(onPin)}
            />
            <MenuAction
              Icon={Eye}
              label="Course Overview"
              onClick={() => closeThen(() => onNavigatePage(overviewHref))}
            />
            <MenuAction
              Icon={PaperPlaneTilt}
              label="Open Discussions"
              onClick={() =>
                closeThen(() =>
                  onNavigatePage(`/discussions?course=${course.courseId}`),
                )
              }
            />
          </CourseActionMenu>
        </div>

        {started ? (
          <div className="mt-2 flex items-center gap-3 @lg/courses:mt-3.5">
            <span
              aria-hidden="true"
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-(--track)"
              data-sidebar-swipe-ignore=""
            >
              <span
                className={`block h-full rounded-full ${completed ? "bg-(--success)" : "bg-(--accent)"}`}
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold whitespace-nowrap text-(--text-secondary)">
              {completed ? (
                <>
                  <CheckCircle
                    size={14}
                    weight="fill"
                    aria-hidden="true"
                    className="text-(--success)"
                  />
                  Completed
                </>
              ) : (
                `${progress}% complete`
              )}
            </span>
          </div>
        ) : null}

        {/* Kept to the card's foot, so the actions of a row of cards line
            up whether or not a card has a progress bar over its own. */}
        <div className="mt-auto pt-2.5 @lg/courses:pt-3.5">
          <GuestHomeLink
            href={href}
            onNavigatePage={onOpen}
            aria-label={`${action} ${course.courseTitle}`}
            data-course-start=""
            className={actionClasses}
          >
            <ActionIcon
              size={17}
              weight={completed ? "regular" : "fill"}
              aria-hidden="true"
              className="shrink-0"
            />
            <span className="truncate">{actionLabel}</span>
          </GuestHomeLink>
        </div>
      </div>

      {/* Under everything else on the card: whatever is not the picture,
          the action or the menu is this link, to the course's own page. */}
      <GuestHomeLink
        href={overviewHref}
        onNavigatePage={onNavigatePage}
        aria-label={`View ${course.courseTitle} curriculum`}
        title={VIEW_COURSE_CURRICULUM_HINT}
        className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent)"
      />
    </article>
  );
}
