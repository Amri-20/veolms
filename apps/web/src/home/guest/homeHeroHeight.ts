/**
 * How tall the home page's hero is where its copy lies beside the picture
 * (50rem of page and wider), the same for a visitor and for a signed-in
 * learner, so the page keeps its height when someone signs in on it.
 *
 * It is the learner's hero (see `heroSizeClasses` in
 * learner/learnerHeroLayout.ts, which places its copy and picture from it)
 * at 92%: a third of the page's width, between about 26.7rem and 31.3rem,
 * easing down on narrower pages to 23rem at 50rem. That is a little taller
 * than the visitor's copy alone needs and a little shorter than the
 * learner's used to be, which still leaves the learner's three parts room.
 * Set as `--hero-h` on the hero; written out in full because Tailwind only
 * makes classes it finds whole in the source.
 */
export const homeHeroHeightClasses =
  "@[50rem]/home:[--hero-h:calc(max(calc(clamp(25rem,17.85rem_+_14.3cqw,27rem)_+_clamp(27rem,40.22cqw_-_5rem,29rem)_-_27rem),min(33.4cqw,34rem))_*_0.92)] @[50rem]/home:min-h-(--hero-h)";
