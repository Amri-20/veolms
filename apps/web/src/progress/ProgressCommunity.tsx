import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/UsersThree";
import type { LearningCommunityLearner } from "@veolms/contracts";
import { EmptyState } from "../components/analytics/StatTiles";
import { LearnerAvatar } from "./LearnerAvatar";
import { formatDuration, progressPanelClasses } from "./progressFormat";

function LearnerRow({
  entry,
  current,
  onOpen,
}: {
  entry: LearningCommunityLearner;
  /** The learner whose progress the page is showing. */
  current: boolean;
  onOpen: (entry: LearningCommunityLearner) => void;
}) {
  // The week against seven days of the learner's goal.
  const weekShare = Math.min(
    100,
    (entry.weekSeconds / (entry.goalMinutes * 60 * 7)) * 100,
  );
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-current={current ? "true" : undefined}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-(--text)/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) ${
          current ? "border-(--accent)/60 bg-(--accent)/6" : "border-(--text)/8"
        }`}
      >
        <LearnerAvatar learner={entry.learner} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <strong className="truncate text-sm font-semibold text-(--text)">
              {entry.learner.name}
            </strong>
            {entry.isYou ? (
              <span className="shrink-0 rounded-full bg-(--accent)/15 px-2 py-0.5 text-[0.65rem] font-semibold text-(--accent)">
                You
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-(--muted)">
            {formatDuration(entry.weekSeconds)} this week · {entry.weekGoalsMet}{" "}
            of 7 goals
          </span>
          <span
            aria-hidden="true"
            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-(--text)/10"
          >
            <span
              style={{ width: `${weekShare}%` }}
              className="block h-full rounded-full bg-(--accent)"
            />
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * The members who have chosen to share their progress, the one who learned
 * most in the last seven days first. Choosing one shows their days.
 */
export function ProgressCommunity({
  learners,
  loading,
  failed,
  currentLearnerId,
  onOpenLearner,
}: {
  learners: readonly LearningCommunityLearner[] | undefined;
  loading: boolean;
  failed: boolean;
  currentLearnerId: string | undefined;
  onOpenLearner: (entry: LearningCommunityLearner) => void;
}) {
  return (
    <section
      className={`${progressPanelClasses} p-4 sm:p-6`}
      aria-labelledby="progress-community-title"
      aria-busy={loading}
    >
      <h2 id="progress-community-title" className="text-base font-semibold">
        Learners sharing their progress
      </h2>
      <p className="mt-0.5 text-xs text-(--muted)">
        The last seven days of everyone who has chosen to share.
      </p>

      {loading ? (
        <ul aria-hidden="true" className="mt-4 grid gap-2.5 md:grid-cols-2">
          {[0, 1].map((item) => (
            <li
              key={item}
              className="h-19.5 animate-pulse rounded-xl bg-(--text)/6 motion-reduce:animate-none"
            />
          ))}
        </ul>
      ) : failed ? (
        <p className="mt-4 text-sm text-(--muted)">
          This list could not be loaded right now.
        </p>
      ) : !learners || learners.length === 0 ? (
        <EmptyState
          compact
          icon={<UsersThree size={20} weight="duotone" aria-hidden="true" />}
          title="No one is sharing yet"
          message="When a learner turns on sharing, their week shows up here."
        />
      ) : (
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {learners.map((entry) => (
            <LearnerRow
              key={entry.learner.id}
              entry={entry}
              current={entry.learner.id === currentLearnerId}
              onOpen={onOpenLearner}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
