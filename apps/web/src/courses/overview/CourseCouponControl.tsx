import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
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

// Beside the buy button from a medium width, at a fixed width once the bar
// is one row. Stacked, the field and the applied coupon sit above the
// button, and so does the "Have a coupon?" link.
const slotClasses = "flex h-12 items-center rounded-lg @2xl/price:flex-none";

/**
 * The coupon slot of the price bar. It is one of three things in the same
 * place: a quiet "Have a coupon?" link, the field a code is typed into, or
 * the coupon that has been applied.
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
        className={`${slotClasses} gap-2.5 bg-[color-mix(in_srgb,var(--success,#10b981)_12%,transparent)] pr-2 pl-3.5 text-(--text) @md/price:min-w-0 @md/price:flex-1 @2xl/price:max-w-80`}
      >
        <CheckCircle
          size={19}
          weight="fill"
          className="shrink-0 text-emerald-500"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
          <span className="truncate text-[0.86rem] font-bold tracking-wider uppercase">
            {applied.code}
          </span>
          <span className="truncate text-[0.74rem] text-(--muted)">
            Coupon applied
            {applied.discountLabel ? ` · ${applied.discountLabel}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-2 text-[0.8rem] font-semibold text-(--muted) transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus-visible:outline-2 focus-visible:outline-(--accent)"
          aria-label="Remove coupon"
        >
          Remove
        </button>
      </div>
    );
  }

  if (isOpen) {
    const canApply = !busy && Boolean(code.trim());
    return (
      // A plain field: a faint fill and a thin edge that takes the accent
      // while it is typed in. "Apply" is words in the field, not a second
      // filled button competing with the buy button beside it.
      <div
        className={`${slotClasses} gap-1 border border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] pr-1.5 pl-3.5 transition-colors duration-140 focus-within:border-(--accent) @md/price:min-w-0 @md/price:flex-1 @2xl/price:w-80`}
      >
        <Ticket
          size={18}
          className="mr-1.5 shrink-0 text-(--muted)"
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
          placeholder="Enter coupon code"
          disabled={busy}
          aria-label="Coupon code"
          autoComplete="off"
          spellCheck={false}
          className="h-full w-full min-w-0 border-0 bg-transparent text-[0.9rem] font-semibold tracking-wider text-(--text) uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-(--muted) placeholder:normal-case"
          autoFocus
        />
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          aria-label={busy ? "Applying coupon" : undefined}
          className="inline-flex h-8 min-w-14 shrink-0 cursor-pointer items-center justify-center rounded-md px-2.5 text-[0.86rem] font-bold whitespace-nowrap text-(--accent-ink,var(--accent)) transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] focus-visible:outline-2 focus-visible:outline-(--accent) disabled:cursor-default disabled:text-(--muted) disabled:opacity-60 disabled:hover:bg-transparent"
        >
          {busy ? (
            <CircleNotch
              size={15}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            "Apply"
          )}
        </button>
        <span
          aria-hidden="true"
          className="h-5 w-px shrink-0 bg-[color-mix(in_srgb,var(--text)_12%,transparent)]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          title="Cancel"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-(--accent)"
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
      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-transparent px-2 text-[0.9rem] font-semibold whitespace-nowrap text-(--accent-ink,var(--accent)) transition-colors duration-140 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) @md/price:h-12 @md/price:px-3.5"
    >
      <Ticket size={19} className="shrink-0" aria-hidden="true" />
      <span>Have a coupon?</span>
    </button>
  );
}
