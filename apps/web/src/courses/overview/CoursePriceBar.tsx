import type { ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
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
 * The course's price, the coupon and the button that buys or opens it, in one
 * row; they stack when the bar is narrow.
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
  return (
    <section
      className={priceBarSurfaceClasses}
      aria-label="Course pricing and enrollment"
      data-fixed-radius
    >
      <div className={`${priceBarPaddingClasses} flex flex-col gap-3.5`}>
        {/* One row once the bar is wide enough. It may still wrap: a long
          price next to an open coupon box sends the buttons to a line of
          their own instead of out of the bar. */}
        <div className="flex flex-col gap-x-6 gap-y-3.5 @2xl/price:flex-row @2xl/price:flex-wrap @2xl/price:items-center @2xl/price:justify-between">
          {price ? (
            // What is paid, in large type, comes first; then the marked
            // price struck through, then the saving in green (the user tried the accent and went back). The three
            // share one centre line, the coupon link's and the button's too.
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @2xl/price:shrink-0 @2xl/price:flex-nowrap">
              <span
                className={`leading-none font-[850] whitespace-nowrap text-(--text) ${price.sizeClassName}`}
              >
                {price.label}
              </span>
              {price.struckThrough && (
                <span className="text-[1.1rem] leading-none font-medium whitespace-nowrap text-(--muted) line-through">
                  {price.struckThrough}
                </span>
              )}
              {price.badge && (
                <span className="inline-flex items-center rounded-lg bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-2.5 py-1.5 text-[0.8rem] leading-none font-bold whitespace-nowrap text-[color-mix(in_srgb,var(--success)_72%,var(--text))]">
                  {price.badge}
                </span>
              )}
            </div>
          ) : null}

          {closedMessage ? (
            <p className="m-0 text-[0.88rem] leading-snug font-medium text-(--text-secondary)">
              {closedMessage}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 @md/price:flex @md/price:items-center @2xl/price:flex-1 @2xl/price:justify-end @2xl/price:gap-4">
              {coupon ? <CourseCouponControl {...coupon} /> : null}
              {/* With no price beside it the button takes the whole bar. */}
              {/* It stays put under the pointer: it darkens, its glow
                  grows and its icon fills in. */}
              <Button
                motion="static"
                className={`${priceBarActionClasses} @md/price:flex-1 ${
                  price ? "@2xl/price:max-w-72" : ""
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

        {couponError && (
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
