import type { ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { X } from "@phosphor-icons/react/X";
import { Button } from "../../components/Button";
import {
  CourseCouponControl,
  type CourseCouponControlProps,
} from "./CourseCouponControl";

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

export const priceBarSurfaceClasses =
  "@container/price rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) shadow-(--card-shadow)";
/**
 * For the box inside the bar, not the bar: a container query cannot style
 * the element it measures.
 */
export const priceBarPaddingClasses =
  "px-4 py-4 @2xl/price:px-6 @2xl/price:py-5";

/** The bar's main button, on top of the shared `Button`'s own classes. */
export const priceBarActionClasses =
  "h-12! min-w-32 px-6! text-[0.95rem]! font-extrabold! tracking-[-0.01em]";

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
    >
      <div className={`${priceBarPaddingClasses} flex flex-col gap-3.5`}>
        {/* One row once the bar is wide enough. It may still wrap: a long
          price next to an open coupon box sends the buttons to a line of
          their own instead of out of the bar. */}
        <div className="flex flex-col gap-x-6 gap-y-3.5 @2xl/price:flex-row @2xl/price:flex-wrap @2xl/price:items-center @2xl/price:justify-between">
          {price ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @2xl/price:shrink-0 @2xl/price:flex-nowrap">
              <span
                className={`leading-none font-[850] whitespace-nowrap text-(--text) ${price.sizeClassName}`}
              >
                {price.label}
              </span>
              {price.struckThrough && (
                <span className="text-[1.1rem] font-medium whitespace-nowrap text-(--muted) line-through">
                  {price.struckThrough}
                </span>
              )}
              {price.badge && (
                <span className="inline-flex items-center rounded-md bg-(--accent-soft,color-mix(in_srgb,var(--accent)_18%,transparent)) px-2.5 py-1.5 text-[0.78rem] leading-none font-[750] whitespace-nowrap text-(--accent-ink,var(--accent))">
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
              {coupon ? (
                <>
                  <CourseCouponControl {...coupon} />
                  <span
                    className="hidden h-8 w-px shrink-0 bg-[color-mix(in_srgb,var(--text)_12%,transparent)] @2xl/price:block"
                    aria-hidden="true"
                  />
                </>
              ) : null}
              {/* With no price beside it the button takes the whole bar. */}
              <Button
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

        {error && (
          <div
            role="alert"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/12 p-2.5 text-xs font-medium text-rose-500"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="cursor-pointer p-0.5 text-rose-400 hover:text-rose-600"
              aria-label="Dismiss error"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        )}

        {perks.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[color-mix(in_srgb,var(--text)_8%,transparent)] pt-3 text-[0.82rem] text-(--muted)">
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
