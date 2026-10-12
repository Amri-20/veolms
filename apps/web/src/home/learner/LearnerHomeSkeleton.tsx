import { useLayoutEffect, useRef, useState } from "react";
import { courseSurfaceElevation } from "../../components/cardElevation";
import { guestHeroDayImage, guestHeroImage } from "../guest/guestHeroImage";
import { GuestHomeSectionHeader } from "../guest/GuestHomeSectionHeader";
import {
  guestHomeBlockStart,
  guestHomeGutter,
  guestHomeSectionGap,
} from "../guest/guestHomeSpacing";
import { HeroPicture, heroSceneClasses } from "../guest/HeroPicture";
import { getHomeTimeGreeting } from "../homeGreeting";
import { LearnerCoursesSubtitle } from "./learnerCoursesSubtitle";
import { LearnerHeroClock } from "./LearnerHeroClock";
import {
  copyOnDeskClasses,
  heroClockClasses,
  heroCopyBoxClasses,
  heroFadeClasses,
  heroGreetingBoxClasses,
  heroGreetingClasses,
  heroNameClasses,
  heroQuoteBoxClasses,
  heroQuoteClasses,
  heroSizeClasses,
  pictureBandClasses,
  picturePlacementClasses,
  resumePaneClasses,
  resumeRowBoxClasses,
  resumeRowContentClasses,
  resumeThumbnailClasses,
} from "./learnerHeroLayout";
import "../guest/guest-home-shell.css";

/**
 * What stands in for something on the learner's home that is still on its
 * way. Each piece here is the size of what it stands in for, so the page
 * does not move when that arrives.
 */
const pulse = "animate-pulse motion-reduce:animate-none";
/** On the hero's picture and on its frosted row. */
const onHero = `${pulse} rounded-md bg-current/14`;
/** On the page's own ground and on its cards. */
const onPage = `${pulse} rounded-md bg-[color-mix(in_srgb,var(--text)_10%,transparent)]`;

/**
 * The most the learner's course list shows: two rows of four on a large
 * monitor. The layout hides what a narrower page has no room for, so the
 * rows it does show are full ones: four rows on a phone, six cards in two
 * or three columns.
 */
export const learnerCourseGridClasses = [
  "grid grid-cols-1 gap-3",
  "@max-lg/courses:[&>*:nth-child(n+5)]:hidden",
  "@lg/courses:grid-cols-2 @lg/courses:gap-4 @lg/courses:@max-[100rem]/courses:[&>*:nth-child(n+7)]:hidden",
  "@2xl/courses:grid-cols-3 @2xl/courses:gap-5",
  "@[100rem]/courses:grid-cols-4",
].join(" ");

/** The part of the page under the hero, with what goes in it. */
export const learnerHomeBodyClasses = `grid min-w-0 pb-[clamp(1.75rem,3.6cqw,3rem)] ${guestHomeSectionGap} ${guestHomeGutter} ${guestHomeBlockStart}`;

/** The page's own box (see `LearnerHome`). */
export const learnerHomePageClasses = `learner-home-page @container/home min-w-0 ${courseSurfaceElevation}`;

/** The learner's name in the greeting, before the session has answered. */
export function LearnerNameSkeleton() {
  return (
    <span
      aria-hidden="true"
      className={`${onHero} inline-block h-[0.72em] w-[3.3em]`}
    />
  );
}

/**
 * A quote of the usual length. It is never shown: it is set as the day's
 * quote will be, in the same face and the same balanced lines, so that the
 * placeholder has the lines a quote has at this width, one where there is
 * room for it on one and two where there is not.
 */
const USUAL_QUOTE = "“Poor is the pupil who does not surpass his master.”";

interface QuoteLine {
  top: number;
  width: number;
}

/**
 * The quote of the day before it has arrived: a bar for each line a quote
 * of the usual length takes here, and one for its author, which stands
 * where the real one will (from the end of the longest line on, and a little
 * lower under a quote of one line).
 *
 * The lines are read off the page, because CSS cannot say where balanced
 * text breaks. Until they have been read (a page built ahead of time has no
 * script yet) there are two.
 */
