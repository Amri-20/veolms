import type { EnrolledCourse } from "@veolms/contracts";
import type { ReactNode } from "react";
import type { NavigateTo } from "../../routing/navigation";
import { HeroDesk } from "../guest/HeroDesk";
import {
  guestHomeGutter,
  guestHomeGutterBleed,
} from "../guest/guestHomeSpacing";
import { LearnerHeroClock } from "./LearnerHeroClock";
import type { LearnerHeroIntent } from "./learnerHomePlan";
import { LearnerResumeRow, type LearnerResume } from "./LearnerResumeRow";

/**
 * The line the hero leaves the learner with. One for now; it is to be
 * picked from a list of them later.
 */
const heroQuote = {
  text: "The beautiful thing about learning is that nobody can take it away from you.",
  author: "B.B. King",
};

/**
 * The band the picture gets on a page too narrow to show it beside the copy:
 * it runs edge to edge under the copy, its top faded into the hero so the
 * copy seems to stand against the same wall. Its bottom is the hero's own
 * edge.
 */
const pictureBandClasses = [
  "pointer-events-none! relative mt-1 self-stretch",
  guestHomeGutterBleed,
  "@max-[50rem]/home:h-60 @max-[50rem]/home:sm:h-[clamp(20rem,46cqw,23rem)]",
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(to_bottom,#050915_0,rgb(5_9_21/0.5)_18%,transparent_42%)]",
  "[:root[data-theme=light]_&]:before:bg-[linear-gradient(to_bottom,#f4ecdf_0,rgb(244_236_223/0.55)_18%,transparent_42%)]",
  "@[50rem]/home:static @[50rem]/home:mx-0 @[50rem]/home:mt-0 @[50rem]/home:before:hidden",
].join(" ");

/**
 * How tall the hero is where the copy lies beside the picture, and how tall
 * the picture then is. Both are handed down as custom properties because the
 * copy is placed from them (see `copyOnDeskClasses`).
 *
 * The hero is a third of its width tall, between 29rem and 34rem. Under
 * 85rem of page it eases down, to 27rem at 80rem and narrower: the picture
 * covers the hero from its right edge, so a shorter hero draws the desk
 * smaller, and that is what leaves the copy room beside the mug and the
 * laptop.
 *
 * Under 64rem the hero eases down once more, to 25rem at 50rem, for the
 * same reason: it is what keeps the course's row off the laptop for as
 * long as possible on the narrowest pages that still lay the copy beside
 * the picture. The two slopes are added, each from its own resting height.
 *
 * The picture is as tall as the hero, or a third of the hero's width where
 * that is more (a very wide page, on which it is cropped top and bottom).
 *
 * `--picture-shift` is how far the picture's right edge is drawn past the
 * hero's (see `picturePlacementClasses`): 0.216 of the picture's height,
 * which is 144 of its own pixels, or as much of that as the picture has to
 * spare on the left. A page wide enough to show the whole picture has none
 * to spare and shows it as it is. The band of a page that stacks (a tablet
 * held upright) always has it to spare.
 */
const heroSizeClasses = [
  "justify-start",
  "@[50rem]/home:[--hero-h:max(calc(clamp(25rem,17.85rem_+_14.3cqw,27rem)_+_clamp(27rem,40.22cqw_-_5rem,29rem)_-_27rem),min(33.4cqw,34rem))]",
  "@[50rem]/home:[--picture-h:max(var(--hero-h),33.35cqw)]",
  "@[50rem]/home:[--picture-shift:min(calc(var(--picture-h)_*_0.216),max(0px,calc(var(--picture-h)_*_2.9985_-_100cqw)))]",
  "@max-[50rem]/home:sm:[--picture-shift:calc(clamp(20rem,46cqw,23rem)_*_0.216)]",
  "@[50rem]/home:min-h-(--hero-h)",
].join(" ");

/**
 * Where the four pictures of the scene (night and day, lamp on and off) are
 * held. They share this, so the scene never moves between them.
 *
 * A phone has its own crop, which ends just past the laptop. Wider pages
 * draw the panorama, whose last tenth, to the right of the laptop, is the
 * lamp, the mouse and a shelf. Held to the hero's right edge, that left the
 * laptop well inside the hero on every page too narrow for the whole
 * picture, and the course's row lying over it. So the picture's box is made
 * wider than the hero by `--picture-shift` and the picture held to the
 * box's right edge: the same slice of the scene is past the hero's edge at
 * every size. The hero's edge falls just past the lid's top corner and
 * just before the mouse, which is not to be seen there; a third of the
 * lamp's shade is left to be switched.
 *
 * It is the box that is widened, not the picture that is moved: the
 * laptop's screen and the lamp's switch are placed by measuring the box and
 * the position in it (`heroPictureGeometry`), and follow. An image is held
 * to its container's width by default, which the wider box has to be let
 * out of.
 */
const picturePlacementClasses =
  "object-[62%_center] sm:w-[calc(100%_+_var(--picture-shift,0px))]! sm:max-w-none sm:object-[100%_center]";

/**
 * The layer that deepens the picture behind the copy. Its stops are set
 * from where the laptop is rather than from the hero's width, so the
 * laptop's near edge is dimmed by the same small amount on every page: the
 * laptop's screen begins 1.05 picture heights in from the picture's right
 * edge, which is `--picture-shift` past the hero's, and the fade is spent
 * a little way past that.
 */
const heroFadeClasses = [
  "hidden @[50rem]/home:block",
  "@[50rem]/home:bg-[linear-gradient(to_right,rgb(5_9_21/0.94)_0,rgb(5_9_21/0.8)_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_0.573),rgb(5_9_21/0.3)_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_0.978),transparent_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_1.28))]",
  "@[50rem]/home:[:root[data-theme=light]_&]:bg-[linear-gradient(to_right,rgb(250_245_236/0.9)_0,rgb(250_245_236/0.72)_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_0.573),rgb(250_245_236/0.24)_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_0.944),transparent_calc((100%_-_var(--picture-h)_*_1.05_+_var(--picture-shift))_*_1.214))]",
].join(" ");

/**
 * Where the copy stands beside the picture: in the middle of the hero's
 * height, which is about the middle of the laptop's display, with the same
 * room between its three parts (the date and greeting, the quote, the
 * course's row). That room is a share of the hero's height, so a taller
 * hero spreads the copy further up and down.
 */
const copyOnDeskClasses = [
  "flex w-full flex-col gap-y-4",
  "@[50rem]/home:min-h-(--hero-h) @[50rem]/home:justify-center",
  "@[50rem]/home:gap-y-[clamp(1.25rem,calc(var(--hero-h)_*_0.06),2rem)]",
].join(" ");

/**
 * The hero of an enrolled learner's home: a greeting, what to do next, the
 * course to do it in, and their learning goals on the laptop in the picture.
 *
 * A page 50rem or wider lays the copy over the picture's empty left side,
 * as the guest hero does. The picture is held by its right side (see
 * `picturePlacementClasses`), so the desk keeps its size and place there
 * however wide the hero is. The
 * copy is the date and time, the greeting on one line, a quote, and the
 * course to carry on with as a thin row, evenly spaced and centred in the
 * hero's height (see `copyOnDeskClasses`).
 *
 * The copy's box ends a picture's height in from the hero's right edge,
 * and the greeting is cut off there rather than wrapped, so that it stays
 * one line. The laptop's lid begins `--picture-shift` further on, which is
 * the room between the course's row and the laptop.
 *
 * Narrower pages (a tablet held upright, a phone) stack them: the same
 * copy, and the picture in a band of its own below it.
 */
export function LearnerHomeHero({
  timeGreeting,
  firstName,
  intent,
  course,
  resume,
  courseHref,
  onOpenCourse,
  pinned,
  onUnpin,
  onNavigatePage,
  laptopScreen,
}: {
  /** "Good evening", by the hour. */
  timeGreeting: string;
  /** The learner's first name; it may be empty. */
  firstName: string;
  intent: LearnerHeroIntent;
  course: EnrolledCourse;
  resume: LearnerResume;
  courseHref: string;
  onOpenCourse: () => void;
  /** The learner pinned this course to the home, and may take the pin off. */
  pinned: boolean;
  onUnpin: () => void;
  onNavigatePage: NavigateTo;
  /** What the laptop in the picture shows (see `HeroDesk`). */
  laptopScreen: ReactNode;
}) {
  return (
    <HeroDesk
      labelledBy="learner-home-hero-title"
      className={heroSizeClasses}
      fadeClassName={heroFadeClasses}
      picturePosition={picturePlacementClasses}
      laptopScreen={laptopScreen}
    >
      {(pictures) => (
        <div
          data-learner-home-hero=""
          // The box lies over the picture without showing; it lets the
          // pointer through to the laptop, and only its own content takes it.
          className={`pointer-events-none flex w-full flex-col items-start pt-7 *:pointer-events-auto ${guestHomeGutter} @[50rem]/home:max-w-[min(57rem,calc(100cqw_-_var(--picture-h)))] @[50rem]/home:pt-0 @[50rem]/home:pr-0`}
        >
          {/* Like the box around it, this one takes no pointer itself. */}
          <div
            className={`pointer-events-none! *:pointer-events-auto ${copyOnDeskClasses}`}
          >
            {/* Beside the picture the greeting and the quote share a box that
                is only as wide as the greeting is long: the quote has no
                width of its own there, so it wraps inside the greeting's
                and its author ends where the greeting does, well clear of
                the laptop. A short greeting still leaves it 22rem. */}
            <div className="flex min-w-0 flex-col gap-y-[inherit] @[50rem]/home:w-fit @[50rem]/home:max-w-full @[50rem]/home:min-w-[min(22rem,100%)]">
              <div className="min-w-0">
                <LearnerHeroClock className="text-xs leading-4 font-semibold tracking-[0.16em] text-slate-400 uppercase [:root[data-theme=light]_&]:text-slate-600" />
                <h1
                  id="learner-home-hero-title"
                  // The line is cut off rather than wrapped, and what cuts it off also
                  // cuts whatever hangs out of the line's box. The font's letters are
                  // 1.36 times its size from top to tail, so the box is made that tall
                  // (or the "g" of a name loses its foot) and the margins take the
                  // extra back.
                  className="-mb-1 truncate text-[clamp(1.375rem,6.4cqw,2rem)] leading-[1.4] font-bold tracking-[-0.025em] @[50rem]/home:mt-0.5 @[50rem]/home:text-[clamp(1.75rem,3.5cqw,2.75rem)]"
                >
                  {firstName ? (
                    <>
                      {timeGreeting},{" "}
                      <span className="text-[color-mix(in_srgb,var(--accent)_66%,white)] [:root[data-theme=light]_&]:text-(--accent-ink,var(--accent))">
                        {firstName}.
                      </span>
                    </>
                  ) : (
                    `${timeGreeting}.`
                  )}
                </h1>
              </div>

              {/* The quote is set in lines of about the same length, so a
                long one grows downwards rather than across. Its size steps
                up with the page at fixed widths; it does not scale with it. */}
              <figure className="min-w-0 @[50rem]/home:w-0 @[50rem]/home:min-w-full">
                <blockquote className="font-serif text-lg leading-[1.3] text-balance text-slate-200 italic @[72rem]/home:text-xl @[90rem]/home:text-[1.375rem] [:root[data-theme=light]_&]:text-slate-700">
                  “{heroQuote.text}”
                </blockquote>
                <figcaption className="mt-1.5 flex items-center justify-end gap-2.5 text-[0.8125rem] leading-4 text-slate-400 [:root[data-theme=light]_&]:text-slate-600">
                  <span aria-hidden="true" className="h-px w-6 bg-current/60" />
                  {heroQuote.author}
                </figcaption>
              </figure>
            </div>

            <LearnerResumeRow
              course={course}
              intent={intent}
              resume={resume}
              href={courseHref}
              onOpen={onOpenCourse}
              pinned={pinned}
              onUnpin={onUnpin}
              onNavigatePage={onNavigatePage}
            />
          </div>

          <div className={pictureBandClasses}>{pictures}</div>
        </div>
      )}
    </HeroDesk>
  );
}
