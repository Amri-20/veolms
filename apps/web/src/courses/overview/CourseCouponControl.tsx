import { CaretRight } from "@phosphor-icons/react/CaretRight";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { Ticket } from "@phosphor-icons/react/Ticket";
import { X } from "@phosphor-icons/react/X";

export interface CourseCouponControlProps {
  applied: { code: string; discountLabel?: string } | null;
  isOpen: boolean;
  code: string;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

// Side by side with the buy button from a medium width; beside the price as
// well, at a fixed width, once the bar is one row.
const slotClasses =
  "flex h-12 items-center rounded-[10px] @2xl/price:flex-none";

/**
 * The coupon slot of the price bar. It is one of three things in the same
 * place: the "Apply coupon" button, the box a code is typed into, or the
 * coupon that has been applied.
 */
export function CourseCouponControl({
  applied,
  isOpen,
  code,
  busy,
  onOpen,
  onClose,
  onCodeChange,
  onApply,
  onRemove,
}: CourseCouponControlProps) {
  if (applied) {
    return (
      <div
        className={`${slotClasses} justify-between gap-2 border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] pr-2.5 pl-3.5 text-(--text) @md/price:min-w-0 @md/price:flex-1 @2xl/price:max-w-72`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Ticket
            size={17}
            weight="fill"
            className="shrink-0 text-(--accent)"
            aria-hidden="true"
          />
          <span className="truncate text-xs font-bold tracking-wider text-(--accent-ink,var(--accent)) uppercase">
            {applied.code}
          </span>
          <span className="text-xs whitespace-nowrap text-(--muted)">
            applied{applied.discountLabel ? ` (${applied.discountLabel})` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--muted) transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          aria-label="Remove coupon"
          title="Remove coupon"
        >
          <X size={13} weight="bold" />
        </button>
      </div>
    );
  }

  if (isOpen) {
    return (
      <div
        className={`${slotClasses} gap-2 border border-[color-mix(in_srgb,var(--text)_18%,transparent)] bg-[color-mix(in_srgb,var(--surface-strong)_75%,var(--canvas))] py-1.5 pr-1.5 pl-3 transition-[border-color,box-shadow] focus-within:border-(--accent) focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)] @md/price:min-w-0 @md/price:flex-1 @2xl/price:w-72`}
      >
        <Ticket
          size={18}
          weight="bold"
          className="shrink-0 text-(--muted)"
          aria-hidden="true"
        />
        <input
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Coupon code"
          disabled={busy}
          aria-label="Coupon code"
          className="w-full min-w-0 border-0 bg-transparent text-[0.86rem] font-semibold tracking-wider text-(--text) uppercase placeholder-(--muted) outline-none"
          autoFocus
        />
        <button
          type="button"
          onClick={onApply}
          disabled={busy || !code.trim()}
          aria-label={busy ? "Applying coupon" : undefined}
          className="inline-flex h-full shrink-0 cursor-pointer items-center justify-center rounded-[7px] bg-(--accent) px-3.5 text-[0.82rem] font-[750] whitespace-nowrap text-(--on-accent,#ffffff) transition-colors hover:bg-(--accent-hover,color-mix(in_srgb,var(--accent)_85%,var(--text))) disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <CircleNotch
              size={14}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            "Apply"
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          title="Cancel"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text)"
        >
          <X size={15} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${slotClasses} shrink-0 cursor-pointer justify-center gap-2.5 border border-dashed border-[color-mix(in_srgb,var(--text)_25%,transparent)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] px-4 text-[0.9rem] font-semibold whitespace-nowrap text-(--text) transition-[border-color,color,background-color] duration-160 ease-out hover:border-(--accent) hover:bg-(--accent-soft,color-mix(in_srgb,var(--accent)_12%,transparent)) hover:text-(--accent)`}
    >
      <Ticket
        size={19}
        className="shrink-0 text-(--accent)"
        aria-hidden="true"
      />
      <span className="truncate">Apply coupon</span>
      <CaretRight
        size={14}
        weight="bold"
        className="shrink-0 opacity-70"
        aria-hidden="true"
      />
    </button>
  );
}
