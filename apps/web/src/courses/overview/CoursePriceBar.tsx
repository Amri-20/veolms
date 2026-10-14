import type { ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Ticket } from "@phosphor-icons/react/Ticket";
import { WarningCircle } from "@phosphor-icons/react/WarningCircle";
import { X } from "@phosphor-icons/react/X";
import { Button } from "../../components/Button";
import {
  CourseCouponControl,
  type CourseCouponControlProps,
} from "./CourseCouponControl";
import { overviewCardClasses } from "./overviewStyles";

export interface CoursePriceBarProps {
  /** Left out for someone who manages the course: they have nothing to buy. */
  price?: {
    label: string;
    /** Text size for the label; long amounts take a smaller one. */
    sizeClassName: string;
    struckThrough?: string;
    badge?: string;
    /**
     * The saving in `badge` is a coupon's (the course has no sale of its
     * own): it carries the same ticket a coupon's second badge does.
     */
    badgeIsCoupon?: boolean;
    /**
     * A coupon's saving on top of the one in `badge` (a course already on
     * sale). Shown after it with a plus sign and a ticket, as a second
     * saving and not a sum of the two.
     */
    couponBadge?: string;
  };
  /** Left out when no coupon can be used on this course. */
  coupon?: CourseCouponControlProps;
  /** A coupon problem to show under the bar. */
  couponError?: string | null;
  action: {
    label: string;
    icon: ReactNode;
    disabled: boolean;
    onClick?: () => void;
  };
  /** Shown in place of the coupon and the button when enrolment is closed. */
  closedMessage?: string;
  notice?: string | null;
  error?: string | null;
  onDismissError: () => void;
  perks: string[];
  /** A further row under the price, above the perks. */
  children?: ReactNode;
}

/** A saving beside the price: the sale's, and a coupon's after it. */
const savingBadgeClasses =
  "inline-flex items-center rounded-lg bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-2.5 py-1.5 text-[0.8rem] leading-none font-bold whitespace-nowrap text-[color-mix(in_srgb,var(--success)_72%,var(--text))]";

/** The bar is a box on the page; it measures itself for its own layout. */
export const priceBarSurfaceClasses = `@container/price ${overviewCardClasses}`;
/**
 * For the box inside the bar, not the bar: a container query cannot style
 * the element it measures.
 */
export const priceBarPaddingClasses =
  "px-4 py-4 @2xl/price:px-6 @2xl/price:py-5";

/**
 * The bar's main button (Pay Now, Continue Learning, Edit course), on top
 * of the shared `Button`'s own classes: tall, lit from above with a
 * top-to-bottom shade of the accent, and glowing in it. It dims a little
 * under the pointer; it does not move.
 *
 * Its corners are rounder than an ordinary button's (11px). The roundness
 * preference sets every action button's radius from
 * `--control-radius-action`, with `!important`, so the button gives that
 * variable its own value; the plain `rounded` class is for when no
 * preference is set.
 */
export const priceBarActionClasses =
  "group/action h-14! min-w-32 rounded-[0.6875rem]! px-8! text-[1.05rem]! font-extrabold! tracking-[-0.01em] [--control-radius-action:0.6875rem] bg-linear-to-b! from-[color-mix(in_srgb,var(--accent)_90%,white)] to-[color-mix(in_srgb,var(--accent)_92%,black)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_8px_20px_-8px_color-mix(in_srgb,var(--accent)_38%,transparent)]! hover:brightness-95";

/**
 * The coupon's place in the bar, whichever of its three forms is in it (the
 * "Have a coupon?" link, the field, the coupon in use). The place is the
 * same size for all three, so opening the field moves nothing else.
 *
 * Beside the button it starts at 17.5rem, enough for the field, and takes
 * what the button leaves. Where the two share the line with the price it
 * stops at 20rem and what is in it stands against the button; on a line of
 * their own there is no such limit, and what is in it starts under the
 * price (see `CourseCouponControl`, which reads this box's width to know
 * which: it is 20rem at most beside the price, and more on its own line).
 *
 * The limit is lifted by adding a length to it that is huge on a line of
 * their own and nothing beside the price: `max(0px, (100% - 100cqw + 3rem +
 * 2px) * 9999)`. The two cases are told apart by width alone. On a line of
 * their own the pair is as wide as the bar inside its padding (`100cqw`
 * less the 3rem of `priceBarPaddingClasses` at this width); beside the price
 * it is narrower by the price. `100%` is the pair's width, so this works
 * only on a child of the pair, and neither the pair nor anything between it
 * and the bar may be a container of its own. The 2px is for rounding.
 * (The classes are written out in full: Tailwind reads them from this file
 * as text and does not see one put together from parts.)
 */
