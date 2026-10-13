import {
  heroPlacementClasses,
  overviewColumnClasses,
  type HeroPlacement,
} from "./CourseOverviewHero";
import {
  priceBarPaddingClasses,
  priceBarSurfaceClasses,
} from "./CoursePriceBar";

const block = "rounded-md bg-[color-mix(in_srgb,var(--text)_10%,transparent)]";
const heroBlock = "rounded-md bg-white/12";
const cardClasses =
  "rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) shadow-(--card-shadow)";

/**
 * The course page while its course loads. It takes the hero's and the price
 * bar's own classes, so the page does not change shape when the course
 * arrives.
 */
export function CourseOverviewSkeleton({
  onNavigateCourses,
  heroPlacement = "card",
}: {
  onNavigateCourses?: () => void;
  heroPlacement?: HeroPlacement;
}) {
  const placed = heroPlacementClasses[heroPlacement];
  const hero = (
    <div
      className={placed.surface}
      data-fixed-radius={heroPlacement === "edge" ? "" : undefined}
    >
      {/* Where the picture sits while the hero is stacked. */}
      <div className="aspect-video w-full @3xl/hero:hidden" />
      {onNavigateCourses ? (
        <div className={`absolute inset-x-0 top-0 flex ${placed.controls}`}>
          <div className="h-9 w-28 rounded-full bg-white/10" />
        </div>
      ) : null}
      <div
        className={`${placed.text} -mt-[7cqi] @3xl/hero:mt-0 @3xl/hero:max-w-[52%] ${
          onNavigateCourses ? "@3xl/hero:pt-16" : "@3xl/hero:pt-6"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className={`${heroBlock} h-9 w-10/12`} />
          <div className={`${heroBlock} h-9 w-3/5`} />
          <div className={`${heroBlock} mt-1 h-4 w-full max-w-120`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`${heroBlock} h-5 w-24`} />
          <div className={`${heroBlock} h-5 w-24`} />
          <div className={`${heroBlock} h-5 w-20`} />
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex w-full animate-pulse flex-col gap-4 text-(--text)"
      data-testid="course-overview-skeleton"
    >
      {heroPlacement === "edge" ? hero : null}
      <div className={overviewColumnClasses} data-fixed-radius>
        {heroPlacement === "card" ? hero : null}
        <div className={priceBarSurfaceClasses}>
          <div
            className={`${priceBarPaddingClasses} flex flex-col gap-3.5 @2xl/price:flex-row @2xl/price:items-center @2xl/price:justify-between`}
          >
            <div className={`${block} h-9 w-36`} />
            <div className="flex items-center gap-2.5 @2xl/price:gap-4">
              <div className={`${block} h-12 w-40`} />
              <div className="h-12 flex-1 rounded-lg bg-[color-mix(in_srgb,var(--accent)_30%,transparent)] @2xl/price:w-72 @2xl/price:flex-none" />
            </div>
          </div>
        </div>

        <div
          className={`${cardClasses} flex flex-col gap-3 p-6 max-[640px]:p-4`}
        >
          <div className={`${block} mb-1 h-7 w-48`} />
          <div className={`${block} h-4 w-full`} />
          <div className={`${block} h-4 w-5/6`} />
          <div className={`${block} h-4 w-4/6`} />
        </div>

        <div
          className={`${cardClasses} flex flex-col gap-4 p-6 max-[640px]:p-4`}
        >
          <div className={`${block} mb-1 h-7 w-56`} />
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-11 w-full`} />
        </div>
      </div>
    </div>
  );
}
