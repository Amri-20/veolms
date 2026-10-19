import { PencilSimpleIcon as PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { UserMinusIcon as UserMinus } from "@phosphor-icons/react/UserMinus";
import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/UsersThree";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import type { TeamMember } from "@veolms/contracts";
import { useDeferredValue, useState } from "react";
import {
  useRemoveTeamMember,
  useRevokeTeamInvitation,
  useTeamMembers,
  useTeamRoles,
} from "../../services/team";
import { ConfirmActionModal } from "../../shell/ConfirmActionModal";
import { useAuthStore } from "../../store/auth.store";
import type { ToastMessage } from "../../ToastNotification";
import { formatLastActive, formatTeamDate } from "../teamFormat";
import {
  EmptyState,
  PersonAvatar,
  RoleChips,
  RowMenu,
  SearchField,
  StatusChip,
  secondaryButtonClassName,
} from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { EditRolesPanel } from "./EditRolesPanel";

type Pending = { kind: "remove" | "cancel"; member: TeamMember } | null;

export function MembersTab({
  setNotice,
  onAddMember,
}: {
  setNotice?: (message: ToastMessage) => void;
  onAddMember: () => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const membersQuery = useTeamMembers(deferredSearch);
  const { can, canGrantRole } = useTeamAccess();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [confirming, setConfirming] = useState<Pending>(null);
  const removeMember = useRemoveTeamMember();
  const revokeInvitation = useRevokeTeamInvitation();

  const rolesQuery = useTeamRoles();
  const rolesById = new Map(
    (rolesQuery.data?.roles ?? []).map((role) => [role.id, role]),
  );
  const pages = membersQuery.data?.pages ?? [];
  const members = pages.flatMap((page) => page.members);
  const canAssign = can("role.assign");

  const confirm = async () => {
    if (!confirming) return;
    const { kind, member } = confirming;
    try {
      if (kind === "remove" && member.userId) {
        await removeMember.mutateAsync(member.userId);
        setNotice?.({
          type: "success",
          message: `${member.name || member.email} is off the team.`,
        });
      } else if (kind === "cancel" && member.invitationId) {
        await revokeInvitation.mutateAsync(member.invitationId);
        setNotice?.({
          type: "success",
          message: `${member.email} will not be added.`,
        });
      }
    } catch (cause) {
      setNotice?.({
        type: "error",
        message:
          (cause as { message?: string }).message ?? "Something went wrong.",
      });
    } finally {
      setConfirming(null);
    }
  };

  const menuFor = (member: TeamMember) => {
    // Changing someone's roles means handing out or taking back each of
    // them; offer it only when every role they hold is yours to give.
    const manageable = member.roles.every((role) => {
      const full = rolesById.get(role.id);
      return full ? canGrantRole(full) : false;
    });
    if (member.status === "awaiting_sign_in") {
      return can("team.invite")
        ? [
            {
              label: "Change roles",
              icon: PencilSimple,
              onSelect: () => setEditing(member),
            },
            {
              label: "Cancel",
              icon: XCircle,
              danger: true,
              onSelect: () => setConfirming({ kind: "cancel", member }),
            },
          ]
        : [];
    }
    return [
      ...(canAssign && manageable
        ? [
            {
              label: "Change roles",
              icon: PencilSimple,
              onSelect: () => setEditing(member),
            },
          ]
        : []),
      ...(can("team.remove") && member.userId !== currentUserId
        ? [
            {
              label: "Remove from team",
              icon: UserMinus,
              danger: true,
              onSelect: () =>
                setConfirming({ kind: "remove" as const, member }),
            },
          ]
        : []),
    ];
  };

  const line = "border-[color-mix(in_srgb,var(--text)_9%,transparent)]";
  const columns =
    "md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_2.5rem]";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email"
            label="Search team members"
          />
        </div>
        <p className="text-xs text-(--muted)">
          Team members sign in with two-factor verification.
        </p>
      </div>

      {membersQuery.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-(--hover)"
            />
          ))}
        </div>
      ) : membersQuery.isError ? (
        <p className="text-sm text-rose-500">
          Members could not be loaded. {membersQuery.error.message}
        </p>
      ) : members.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title={deferredSearch ? "Nobody matches" : "No team members yet"}
        >
          {deferredSearch ? (
            "Try another name or email."
          ) : canAssign ? (
            <button
              type="button"
              className="cursor-pointer font-semibold text-(--accent) hover:underline"
              onClick={onAddMember}
            >
              Add someone to start your team.
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border ${line} bg-[color-mix(in_srgb,var(--text)_2%,transparent)]`}
        >
          <div
            className={`hidden gap-4 border-b px-5 py-3 text-[0.68rem] font-semibold tracking-wider text-(--muted) uppercase md:grid ${columns} ${line}`}
          >
            <span>Member</span>
            <span>Roles</span>
            <span>Joined</span>
            <span>Last active</span>
            <span className="sr-only">Actions</span>
          </div>
          <ul className="m-0 list-none p-0">
            {members.map((member) => (
              <li
                key={member.userId ?? member.invitationId}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-5 py-3.5 last:border-b-0 md:gap-4 ${columns} ${line}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PersonAvatar
                    name={member.name}
                    email={member.email}
                    avatarUrl={member.avatarUrl}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-(--text)">
                      <span className="truncate">
                        {member.name || member.email}
                      </span>
                      {member.userId === currentUserId ? (
                        <StatusChip tone="accent">You</StatusChip>
                      ) : null}
                    </span>
                    {member.name ? (
                      <span className="block truncate text-xs text-(--muted)">
                        {member.email}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                  <RoleChips roles={member.roles} />
                </div>
                {member.status === "awaiting_sign_in" ? (
                  <span className="col-span-2 row-start-3 md:col-span-2 md:row-start-auto">
                    <StatusChip tone="warning">
                      Waiting for first sign-in
                    </StatusChip>
                    <span className="ml-2 text-xs text-(--muted)">
                      until {formatTeamDate(member.expiresAt)}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="hidden text-sm text-(--muted) md:block">
                      {formatTeamDate(member.joinedAt)}
                    </span>
                    <span className="hidden text-sm text-(--muted) md:block">
                      {formatLastActive(member.lastActiveAt)}
                    </span>
                  </>
                )}
                <div className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
                  <RowMenu
                    label={`Actions for ${member.name || member.email}`}
                    items={menuFor(member)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {membersQuery.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className={secondaryButtonClassName}
            disabled={membersQuery.isFetchingNextPage}
            onClick={() => void membersQuery.fetchNextPage()}
          >
            {membersQuery.isFetchingNextPage ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}

      {editing ? (
        <EditRolesPanel
          member={editing}
          onClose={() => setEditing(null)}
          setNotice={setNotice}
        />
      ) : null}

      <ConfirmActionModal
        id="team-member-confirm"
        isOpen={confirming !== null}
        isPending={removeMember.isPending || revokeInvitation.isPending}
        onClose={() => setConfirming(null)}
        onConfirm={() => void confirm()}
        icon={confirming?.kind === "cancel" ? XCircle : UserMinus}
        tone="danger"
        emphasis="cancel"
        title={
          confirming?.kind === "cancel"
            ? `Cancel adding ${confirming.member.email}?`
            : `Remove ${confirming?.member.name || confirming?.member.email || "this person"} from the team?`
        }
        description={
          confirming?.kind === "cancel"
            ? "They will not get these roles when they sign in."
            : "They lose every team role at once and keep their account as a learner."
        }
        cancelLabel="Keep"
        confirmLabel={confirming?.kind === "cancel" ? "Cancel it" : "Remove"}
        pendingLabel="Saving…"
      />
    </div>
  );
}
