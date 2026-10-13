/**
 * The payment button's icon: a bank card reduced to what reads at a button's
 * size, an outline and the one stripe across it. The icon set's own card has
 * two small marks in its corner that turn to specks at this size.
 *
 * It stays an outline under the pointer (the user did not want it filled in
 * there). It is a little larger than the other button icons: a card is wide
 * and low, and at their size it looked smaller than they do.
 */
export function PayCardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[1.3em] shrink-0"
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  );
}
