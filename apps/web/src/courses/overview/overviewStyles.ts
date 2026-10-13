/**
 * What the pieces under the hero share. Each is a box of its own on the
 * page: the price (or progress, or the manager's actions), the curriculum,
 * and the About text.
 */

/**
 * A box, made the way the home page's pinned course is: a lighter pane on a
 * deeper ground, with a faint light along its top edge and a soft shadow
 * falling away under it. It has no border.
 *
 * On the course page the ground is deepened by the shell (`CoursesPage`
 * marks its scroller `data-deep-ground` in the framed layout and keeps the
 * ground's colour in `--cov-ground`). The box is that same colour made one
 * fixed step lighter, so it is as clearly apart from the ground in every
 * palette: the palettes space their own surface colours very differently
 * (the darkest ones by about half as much as the others), and a mix of
 * those gave boxes that all but vanished in some of them. The step is
 * small on purpose; the box must not glare. A browser without relative
 * colours gets a mix of the palette's surfaces instead.
 *
 * Anywhere else (the course editor's preview, the unframed layout) the
 * ground is not deepened, and the box is the raised `--surface` so that it
 * still differs from what is behind it.
 *
 * The fill is also `--cov-card`, for anything that has to fade into it (the
 * About text's "See more"). The corners are a course card's (16px, whatever
 * the roundness preference): each box carries `data-fixed-radius`, since
 * that preference would otherwise set every section on this page to its
 * own, smaller radius.
 */
export const overviewCardClasses = [
  "rounded-2xl border-0 bg-(--cov-card) [--cov-card:var(--surface)]",
  "in-data-[content-layout=framed]:in-data-deep-ground:[--cov-card:color-mix(in_srgb,var(--main-surface)_60%,var(--surface))]",
  "supports-[color:oklch(from_white_l_c_h)]:in-data-[content-layout=framed]:in-data-deep-ground:[--cov-card:oklch(from_var(--cov-ground)_calc(l_+_0.042)_c_h)]",
  "[:root[data-theme=light]_&]:supports-[color:oklch(from_white_l_c_h)]:in-data-[content-layout=framed]:in-data-deep-ground:[--cov-card:oklch(from_var(--cov-ground)_calc(l_+_0.03)_c_h)]",
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_10px_22px_-12px_rgb(0_0_0/0.4),0_22px_44px_-24px_rgb(0_0_0/0.45)]",
  "[:root[data-theme=light]_&]:shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_10px_22px_-12px_rgb(15_23_42/0.16),0_22px_44px_-24px_rgb(15_23_42/0.2)]",
].join(" ");

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
export const overviewCardPaddingClasses = "px-6 py-5 max-[640px]:px-4";

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
