import {
  heroPlacementClasses,
  overviewColumnClasses,
  type HeroPlacement,
} from "./CourseOverviewHero";
import {
  priceBarPaddingClasses,
  priceBarSurfaceClasses,
} from "./CoursePriceBar";
import {
  overviewCardClasses,
  overviewCardPaddingClasses,
  overviewColumnUnderHeroClasses,
} from "./overviewStyles";

const block = "rounded-md bg-[color-mix(in_srgb,var(--text)_10%,transparent)]";
const heroBlock = "rounded-md bg-(--hero-ink)/12";

/**
 * The course page while its course loads. It takes the hero's and the first
 * band's own classes, so the page does not change shape when the course
 * arrives: three boxes under the hero.
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
          <div className="h-9 w-28 rounded-full bg-(--hero-ink)/10" />
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
      className={`flex w-full animate-pulse flex-col text-(--text) ${
        heroPlacement === "edge" ? "" : "gap-4"
      }`}
      data-testid="course-overview-skeleton"
    >
      {heroPlacement === "edge" ? hero : null}
      <div
        className={`${overviewColumnClasses} ${
          heroPlacement === "edge" ? overviewColumnUnderHeroClasses : ""
        }`}
        data-fixed-radius
      >
        {heroPlacement === "card" ? hero : null}

        {/* The first band: price or progress, and the button. */}
        <div className={priceBarSurfaceClasses}>
          <div
            className={`${priceBarPaddingClasses} flex flex-col gap-4 @2xl/price:flex-row @2xl/price:items-center @2xl/price:justify-between`}
          >
            <div className="flex w-full flex-col gap-3 @2xl/price:w-80">
              <div className="flex items-center gap-3">
                <div className={`${block} h-7 w-40`} />
                <div className={`${block} h-4 w-32`} />
              </div>
              <div className="h-2.5 rounded-full bg-[color-mix(in_srgb,var(--text)_10%,transparent)]" />
            </div>
            <div className="h-14 w-full rounded-lg bg-[color-mix(in_srgb,var(--accent)_30%,transparent)] @2xl/price:w-60" />
          </div>
        </div>

        {/* Curriculum */}
        <div
          className={`${overviewCardClasses} ${overviewCardPaddingClasses} flex flex-col gap-3`}
        >
          <div className={`${block} mb-1 h-6 w-36`} />
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-11 w-full`} />
        </div>

        {/* About */}
        <div
          className={`${overviewCardClasses} ${overviewCardPaddingClasses} flex flex-col gap-3`}
        >
          <div className={`${block} mb-1 h-6 w-44`} />
          <div className={`${block} h-4 w-full`} />
          <div className={`${block} h-4 w-5/6`} />
          <div className={`${block} h-4 w-4/6`} />
        </div>
      </div>
    </div>
  );
}