export function LearnerQuoteSkeleton() {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState<readonly QuoteLine[]>();

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return undefined;
    const read = () => {
      const range = document.createRange();
      range.selectNodeContents(text);
      const box = text.getBoundingClientRect();
      const found: QuoteLine[] = [];
      for (const rect of range.getClientRects()) {
        const top = Math.round(rect.top - box.top + rect.height / 2);
        const width = Math.round(rect.right - box.left);
        const line = found.find((entry) => Math.abs(entry.top - top) < 4);
        if (line) line.width = Math.max(line.width, width);
        else if (width > 0) found.push({ top, width });
      }
      setLines((current) =>
        current &&
        current.length === found.length &&
        current.every(
          (line, index) =>
            line.top === found[index]?.top &&
            line.width === found[index]?.width,
        )
          ? current
          : found,
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(text);
    // The serif face arrives after the first paint and changes the lines.
    void document.fonts.ready.then(read);
    return () => observer.disconnect();
  }, []);

  const longest = lines ? Math.max(0, ...lines.map((line) => line.width)) : 0;
  return (
    <div aria-hidden="true" className={heroQuoteBoxClasses}>
      <div className="relative">
        <p
          ref={textRef}
          className={`${heroQuoteClasses} invisible select-none`}
        >
          {USUAL_QUOTE}
        </p>
        {lines ? (
          lines.map((line) => (
            <span
              key={line.top}
              style={{ top: line.top, width: line.width }}
              className={`${onHero} absolute left-0 block h-4 -translate-y-1/2`}
            />
          ))
        ) : (
          <>
            <span
              className={`${onHero} absolute top-[0.65em] left-0 block h-4 w-full -translate-y-1/2`}
            />
            <span
              className={`${onHero} absolute top-[1.95em] left-0 block h-4 w-4/5 -translate-y-1/2`}
            />
          </>
        )}
      </div>
      {/* The author starts where the longest line of the quote ends, as the
          real one does, or ends with the box where there is no room for
          that. */}
      <span
        style={
          longest
            ? { marginLeft: `min(${longest}px, calc(100% - 9rem))` }
            : undefined
        }
        className={`${onHero} block h-3 w-36 ${longest ? "" : "ml-auto"} ${
          lines?.length === 1 ? "mt-3.5" : "mt-2"
        } mb-0.5`}
      />
    </div>
  );
}

/** The hero's course row (see `LearnerResumeRow`), before its course is known. */
export function LearnerResumeRowSkeleton() {
  return (
    <div className={resumeRowBoxClasses} aria-hidden="true">
      <div className={resumePaneClasses}>
        <div className={resumeRowContentClasses}>
          <span className={`${resumeThumbnailClasses} ${onHero}`} />
          <div className="min-w-0 flex-1 @[50rem]/home:w-52 @[50rem]/home:flex-none">
            <span className={`${onHero} block h-3 w-28`} />
            <span className={`${onHero} mt-2.5 block h-4 w-full max-w-52`} />
          </div>
          <span
            className={`${onHero} mb-1 block h-11 w-full shrink-0 rounded-[0.625rem] @[28rem]/resume:w-24 @[50rem]/home:w-24`}
          />
        </div>
      </div>
    </div>
  );
}

/** One of the learner's course cards (see `LearnerCourseCard`). */
function LearnerCourseCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 overflow-hidden rounded-2xl border border-(--card-border,var(--border)) bg-(--card-surface,var(--surface)) bg-(image:--raised-surface-image) p-3 shadow-(--card-shadow) @lg/courses:flex-col @lg/courses:items-stretch @lg/courses:gap-0 @lg/courses:p-0">
      <span
        className={`${onPage} block aspect-video w-30 shrink-0 rounded-lg @lg/courses:w-auto @lg/courses:rounded-none`}
      />
      <div className="flex min-w-0 flex-1 flex-col @lg/courses:px-4 @lg/courses:pt-2.5 @lg/courses:pb-4">
        <span className="flex h-6 items-center @lg/courses:h-10">
          <span className={`${onPage} block h-4 w-3/4`} />
        </span>
        <span className="flex h-5 items-center @lg/courses:h-6">
          <span className={`${onPage} block h-3 w-1/2`} />
        </span>
        <span className="block pt-2.5 @lg/courses:pt-3.5">
          <span
            className={`${onPage} block h-9 w-full rounded-[10px] @lg/courses:h-11`}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * The learner's course list before the courses are known: its heading and
 * the line under it (see `LearnerCoursesSubtitle`), and cards standing in
 * for the first row.
 */
