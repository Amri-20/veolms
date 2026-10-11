import { ArrowElbowDownLeftIcon as ArrowElbowDownLeft } from "@phosphor-icons/react/ArrowElbowDownLeft";
import { PushPinIcon as PushPin } from "@phosphor-icons/react/PushPin";
import type {
  EnrolledCourse,
  LearningProgressResumeContextResponse,
} from "@veolms/contracts";
import { useRef } from "react";
import type { NavigateTo } from "../../routing/navigation";
import { GuestHomeLink } from "../guest/GuestHomeLink";
import {
  lampLightLayerClasses,
  primaryActionClasses,
} from "../guest/heroActionClasses";
import { playEnterKeySound } from "./enterKeySound";
import { LearnerCourseThumbnail } from "./LearnerCourseThumbnail";
import {
  getEnrolledCourseOverviewHref,
  VIEW_COURSE_CURRICULUM_HINT,
  type LearnerHeroIntent,
} from "./learnerHomePlan";
import { useEnterKeyAction } from "./useEnterKeyAction";
import { useIsCutOff } from "./useIsCutOff";

/** Where in the course the learner goes next, once it is known. */
export interface LearnerResume {
  context: LearningProgressResumeContextResponse | null;
  isLoading: boolean;
}

/** What the row is for, said before where the learner is in the course. */
const leadLabels: Record<LearnerHeroIntent, string> = {
  start: "Start",
  continue: "Continue",
  next: "Up next",
  review: "Completed",
};

/**
 * The course is a thin row on a frosted surface: its thumbnail, what to do
 * and where the learner is, the course's title over its progress, and the
 * one action. The surface is the theme's own ground, the page's below the
 * hero, let through by a third, so it is dark with light words by night and
 * light with dark words by day. It has no border and no edge of any kind: a
 * soft shadow under it is all that sets it off the picture. While the lamp
 * is on, its warm light falls on the surface too.
 *
 * Beside the picture (a page 50rem or wider) the row blurs the desk behind
 * it and is only as wide as what is in it, so the action stands just past
 * the end of the title; a long title is cut off with an ellipsis once the
 * row would pass 35rem, or the room the hero has for it. Stacked, the row
 * takes the page's width, and nothing lies behind it but the hero's plain
 * ground, so it is not blurred.
 *
 * The row lies in one line beside the picture, and wherever it is 28rem
 * wide or more. Narrower than that on a stacked page (a phone) the title
 * may take two lines and the action a line of its own, at full width.
 * Beside the picture on a page under 56rem, where the hero has little room
 * for the row and no height to spare, it keeps to one line and gives up its
 * thumbnail for the title instead.
 *
 * A row sized by what is in it cannot also be measured by what is in it, so
 * beside the picture it is not a container, and everything there is chosen
 * by the page's width alone.
 */
const paneClasses = [
  "relative isolate overflow-hidden rounded-[1.125rem] text-(--text)",
  "bg-[color-mix(in_srgb,var(--main-surface,var(--surface))_66%,transparent)]",
  "shadow-[0_20px_44px_-14px_rgb(0_0_0/0.5)] [:root[data-theme=light]_&]:shadow-[0_20px_44px_-16px_rgb(15_23_42/0.3)]",
  "@[50rem]/home:backdrop-blur-xl",
].join(" ");

/**
 * The lamp's light on the pane, while the lamp is on. Beside the picture
 * the lamp hangs above the pane and to its right, and lights its top right
 * corner. Stacked, the lamp is in the picture under the pane, so the light
 * comes up from its bottom right corner instead.
 */
const paneLampLightClasses = `${lampLightLayerClasses} @max-[50rem]/home:bg-[radial-gradient(118%_130%_at_100%_100%,rgb(255_190_120/0.4),rgb(255_190_120/0.2)_26%,rgb(255_190_120/0.08)_52%,transparent_78%)]`;

/**
 * The action is drawn as the Enter key of a keyboard, in the accent's
 * colour: a cap with a lit top edge standing on a darker side, which it
 * sinks into while it is pressed, by the pointer or by the Enter key itself
 * (see `useEnterKeyAction`), with the sound of a mechanical keyboard's
 * (see `enterKeySound`). It is named for the key, "Enter", whatever the
 * learner is to do in the course; the line beside it says that. The key's
 * own sign follows its name where there is likely to be a keyboard; a
 * touch screen has no Enter to press.
 */
const enterKeyClasses = [
  "[--key-side:color-mix(in_srgb,var(--accent)_56%,black)]",
  "mb-1 rounded-[0.625rem]!",
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.5),inset_0_-1px_0_rgb(0_0_0/0.14),0_4px_0_var(--key-side),0_10px_16px_-6px_rgb(0_0_0/0.65)]!",
  "transition-[background-color,box-shadow,translate]! duration-75! motion-reduce:transition-none!",
  "active:translate-y-0.75 active:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-1px_0_rgb(0_0_0/0.14),0_1px_0_var(--key-side),0_3px_6px_-3px_rgb(0_0_0/0.6)]!",
  "data-pressed:translate-y-0.75 data-pressed:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-1px_0_rgb(0_0_0/0.14),0_1px_0_var(--key-side),0_3px_6px_-3px_rgb(0_0_0/0.6)]!",
].join(" ");

/**
 * The course the hero leads with, as a row (see `paneClasses`). The whole
 * row opens the course at the lesson to carry on with, and so does the
 * Enter key.
 */
