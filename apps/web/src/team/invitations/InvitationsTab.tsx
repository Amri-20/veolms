import { EnvelopeSimpleIcon as EnvelopeSimple } from "@phosphor-icons/react/EnvelopeSimple";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import type { TeamInvitation } from "@veolms/contracts";
import { useMemo, useState } from "react";
import {
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useTeamInvitations,
} from "../../services/team";
import { ConfirmActionModal } from "../../shell/ConfirmActionModal";
import type { ToastMessage } from "../../ToastNotification";
import { RoleChips, secondaryButtonClassName } from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { InvitationsEmpty } from "./InvitationsEmpty";
import {
  invitationState,
  sentLabel,
  type InvitationTone,
} from "./invitationState";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const TONES: Record<InvitationTone, { text: string; bar: string }> = {
  pending: { text: "text-(--accent)", bar: "bg-(--accent)" },
  soon: { text: "text-orange-400", bar: "bg-orange-400" },
  accepted: { text: "text-emerald-400", bar: "bg-emerald-400" },
  muted: { text: "text-(--muted)", bar: "bg-(--muted)" },
};

const line = "border-[color-mix(in_srgb,var(--text)_9%,transparent)]";
const columns =
  "md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_11rem]";
const smallButton =
  "inline-flex h-8 cursor-pointer items-center rounded-lg border px-3 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";
const neutralButton = `${smallButton} ${line} text-(--text) hover:bg-(--hover)`;
const accentButton = `${smallButton} ${line} text-(--accent) hover:bg-(--accent)/10`;
const dangerButton = `${smallButton} ${line} text-rose-400 hover:bg-rose-500/10`;

export function InvitationsTab({
  setNotice,
  onInvite,
  onViewMember,
}: {
  setNotice?: (message: ToastMessage) => void;
  onInvite: () => void;
  onViewMember: () => void;
}) {
  // One list of every invite; the filter and its counts are worked out
  // here, so switching filters never waits on the network.
  const query = useTeamInvitations("all");
  const { can } = useTeamAccess();
  const [filter, setFilter] = useState<Filter>("all");
  const [revoking, setRevoking] = useState<TeamInvitation | null>(null);
  const resend = useResendTeamInvitation();
  const revoke = useRevokeTeamInvitation();
  const canInvite = can("team.invite");

  const invitations = useMemo(
    () => query.data?.pages.flatMap((page) => page.invitations) ?? [],
    [query.data],
  );
  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: invitations.length,
      pending: 0,
      accepted: 0,
      expired: 0,
      revoked: 0,
    };
    for (const invitation of invitations) result[invitation.status] += 1;
    return result;
  }, [invitations]);
  const shown =
    filter === "all"
      ? invitations
      : invitations.filter((invitation) => invitation.status === filter);

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

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl bg-(--hover)"
          />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-rose-500">
        Invitations could not be loaded. {query.error.message}
      </p>
    );
  }

  if (invitations.length === 0) {
    return <InvitationsEmpty canInvite={canInvite} onInvite={onInvite} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter by status"
          className={`inline-flex flex-wrap gap-0.5 rounded-xl border p-1 ${line} bg-[color-mix(in_srgb,var(--text)_3%,transparent)]`}
        >
          {FILTERS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.8rem] font-semibold transition-colors ${active ? "bg-(--accent)/15 text-(--accent)" : "text-(--muted) hover:text-(--text)"}`}
              >
                {label}
                <span className={`tabular-nums ${active ? "" : "opacity-60"}`}>
                  {counts[id]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-(--muted)">
          Links last 7 days. Resending issues a fresh link.
        </p>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border ${line} bg-[color-mix(in_srgb,var(--text)_2%,transparent)]`}
      >
        <div
          className={`hidden gap-4 border-b px-5 py-3 text-[0.68rem] font-semibold tracking-wider text-(--muted) uppercase md:grid ${columns} ${line}`}
        >
          <span>Invited</span>
          <span>Role</span>
          <span>Sent by</span>
          <span>Link</span>
          <span className="sr-only">Actions</span>
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-(--muted)">
            No invitations here.
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {shown.map((invitation) => {
              const state = invitationState(invitation);
              const tone = TONES[state.tone];
              return (
                <li
                  key={invitation.id}
                  className={`grid grid-cols-1 gap-3 border-b px-5 py-4 last:border-b-0 md:items-center md:gap-4 ${columns} ${line}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--text)_7%,transparent)] text-(--muted)">
                      <EnvelopeSimple size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-(--text)">
                        {invitation.email}
                      </span>
                      <span className="block text-xs text-(--muted)">
                        {sentLabel(invitation.createdAt)}
                      </span>
                    </span>
                  </div>

                  <RoleChips roles={invitation.roles} />

                  <span className="truncate text-sm text-(--muted)">
                    {invitation.invitedBy?.name ?? "—"}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className={`font-semibold ${tone.text}`}>
                        {state.label}
                      </span>
                      <span className="text-(--muted)">{state.detail}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_10%,transparent)]">
                      <div
                        className={`h-full rounded-full ${tone.bar}`}
                        style={{
                          width: `${Math.round(state.progress * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-start gap-2 md:justify-end">
                    {invitation.status === "accepted" ? (
                      <button
                        type="button"
                        className={neutralButton}
                        onClick={onViewMember}
                      >
                        View member
                      </button>
                    ) : null}
                    {canInvite && state.isOpen ? (
                      <button
                        type="button"
                        className={accentButton}
                        disabled={resend.isPending}
                        onClick={() =>
                          void run(
                            () => resend.mutateAsync(invitation.id),
                            `A fresh link was sent to ${invitation.email}.`,
                          )
                        }
                      >
                        Resend
                      </button>
                    ) : null}
                    {canInvite && invitation.status === "pending" ? (
                      <button
                        type="button"
                        className={dangerButton}
                        onClick={() => setRevoking(invitation)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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

      <ConfirmActionModal
        id="team-invitation-revoke"
        isOpen={revoking !== null}
        isPending={revoke.isPending}
        onClose={() => setRevoking(null)}
        onConfirm={() => {
          const target = revoking;
          setRevoking(null);
          if (target) {
            void run(
              () => revoke.mutateAsync(target.id),
              `The invitation to ${target.email} is revoked.`,
            );
          }
        }}
        icon={XCircle}
        tone="danger"
        emphasis="cancel"
        title={`Revoke the invitation to ${revoking?.email ?? ""}?`}
        description="The link stops working. You can invite them again later."
        cancelLabel="Keep it"
        confirmLabel="Revoke"
        pendingLabel="Revoking…"
      />
    </div>
  );
}
