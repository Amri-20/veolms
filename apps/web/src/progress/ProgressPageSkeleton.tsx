import { progressPanelClasses } from "./progressFormat";

const bone =
  "animate-pulse rounded-lg bg-(--text)/8 motion-reduce:animate-none";

/**
 * The Progress page before its first answer: the same heading, four tiles
 * and two panels, so the page does not move when the days arrive.
 */
export function ProgressPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading progress"
      className="mx-auto flex w-full min-w-0 max-w-[1800px] flex-col gap-6 font-sans"
    >
      <div className="pt-1">
        <span className={`block h-9 w-44 ${bone}`} />
        <span className={`mt-2.5 block h-4 w-72 max-w-full ${bone}`} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <span
            key={tile}
            className={`block h-21 sm:h-29.5 ${bone} rounded-[12px] sm:rounded-[16px]`}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${progressPanelClasses} h-78 p-4 sm:h-82 sm:p-6`}>
          <span className={`block h-5 w-28 ${bone}`} />
          <span className={`mt-6 block h-44 ${bone}`} />
        </div>
        <div className={`${progressPanelClasses} h-78 p-4 sm:h-82 sm:p-6`}>
          <span className={`block h-5 w-36 ${bone}`} />
          <span className={`mt-6 block h-44 ${bone}`} />
        </div>
      </div>
    </div>
  );
}
