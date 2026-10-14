/**
 * What the pieces under the hero share. Each is a box of its own on the
 * page: the price (or progress, or the manager's actions), the curriculum,
 * and the About text.
 */

import {
  elevatedCardClasses,
  elevatedCardPaddingClasses,
} from "../../components/ElevatedCard";

/**
 * A box: the application's shared card (see `components/ElevatedCard`),
 * which was first made for this page. The fill is `--elevated-card`, for
 * anything that has to fade into it (the About text's "See more"). Each box
 * carries `data-fixed-radius`, since the roundness preference would
 * otherwise set every section on this page to its own, smaller radius.
 */
export const overviewCardClasses = elevatedCardClasses;

/**
 * For the column under a hero that runs edge to edge: the first box sits
 * on the hero's lower edge and overlaps it a little (1rem), above it.
 * The hero leaves that much more room under its own contents (see
 * `heroPlacementClasses.edge`). Put on the column; the page's own gap must
 * be 0.
 */
export const overviewColumnUnderHeroClasses =
  "[&>:first-child]:relative [&>:first-child]:z-10 [&>:first-child]:-mt-4";

/** A box's inner room, a little less on a phone. */
export const overviewCardPaddingClasses = elevatedCardPaddingClasses;

/** A band's heading: the title, one supporting line and an action on the right. */
export const bandHeaderClasses =
  "flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-2";

export const bandTitleClasses =
  "m-0 text-[1.2rem] leading-tight font-bold tracking-[-0.02em] text-(--text)";

export const bandSubtitleClasses = "m-0 mt-1 text-[0.86rem] text-(--muted)";

/**
 * A quiet action in the band's heading: words in the accent, an icon, no
 * box. It dims a little at rest and comes up under the pointer.
 */
export const bandLinkClasses =
  "inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent p-0 text-[0.86rem] font-semibold whitespace-nowrap text-(--accent-ink,var(--accent)) opacity-90 transition-opacity duration-140 hover:opacity-100 hover:underline focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";

/**
 * A secondary button: a thin ring, no fill, the page's own text. For the
 * actions that sit beside a primary one.
 */
export const quietButtonClasses =
  "inline-flex h-11 min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-transparent px-3 text-[0.9rem] font-semibold whitespace-nowrap text-(--text) @md/price:px-4 transition-colors duration-140 hover:border-[color-mix(in_srgb,var(--text)_24%,transparent)] hover:bg-(--hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-default disabled:opacity-55";