const couponSlotClasses =
  "@container/coupon @md/price:min-w-0 @md/price:flex-[1_1_17.5rem] @2xl/price:max-w-[calc(20rem_+_max(0px,(100%_-_100cqw_+_3rem_+_2px)_*_9999))]";

/**
 * The button beside the coupon. It starts at 12.5rem ("Processing…" still
 * fits) and is the first to take whatever room the line has to spare, so it
 * is as wide as it can be before the coupon's place grows; it is the same
 * width whatever is in that place, and so never resized by the field
 * opening.
 *
 * It stops at 38% of a line it shares with the coupon only. Beside the
 * price it stops at 18rem instead; that swap uses the same length as the
 * coupon's place does (nothing beside the price, huge on a line of their
 * own).
 */
const buttonBesideCouponClasses =
  "@md/price:max-w-[max(12.5rem,38%)] @2xl/price:max-w-[max(calc(18rem_-_max(0px,(100%_-_100cqw_+_3rem_+_2px)_*_9999)),min(max(12.5rem,38%),max(0px,(100%_-_100cqw_+_3rem_+_2px)_*_9999)))]";

/**
 * The button with no coupon beside it: 18rem at most beside the price, and
 * the whole of a line it has to itself.
 */
const buttonAloneClasses =
  "@2xl/price:max-w-[calc(18rem_+_max(0px,(100%_-_100cqw_+_3rem_+_2px)_*_9999))]";

/**
 * How much of the bar's one row the coupon and the button ask for. The row
 * keeps them beside the price only if this much is left over; otherwise they
 * take the next line, in every state alike. It is what the widest state
 * needs (the open field at 17.5rem, the gap, the button at 12.5rem), asked
 * for while the field is still closed: the row used to hold until the field
 * was opened and only then break in two.
 *
 * A coupon in use needs less than the field. Without a coupon there is only
 * the button.
 */
const controlsReserveClasses = {
  field: "@2xl/price:flex-[1_1_31rem]",
  applied: "@2xl/price:flex-[1_1_28rem]",
  button: "@2xl/price:flex-[1_1_12.5rem]",
};

/**
 * The course's price, the coupon and the button that buys or opens it, in one
 * row where the bar has room for all of it with the coupon field open. With
 * less room the coupon and the button take a second line from the start, and
 * on a phone each takes a line.
 */
