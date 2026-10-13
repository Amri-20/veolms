import type { MouseEvent } from "react";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { BookOpen } from "@phosphor-icons/react/BookOpen";
import { Clock } from "@phosphor-icons/react/Clock";
import { Play } from "@phosphor-icons/react/Play";
import { Stack } from "@phosphor-icons/react/Stack";
import type { Course } from "../catalogue";
import { CourseWishlistHeartButton } from "../CourseWishlistHeartButton";
import { CourseHeroArtwork } from "./CourseHeroArtwork";

export interface CourseOverviewHeroProps {
  title: string;
  /** The course's short description, shown under the title. */
  shortDescription?: string;
  sections: number;
  lessons: number;
  duration: string;
  thumbnail: string;
  thumbnailSrcSet?: Course["thumbnailSrcSet"];
  onBack?: () => void;
  /** Where the back link leads, as the link reads: "All courses", "Home". */
  backLabel?: string;
  /** Left out for someone who manages the course. */
  wishlist?: {
    wishlisted: boolean;
    disabled: boolean;
    onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  /** Left out when the course has nothing a visitor can watch yet. */
  preview?: { onOpen: () => void; disabled: boolean };
  placement?: HeroPlacement;
}

/**
 * Where the hero sits.
 *
 * - `card`: a rounded card in the page's column, for the course editor's
 *   preview window.
 * - `edge`: on the course page itself, where it touches the application
 *   frame at the top and on both sides, as the home page's hero does.
 */
export type HeroPlacement = "card" | "edge";

/**
 * The hero is dark by day as well: its ground is the course thumbnail, and
 * white text is the only text that reads on every thumbnail.
 */
const heroSurfaceClasses =
  "@container/hero relative isolate overflow-hidden bg-(--hero-base) text-white [--hero-base:color-mix(in_srgb,var(--accent)_9%,#080b13)]";

/**
 * The text column: under the picture when stacked, beside it when wide. Wide,
 * it is as tall as the hero, with the title at the top under the back link
 * and the course facts at the bottom. Its width limit is its right edge, so
 * it has no padding there: at the narrowest wide hero the three facts need
 * all of it to stay on one line. The hero is kept low, and grows only on a
 * monitor wide enough that the picture would otherwise be a small part of it.
 */
const heroTextClasses =
  "relative z-10 flex flex-col gap-3 pb-5 @3xl/hero:min-h-[clamp(14.5rem,28cqi,max(16.5rem,min(15cqi,21rem)))] @3xl/hero:justify-between @3xl/hero:gap-4 @3xl/hero:pr-0";

/**
 * The column the hero's text and everything below the hero keep to. Its
 * width (1100px) is written into the edge placement below as 68.75rem.
 * `data-fixed-radius` goes with it: the radius preference rounds every box
 * directly inside the page, and this one is only a wrapper.
 */
export const overviewColumnClasses =
  "mx-auto box-border flex w-full max-w-275 flex-col gap-4";

/**
 * What differs between the two placements.
 *
 * The edge hero is pulled out over the shell's page padding by that padding's
 * own lengths, which the shell publishes as custom properties. Its contents
 * keep to the column the cards below sit in: that column is the page inside
 * its gutters, at most 1100px (68.75rem) wide and centred, so its edge is one
 * gutter in, or half of what the hero has beyond 1100px once that is more.
 * The heart and the preview button stay in the frame's corners, over the
 * picture.
 */
export const heroPlacementClasses: Record<
  HeroPlacement,
  { surface: string; controls: string; text: string; pill: string }
> = {
  card: {
    surface: `${heroSurfaceClasses} rounded-2xl border border-white/8 shadow-(--card-shadow)`,
    controls: "p-3 @3xl/hero:p-5",
    text: `${heroTextClasses} px-4 @3xl/hero:pl-5`,
    pill: "right-5",
  },
  edge: {
    surface: `${heroSurfaceClasses} -mx-(--application-page-inline-gutter) -mt-(--application-page-block-start)`,
    controls:
      "px-(--application-page-inline-gutter) py-3 @3xl/hero:py-5 @3xl/hero:pl-[max(var(--application-page-inline-gutter),(100cqi_-_68.75rem)/2)]",
    text: `${heroTextClasses} px-[calc(var(--application-page-inline-gutter)_+_1rem)] @3xl/hero:pl-[max(var(--application-page-inline-gutter),(100cqi_-_68.75rem)/2)]`,
    pill: "right-(--application-page-inline-gutter)",
  },
};

const heroControlClasses =
  "pointer-events-auto cursor-pointer items-center justify-center border border-white/18 bg-slate-950/70 text-white transition-colors duration-160 ease-out hover:bg-slate-950/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default";

const previewPillClasses = `${heroControlClasses} h-12 gap-2.5 rounded-full px-5 text-[0.92rem] font-semibold`;

const previewPillContent = (
  <>
    <Play size={17} weight="bold" aria-hidden="true" />
    <span>Preview Course</span>
  </>
);

// Left out while the row is too narrow to hold all three facts on one line:
// a dot must not end up alone at the end of a line.
const metaSeparator = (
  <span
    className="hidden text-[0.8rem] text-white/35 @md/hero:inline"
    aria-hidden="true"
  >
    •
  </span>
);

export function CourseOverviewHero({
  title,
  shortDescription,
  sections,
  lessons,
  duration,
  thumbnail,
  thumbnailSrcSet,
  onBack,
  backLabel = "Back",
  wishlist,
  preview,
  placement = "card",
}: CourseOverviewHeroProps) {
  const placed = heroPlacementClasses[placement];
  // The short description is one paragraph here, whatever line breaks it
  // was written with, cut to two or three lines.
  const summary = shortDescription?.replace(/\s+/g, " ").trim();
  // Stacked, the text tucks up into the picture's fading lower edge. With no
  // picture it starts below the buttons in the corners instead.
  const stackedTop = thumbnail ? "-mt-[7cqi]" : "pt-18";
  // The picture is 56.25cqi tall and the title starts 7cqi up into it; the
  // heart (2.75rem) sits a little above that line. With no picture it goes
  // back to the top corner.
  const stackedCorner = thumbnail ? "top-[calc(49.25cqi_-_3.25rem)]" : "top-3";
  // Wide, the title starts on a line of its own under the back link.
  const wideTop = onBack ? "@3xl/hero:pt-16" : "@3xl/hero:pt-6";
  // Beside a picture the text keeps to its half; alone it may run wider.
  const wideWidth = thumbnail
    ? "@3xl/hero:max-w-[52%]"
    : "@3xl/hero:max-w-[72%]";
  // A long title takes smaller type, so it does not push the hero to twice
  // its height. Sized against the hero's own width (cqi), not the window's;
  // a short title grows a little more on a hero as wide as a large monitor.
  const titleSize =
    title.length > 70
      ? "text-[clamp(1.3rem,0.9rem+1.6cqi,1.85rem)]"
      : title.length > 44
        ? "text-[clamp(1.45rem,0.95rem+2.1cqi,2.15rem)]"
        : "text-[clamp(1.6rem,1rem+2.6cqi,max(2.5rem,min(2.3cqi,3.25rem)))]";

  return (
    <section
      aria-labelledby="cov-hero-title"
      className={placed.surface}
      // The radius preference rounds every section on this page; at the
      // frame's edge the frame does the rounding.
      data-fixed-radius={placement === "edge" ? "" : undefined}
    >
      <CourseHeroArtwork
        title={title}
        thumbnail={thumbnail}
        thumbnailSrcSet={thumbnailSrcSet}
        onPreview={preview?.onOpen}
        previewDisabled={preview?.disabled}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 ${placed.controls}`}
      >
        {onBack ? (
          // A link that says where it leads. Over the picture (stacked)
          // it keeps the dark glass the other controls have, so its words
          // read on any thumbnail; beside the picture it is plain words.
          // The words are in the theme's accent, lightened: the hero is
          // dark in every theme, and a dark accent would not show on it.
          // It rests slightly dull and comes up to its full colour under
          // the pointer; nothing moves and nothing is underlined.
          <button
            type="button"
            className={`${heroControlClasses} inline-flex h-9 gap-2 rounded-full px-3.5 text-[0.9rem] font-medium text-[color-mix(in_srgb,var(--accent)_72%,white)]! opacity-85 transition-[opacity,background-color]! hover:opacity-100 focus-visible:opacity-100 @3xl/hero:border-transparent @3xl/hero:bg-transparent @3xl/hero:px-0 @3xl/hero:hover:bg-transparent`}
            onClick={onBack}
          >
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            <span>{backLabel}</span>
          </button>
        ) : (
          <span />
        )}
      </div>

      <div
        className={`${placed.text} ${stackedTop} @3xl/hero:mt-0 ${wideTop} ${wideWidth}`}
      >
        <div className="flex flex-col gap-2.5">
          <h1
            id="cov-hero-title"
            className={`m-0 ${titleSize} leading-[1.12] font-bold tracking-[-0.03em] text-balance [text-shadow:0_1px_18px_rgb(0_0_0/0.4)]`}
          >
            {title}
          </h1>
          {summary ? (
            <p className="m-0 line-clamp-3 max-w-136 text-[0.92rem] leading-relaxed text-white/75 @3xl/hero:line-clamp-2">
              {summary}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.86rem] text-white/85 @md/hero:gap-x-3 @3xl/hero:text-[0.9rem]">
          <span className="inline-flex items-center gap-1.5">
            <Stack size={18} aria-hidden="true" />
            <span>
              {sections} Section{sections === 1 ? "" : "s"}
            </span>
          </span>
          {metaSeparator}
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={18} aria-hidden="true" />
            <span>
              {lessons} Lesson{lessons === 1 ? "" : "s"}
            </span>
          </span>
          {metaSeparator}
          <span className="inline-flex items-center gap-1.5">
            <Clock size={18} aria-hidden="true" />
            <span>{duration || "0h 0m"}</span>
          </span>
        </div>

        {/* With no picture there is no play button on it either. */}
        {preview && !thumbnail ? (
          <button
            type="button"
            className={`${previewPillClasses} mt-1 inline-flex self-start`}
            onClick={preview.onOpen}
            disabled={preview.disabled}
          >
            {previewPillContent}
          </button>
        ) : null}
      </div>

      {/* The hero's bottom right corner: the preview button, beside the text
          only (stacked, the play button on the picture is the way in), and
          the heart. Stacked, the text runs the hero's full width, so the
          corner used is the picture's: just above where the title begins. */}
      <div
        className={`absolute ${placed.pill} ${stackedCorner} z-20 flex items-center gap-2.5 @3xl/hero:top-auto @3xl/hero:bottom-5`}
      >
        {preview && thumbnail ? (
          <button
            type="button"
            className={`${previewPillClasses} hidden @3xl/hero:inline-flex`}
            onClick={preview.onOpen}
            disabled={preview.disabled}
          >
            {previewPillContent}
          </button>
        ) : null}
        {wishlist ? (
          <div>
            <CourseWishlistHeartButton
              variant="overview-hero"
              wishlisted={wishlist.wishlisted}
              disabled={wishlist.disabled}
              aria-label={
                wishlist.wishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              title={
                wishlist.wishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              onClick={wishlist.onToggle}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
