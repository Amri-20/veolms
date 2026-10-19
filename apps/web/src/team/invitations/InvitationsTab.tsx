import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { EnvelopeSimpleIcon as EnvelopeSimple } from "@phosphor-icons/react/EnvelopeSimple";
import { PaperPlaneTiltIcon as PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import type { TeamInvitation } from "@veolms/contracts";
import { useState } from "react";
import { Button } from "../../components/Button";
import {
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useTeamInvitations,
} from "../../services/team";
import { ConfirmActionModal } from "../../shell/ConfirmActionModal";
import type { ToastMessage } from "../../ToastNotification";
import { formatTeamDate } from "../teamFormat";
import {
  EmptyState,
  RoleChips,
  RowMenu,
  secondaryButtonClassName,
  StatusChip,
} from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { InvitePanel } from "./InvitePanel";

const FILTERS = ["all", "pending", "accepted", "expired", "revoked"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS = {
  pending: { label: "Pending", tone: "accent" },
  accepted: { label: "Accepted", tone: "success" },
  expired: { label: "Expired", tone: "warning" },
  revoked: { label: "Cancelled", tone: "neutral" },
} as const;

export function InvitationsTab({
  setNotice,
}: {
  setNotice?: (message: ToastMessage) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const query = useTeamInvitations(filter);
  const { can } = useTeamAccess();
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<TeamInvitation | null>(null);
  const resend = useResendTeamInvitation();
  const revoke = useRevokeTeamInvitation();
  const canInvite = can("team.invite");
  const invitations =
    query.data?.pages.flatMap((page) => page.invitations) ?? [];

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setNotice?.({ type: "success", message: success });
    } catch (cause) {
      setNotice?.({
        type: "error",
        message:
          (cause as { message?: string }).message ?? "Something went wrong.",
      });
    }
  };

  return (
    <div className="settings-content">
      <header className="settings-detail__header">
        <div>
          <h2>Invitations</h2>
          <p>
            People invited with a link to accept. Links last 7 days; resending
            sends a new one. People added by email appear under Members.
          </p>
        </div>
        {canInvite ? (
          <Button onClick={() => setInviting(true)}>
            <PaperPlaneTilt size={17} weight="bold" />
            Invite people
          </Button>
        ) : null}
      </header>

      <section className="settings-section" aria-label="Invitations">
        <div
          className="mb-4 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by status"
        >
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filter === value ? "border-(--accent) bg-(--accent)/10 text-(--accent)" : "border-[color-mix(in_srgb,var(--text)_12%,transparent)] text-(--muted) hover:bg-(--hover)"}`}
            >
              {value === "all" ? "All" : STATUS[value].label}
            </button>
          ))}
        </div>

        {query.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-(--hover)"
              />
            ))}
          </div>
        ) : query.isError ? (
          <p className="text-sm text-rose-500">
            Invitations could not be loaded. {query.error.message}
          </p>
        ) : invitations.length === 0 ? (
          <EmptyState icon={EnvelopeSimple} title="No invitations">
            {canInvite ? "Invite someone to join the team." : null}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-[color-mix(in_srgb,var(--text)_8%,transparent)] p-0">
            {invitations.map((invitation) => {
              const status = STATUS[invitation.status];
              const open =
                invitation.status === "pending" ||
                invitation.status === "expired";
              return (
                <li
                  key={invitation.id}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent)/12 text-(--accent)">
                    <EnvelopeSimple size={17} weight="bold" />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_7rem_9rem] md:items-center md:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-(--text)">
                        {invitation.email}
                      </span>
                      <span className="block truncate text-xs text-(--muted)">
                        {invitation.invitedBy?.name
                          ? `By ${invitation.invitedBy.name}`
                          : "Invited"}{" "}
                        · {formatTeamDate(invitation.createdAt)}
                      </span>
                    </span>
                    <RoleChips roles={invitation.roles} />
                    <span>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </span>
                    <span className="text-xs text-(--muted)">
                      {invitation.status === "accepted"
                        ? `Accepted ${formatTeamDate(invitation.acceptedAt)}`
                        : invitation.status === "revoked"
                          ? `Cancelled ${formatTeamDate(invitation.revokedAt)}`
                          : `${invitation.status === "expired" ? "Expired" : "Expires"} ${formatTeamDate(invitation.expiresAt)}`}
                    </span>
                  </div>
                  <RowMenu
                    label={`Actions for ${invitation.email}`}
                    items={
                      canInvite && open
                        ? [
                            {
                              label: "Resend",
                              icon: ArrowClockwise,
                              disabled: resend.isPending,
                              onSelect: () =>
                                void run(
                                  () => resend.mutateAsync(invitation.id),
                                  `A new link was sent to ${invitation.email}.`,
                                ),
                            },
                            {
                              label: "Cancel invite",
                              icon: XCircle,
                              danger: true,
                              onSelect: () => setRevoking(invitation),
                            },
                          ]
                        : []
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}

        {query.hasNextPage ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? "Loading…" : "Show more"}
            </button>
          </div>
        ) : null}
      </section>

      {inviting ? <InvitePanel onClose={() => setInviting(false)} /> : null}

      <ConfirmActionModal
        id="team-invitation-revoke"
        isOpen={revoking !== null}
        isPending={revoke.isPending}
        onClose={() => setRevoking(null)}
        onConfirm={() => {
          const target = revoking;
          setRevoking(null);
          if (target)
            void run(
              () => revoke.mutateAsync(target.id),
              `The invitation to ${target.email} is cancelled.`,
            );
        }}
        icon={XCircle}
        tone="danger"
        emphasis="cancel"
        title={`Cancel the invitation to ${revoking?.email ?? ""}?`}
        description="The link stops working. You can invite them again later."
        cancelLabel="Keep it"
        confirmLabel="Cancel invite"
        pendingLabel="Cancelling…"
      />
    </div>
  );
}
