import type { Ref } from "react";
import type { GuestHeroPicture } from "./guestHeroImage";

/** One of the hero's stacked pictures, in its phone and wide crops. */
export function HeroPicture({
  picture,
  position,
  className,
  priority = false,
  imageRef,
}: {
  picture: GuestHeroPicture;
  position: string;
  className: string;
  /** The picture the page is first painted with. */
  priority?: boolean;
  imageRef?: Ref<HTMLImageElement>;
}) {
  return (
    <picture>
      <source
        media={picture.phone.media}
        srcSet={picture.phone.srcSet}
        sizes={picture.phone.sizes}
        width={picture.phone.width}
        height={picture.phone.height}
      />
      <img
        ref={imageRef}
        src={picture.wide.src}
        srcSet={picture.wide.srcSet}
        sizes={picture.wide.sizes}
        width={picture.wide.width}
        height={picture.wide.height}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={`absolute inset-x-0 top-0 h-full w-full object-cover ${position} ${className}`}
      />
    </picture>
  );
}

/**
 * A hero's copy is centred in the hero's height. A page built ahead of time
 * reaches the browser in pieces, and one that is drawn when only the first
 * of the copy has arrived centres that much, then moves it up as the rest
 * comes in. So where the copy is centred it is not drawn until the last of
 * it is there: `HeroCopyEnd` goes last in whatever carries one of these
 * classes. (A browser without `:has()` ignores the rule and draws the copy
 * as before.)
 *
 * The guest's hero centres its copy from the `sm` breakpoint up, and the
 * learner's where the copy stands beside the picture.
 */
export const guestHeroCopyWhenComplete =
  "sm:[&:not(:has(>[data-hero-copy-end]))]:invisible";
export const learnerHeroCopyWhenComplete =
  "@[50rem]/home:[&:not(:has(>[data-hero-copy-end]))]:invisible";

export function HeroCopyEnd() {
  return <span data-hero-copy-end="" hidden />;
}

/**
 * The hero's own box, whatever stands in it: the picture's navy by night
 * (dark theme) and the sunlit wall by day.
 */
export const heroSceneClasses =
  "relative isolate flex flex-col overflow-clip bg-[#050915] text-white [:root[data-theme=light]_&]:bg-[#f4ecdf] [:root[data-theme=light]_&]:text-slate-900";
