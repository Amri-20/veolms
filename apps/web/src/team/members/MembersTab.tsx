import { PencilSimpleIcon as PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { UserMinusIcon as UserMinus } from "@phosphor-icons/react/UserMinus";
import { UserPlusIcon as UserPlus } from "@phosphor-icons/react/UserPlus";
import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/UsersThree";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import type { TeamMember } from "@veolms/contracts";
import { useDeferredValue, useState } from "react";
import { Button } from "../../components/Button";
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
import { AddMemberPanel } from "./AddMemberPanel";
import { EditRolesPanel } from "./EditRolesPanel";

type Pending = { kind: "remove" | "cancel"; member: TeamMember } | null;

export function MembersTab({
  setNotice,
}: {
  setNotice?: (message: ToastMessage) => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const membersQuery = useTeamMembers(deferredSearch);
  const { can, canGrantRole } = useTeamAccess();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [adding, setAdding] = useState(false);
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
  const total = pages[0]?.totalCount;
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

  return (
    <div className="settings-content">
      <header className="settings-detail__header">
        <div>
          <h2>Members</h2>
          <p>
            Everyone who works on the academy, and what each person may do.
            {typeof total === "number" ? ` ${total} in all.` : ""}
          </p>
        </div>
      </header>

      <section className="settings-section" aria-label="Team members">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email"
            label="Search team members"
          />
          {canAssign ? (
            <Button onClick={() => setAdding(true)}>
              <UserPlus size={17} weight="bold" />
              Add member
            </Button>
          ) : null}
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
            {deferredSearch
              ? "Try another name or email."
              : "Add someone to start your team."}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-[color-mix(in_srgb,var(--text)_8%,transparent)] p-0">
            {members.map((member) => (
              <li
                key={member.userId ?? member.invitationId}
                className="flex items-center gap-3 py-3"
              >
                <PersonAvatar
                  name={member.name}
                  email={member.email}
                  avatarUrl={member.avatarUrl}
                />
                <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_8rem_8rem] md:items-center md:gap-4">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate text-sm font-semibold text-(--text)">
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
                  <RoleChips roles={member.roles} />
                  {member.status === "awaiting_sign_in" ? (
                    <span className="md:col-span-2">
                      <StatusChip tone="warning">
                        Waiting for first sign-in
                      </StatusChip>
                      <span className="ml-2 text-xs text-(--muted)">
                        until {formatTeamDate(member.expiresAt)}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="text-xs text-(--muted)">
                        <span className="md:hidden">Joined </span>
                        {formatTeamDate(member.joinedAt)}
                      </span>
                      <span className="text-xs text-(--muted)">
                        <span className="md:hidden">Active </span>
                        {formatLastActive(member.lastActiveAt)}
                      </span>
                    </>
                  )}
                </div>
                <RowMenu
                  label={`Actions for ${member.name || member.email}`}
                  items={menuFor(member)}
                />
              </li>
            ))}
          </ul>
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
      </section>

      {adding ? (
        <AddMemberPanel
          onClose={() => setAdding(false)}
          setNotice={setNotice}
        />
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