export function LearnerCoursesSkeleton() {
  return (
    <section
      aria-labelledby="learner-home-courses-title"
      aria-busy="true"
      className="@container/courses min-w-0"
    >
      <GuestHomeSectionHeader
        id="learner-home-courses-title"
        title="My Courses"
        subtitle={<LearnerCoursesSubtitle />}
      />
      <div aria-hidden="true" className={`mt-5 ${learnerCourseGridClasses}`}>
        <LearnerCourseCardSkeleton />
        <LearnerCourseCardSkeleton />
        <LearnerCourseCardSkeleton />
      </div>
      <span className="sr-only" role="status">
        Loading your courses
      </span>
    </section>
  );
}

/**
 * The learner's home before its own code has arrived: the hero's picture,
 * which is the same for everyone and is asked for with the page, the
 * heading of the course list, and placeholders where the learner's own
 * things will be. It knows no learner unless it is told the name, and the
 * one thing it reads the clock for, the date and time over the greeting,
 * corrects itself in the browser (see `LearnerHeroClock`), so it can be
 * rendered ahead of time.
 *
 * The home itself takes over from it (see `LearnerHome`), laid out the same
 * way, so nothing on the page moves when it does.
 */
export function LearnerHomeShell({
  learnerName = "",
}: {
  /**
   * The name this tab remembers, where the shell is only ever rendered in
   * the browser. The greeting is then said outright instead of held by a
   * placeholder, and the quote under it wraps as it will. The clock is read
   * to say it, so a page built ahead of time must not be given one.
   */
  learnerName?: string;
}) {
  const firstName = learnerName.trim().split(/\s+/u)[0] ?? "";
  const pictures = (
    <>
      <HeroPicture
        picture={guestHeroImage}
        position={picturePlacementClasses}
        priority
        className="-z-40 max-sm:translate-x-[calc(0.34%+0.72px)] [:root[data-theme=light]_&]:invisible"
      />
      <HeroPicture
        picture={guestHeroDayImage}
        position={picturePlacementClasses}
        className="-z-20 hidden [:root[data-theme=light]_&]:block"
      />
    </>
  );
  return (
    <div className={learnerHomePageClasses}>
      <section
        aria-label="Your home is loading"
        aria-busy="true"
        className={`${heroSceneClasses} ${heroSizeClasses}`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 ${heroFadeClasses}`}
        />
        <div className={heroCopyBoxClasses}>
          <div className={copyOnDeskClasses} aria-hidden="true">
            <div className={heroGreetingBoxClasses}>
              <div className="min-w-0">
                <LearnerHeroClock
                  className={heroClockClasses}
                  fillBeforePaint
                />
                <p className={heroGreetingClasses}>
                  {firstName ? (
                    <>
                      {getHomeTimeGreeting(new Date().getHours())},{" "}
                      <span className={heroNameClasses}>{firstName}.</span>
                    </>
                  ) : (
                    <span
                      className={`${onHero} inline-block h-[0.72em] w-[10.4em] max-w-full`}
                    />
                  )}
                </p>
              </div>
              <LearnerQuoteSkeleton />
            </div>
            <LearnerResumeRowSkeleton />
          </div>
          <div className={pictureBandClasses}>{pictures}</div>
        </div>
      </section>
      <div className={learnerHomeBodyClasses}>
        <LearnerCoursesSkeleton />
      </div>
    </div>
  );
}
