import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/ArrowLeft";

export function PageBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Go back to the previous page"
      title="Go back"
      onClick={onClick}
      // Most palettes do not name a card surface of their own; without the
      // fallback the button had no background on them.
      className="inline-flex size-9 shrink-0 self-center items-center justify-center rounded-xl border border-(--border) bg-(--card-surface,var(--surface)) text-(--muted) shadow-sm transition-colors hover:bg-(--hover) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
    >
      <ArrowLeft size={18} weight="bold" aria-hidden="true" />
    </button>
  );
}