export function CoursePriceBar({
  price,
  coupon,
  couponError,
  action,
  closedMessage,
  notice,
  error,
  onDismissError,
  perks,
  children,
}: CoursePriceBarProps) {
  const couponFieldOpen = Boolean(
    coupon && coupon.isOpen && !coupon.applied && !closedMessage,
  );
  // The struck price and the badges are centred on the large price's
  // digits (measured: within half a pixel). A large price with a comma in
  // it still looks lower than they do, because the comma hangs 5px under
  // its baseline and pulls the figure's weight down; beside it the smaller
  // things read as riding high. They are set a touch lower then, and left
  // on the digits' centre for a price with no comma ("₹699", "Free").
  const besidePriceNudge = price?.label.includes(",")
    ? "relative top-[1.5px]"
    : "";

  return (
    <section
      className={priceBarSurfaceClasses}
      aria-label="Course pricing and enrollment"
      data-fixed-radius
    >
      <div className={`${priceBarPaddingClasses} flex flex-col gap-3.5`}>
        {/* One row once the bar is wide enough for the price and what the
          coupon and the button ask for (`controlsReserveClasses`); if not,
          those two take the next line, whatever the coupon's state. */}
        <div className="flex flex-col gap-x-6 gap-y-3.5 @2xl/price:flex-row @2xl/price:flex-wrap @2xl/price:items-center @2xl/price:justify-between">
          {price ? (
            // What is paid, in large type, comes first; then the marked
            // price struck through, then the saving in green (the user tried the accent and went back). The three
            // share one centre line, the coupon link's and the button's too
            // (but see `besidePriceNudge`).
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @2xl/price:shrink-0 @2xl/price:flex-nowrap">
              <span
                className={`leading-none font-[850] whitespace-nowrap text-(--text) ${price.sizeClassName}`}
              >
                {price.label}
              </span>
              {price.struckThrough && (
                <span
                  className={`text-[1.1rem] leading-none font-medium whitespace-nowrap text-(--muted) line-through ${besidePriceNudge}`}
                >
                  {price.struckThrough}
                </span>
              )}
              {price.badge && (
                <span
                  className={`${savingBadgeClasses} ${price.badgeIsCoupon ? "gap-1.5" : ""} ${besidePriceNudge}`}
                >
                  {price.badgeIsCoupon && (
                    <>
                      <Ticket size={14} weight="fill" aria-hidden="true" />
                      <span className="sr-only">With the coupon, </span>
                    </>
                  )}
                  {price.badge}
                </span>
              )}
              {price.couponBadge && (
                <span
                  className={`-ml-1 inline-flex items-center gap-2 ${besidePriceNudge}`}
                >
                  <span
                    aria-hidden="true"
                    className="text-[0.95rem] leading-none font-bold text-(--muted)"
                  >
                    +
                  </span>
                  <span className={`${savingBadgeClasses} gap-1.5`}>
                    <Ticket size={14} weight="fill" aria-hidden="true" />
                    <span className="sr-only">plus, with the coupon, </span>
                    {price.couponBadge}
                  </span>
                </span>
              )}
            </div>
          ) : null}

          {closedMessage ? (
            <p className="m-0 text-[0.88rem] leading-snug font-medium text-(--text-secondary)">
              {closedMessage}
            </p>
          ) : (
            <div
              className={`grid grid-cols-1 gap-2.5 @md/price:flex @md/price:items-center @2xl/price:min-w-0 @2xl/price:justify-end @2xl/price:gap-4 ${
                controlsReserveClasses[
                  coupon ? (coupon.applied ? "applied" : "field") : "button"
                ]
              }`}
            >
              {coupon ? (
                <div className={couponSlotClasses}>
                  <CourseCouponControl {...coupon} error={couponError} />
                </div>
              ) : null}
              {/* With no price beside it and no coupon either, the button
                  takes the whole bar. */}
              {/* It stays put under the pointer: it darkens, its glow
                  grows and its icon fills in. */}
              <Button
                motion="static"
                className={`${priceBarActionClasses} @md/price:min-w-50 @md/price:flex-[9999_1_12.5rem] ${
                  coupon
                    ? buttonBesideCouponClasses
                    : price
                      ? buttonAloneClasses
                      : ""
                }`}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </Button>
            </div>
          )}
        </div>

        {/* A refused code is said beside the field while it is open (see
            `CourseCouponControl`). This line is for what is said with the
            field closed: a coupon that had to be taken off again. */}
        {couponError && !couponFieldOpen && (
          <p role="alert" className="m-0 text-xs font-semibold text-rose-500">
            {couponError}
          </p>
        )}

        {children}

        {/* Payment received, access still being confirmed */}
        {notice && (
          <div
            role="status"
            className="w-full rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] p-2.5 text-xs font-medium text-(--text)"
          >
            {notice}
          </div>
        )}

        {/* Something went wrong, or the payment was not finished. Said in
            the page's own text colour at a readable size: red type on a red
            tint was hard to read, and most of these are not alarms (the
            commonest is a closed payment window). The amber sign carries
            the "look here". */}
        {error && (
          <div
            role="alert"
            className="flex w-full items-start gap-3 rounded-lg bg-[color-mix(in_srgb,var(--text)_6%,transparent)] py-3 pr-2.5 pl-3.5 text-[0.88rem] leading-snug text-(--text)"
          >
            <WarningCircle
              size={20}
              weight="fill"
              className="mt-px shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="-my-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-(--accent)"
              aria-label="Dismiss message"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        {perks.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-[0.84rem] text-(--muted)">
            {perks.map((perk, index) => (
              <span
                key={`${index}-${perk}`}
                className="inline-flex min-w-0 items-center gap-1.5 font-medium"
              >
                <CheckCircle
                  size={15}
                  weight="fill"
                  className="shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                <span>{perk}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