export function LearnerResumeRow({
  course,
  intent,
  resume,
  href,
  onOpen,
  pinned,
  onUnpin,
  onNavigatePage,
}: {
  course: EnrolledCourse;
  intent: LearnerHeroIntent;
  resume: LearnerResume;
  /** The course's address, for the action to be a real link. */
  href: string;
  onOpen: () => void;
  /** The learner pinned this course here; the row lets them take it off. */
  pinned: boolean;
  onUnpin: () => void;
  /** For the course's name, which leads to the course's own page. */
  onNavigatePage: NavigateTo;
}) {
  const progress = course.progress ?? 0;
  // A course not started yet has no progress to speak of.
  const showProgress = intent === "continue" || intent === "review";
  const actionRef = useRef<HTMLAnchorElement>(null);
  const enterPressed = useEnterKeyAction(actionRef, onOpen);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleCutOff = useIsCutOff(titleRef, course.courseTitle);

  const lesson = intent === "review" ? null : resume.context?.resumeLesson;
  const totalLessons = resume.context?.totalLessons ?? course.totalLessons;
  const place = lesson
    ? `Lesson ${lesson.lessonNumber} of ${totalLessons}`
    : `${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}`;

  return (
    <div className="@container/resume w-full @[50rem]/home:w-fit @[50rem]/home:max-w-[min(35rem,100%)] @[50rem]/home:[container-type:normal]">
      <div className={paneClasses}>
        <span aria-hidden="true" className={paneLampLightClasses} />
        {/* The whole row opens the course, so the pointer is a hand all over
            it. This lies under the words, which let the pointer through to
            it; the action is the same link, with its name. */}
        <GuestHomeLink
          href={href}
          onNavigatePage={onOpen}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit]"
        />

        <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-3.5 gap-y-3 p-3 @[28rem]/resume:flex-nowrap @[50rem]/home:flex-nowrap @[50rem]/home:p-2.5">
          <span className="block h-15 w-26 shrink-0 overflow-hidden rounded-[0.625rem] @[50rem]/home:@max-[56rem]/home:hidden">
            <LearnerCourseThumbnail course={course} priority />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-xs text-(--muted)">
                {leadLabels[intent]}
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                {place}
              </p>
              {/* A pinned course stays here until the pin is taken off, and
                  this is the only place it can be: the row's course is not
                  among the cards below, whose menus do the pinning. */}
              {pinned ? (
                <button
                  type="button"
                  onClick={onUnpin}
                  title="Unpin from Home"
                  aria-label={`Unpin ${course.courseTitle} from Home`}
                  className="pointer-events-auto -my-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-[color-mix(in_srgb,var(--accent)_70%,white)] transition-colors hover:bg-current/12 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current [:root[data-theme=light]_&]:text-(--accent)"
                >
                  <PushPin size={13} weight="fill" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {/* The name is the one thing on the row that does not open the
                lesson: it leads to the course's own page, where the
                curriculum is, and says so under the pointer. A name that is
                cut off says itself in full instead. Only its letters take
                the pointer; the rest of the line is the row's link. */}
            <h2
              ref={titleRef}
              className="mt-0.5 line-clamp-2 text-[0.9375rem] leading-snug font-semibold @[28rem]/resume:block @[28rem]/resume:truncate @[50rem]/home:block @[50rem]/home:truncate"
            >
              <GuestHomeLink
                href={getEnrolledCourseOverviewHref(course)}
                onNavigatePage={onNavigatePage}
                title={
                  titleCutOff ? course.courseTitle : VIEW_COURSE_CURRICULUM_HINT
                }
                className="pointer-events-auto rounded-xs underline-offset-[3px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {course.courseTitle}
              </GuestHomeLink>
            </h2>
            {showProgress ? (
              <div className="mt-1.5 flex items-center gap-2.5">
                <span
                  role="progressbar"
                  aria-label={`${course.courseTitle} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="block h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-current/14"
                >
                  <span
                    className="block h-full min-w-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_70%,white)] [:root[data-theme=light]_&]:bg-(--accent)"
                    style={{ width: `${progress}%` }}
                  />
                </span>
                <span className="text-xs leading-4 text-(--muted)">
                  {progress}%
                </span>
              </div>
            ) : null}
          </div>

          {/* The shared action is taller, and wider at its sides, than the
              row has room for. */}
          <GuestHomeLink
            ref={actionRef}
            href={href}
            onNavigatePage={onOpen}
            data-control-radius-action
            data-pressed={enterPressed ? "" : undefined}
            aria-keyshortcuts="Enter"
            aria-label={`Enter ${course.courseTitle}`}
            // The key sounds under the pointer as it does under the Enter key.
            onPointerDown={(event) => {
              if (event.button === 0) playEnterKeySound("down");
            }}
            onPointerUp={(event) => {
              if (event.button === 0) playEnterKeySound("up");
            }}
            className={`${primaryActionClasses} ${enterKeyClasses} pointer-events-auto min-h-11! w-full shrink-0 px-5! text-[0.9375rem]! @[28rem]/resume:w-auto @[50rem]/home:w-auto`}
          >
            Enter
            <ArrowElbowDownLeft
              size={17}
              weight="bold"
              aria-hidden="true"
              className="hidden opacity-75 [@media(hover:hover)_and_(pointer:fine)]:block"
            />
          </GuestHomeLink>
        </div>
      </div>
    </div>
  );
}
