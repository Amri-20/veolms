import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { WarningCircle } from "@phosphor-icons/react/WarningCircle";
import { Button } from "../components/Button";

/**
 * What the lesson's discussion shows when its list could not be loaded: what
 * happened in plain words, and a button to try again.
 */
export function DiscussionLoadError({
  subject,
  testId,
  onRetry,
}: {
  /** What failed to load, as it reads in a sentence: "the discussion". */
  subject: "the discussion" | "your notes";
  testId: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12 text-center"
      data-testid={testId}
      role="alert"
    >
      <span
        className="mb-3 grid size-12 place-items-center rounded-full bg-rose-500/12 text-rose-400 [:root[data-theme=light]_&]:text-rose-600"
        aria-hidden="true"
      >
        <WarningCircle size={26} weight="fill" />
      </span>
      <p className="font-semibold text-(--text)">
        We couldn&rsquo;t load {subject}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-(--muted)">
        Something went wrong on our side or with your connection.
      </p>
      {onRetry ? (
        <Button motion="static" className="mt-4" onClick={onRetry}>
          <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
          <span className="font-semibold">Try again</span>
        </Button>
      ) : null}
    </div>
  );
}
