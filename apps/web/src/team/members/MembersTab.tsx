import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/CaretDown";
import { CheckIcon as Check } from "@phosphor-icons/react/Check";
import { PencilSimpleIcon as PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/UsersThree";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/XCircle";
import type { TeamMember } from "@veolms/contracts";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  useRemoveTeamMember,
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useTeamMembers,
  useTeamRoles,
} from "../../services/team";
import { ConfirmActionModal } from "../../shell/ConfirmActionModal";
import { useAuthStore } from "../../store/auth.store";
import type { ToastMessage } from "../../ToastNotification";
import { formatLastActive, formatTeamDate, roleLabel } from "../teamFormat";
import {
  EmptyState,
  PersonAvatar,
  RoleChips,
  RowMenu,
  SearchField,
  StatusChip,
  secondaryButtonClassName,
  type RowMenuItem,
} from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { EditRolesPanel } from "./EditRolesPanel";

type Pending = { kind: "remove" | "cancel"; member: TeamMember } | null;
type StatusFilter = "all" | "active" | "invited";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const line = "border-[color-mix(in_srgb,var(--text)_9%,transparent)]";
const columns =
  "md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_2.5rem]";

/** The Status column: a coloured dot, a word, and a line of detail. */
function memberStatus(member: TeamMember, now = Date.now()) {
  if (member.status === "awaiting_sign_in") {
    return {
      label: "Invited",
      dot: "bg-amber-400",
      detail: `Access held until ${formatTeamDate(member.expiresAt)}`,
    };
  }
  const last = member.lastActiveAt
    ? new Date(member.lastActiveAt).getTime()
    : null;
  const detail =
    last === null
      ? "Has not signed in"
      : now - last < 5 * MINUTE_MS
        ? "Online now"
        : now - last < 7 * DAY_MS
          ? "Signed in recently"
          : `Last seen ${formatTeamDate(member.lastActiveAt)}`;
  return { label: "Active", dot: "bg-emerald-400", detail };
}

function RoleFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (roleId: string | null) => void;
}) {
  const roles = useTeamRoles().data?.roles ?? [];
  const [open, setOpen] = useState(false);
  const current = roles.find((role) => role.id === value);
  const options = [
    { id: null, label: "All roles" },
    ...roles.map((role) => ({ id: role.id, label: roleLabel(role.name) })),
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium text-(--text) transition-colors hover:bg-(--hover) ${line} bg-[color-mix(in_srgb,var(--text)_3%,transparent)]`}
      >
        {current ? roleLabel(current.name) : "All roles"}
        <CaretDown size={12} weight="bold" className="text-(--muted)" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-1.5">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0" role="listbox">
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <li key={option.id ?? "all"} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setOpen(false);
                    onChange(option.id);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-(--text) hover:bg-(--hover)"
                >
                  {option.label}
                  {selected ? (
                    <Check
                      size={14}
                      weight="bold"
                      className="text-(--accent)"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [confirming, setConfirming] = useState<Pending>(null);
  const removeMember = useRemoveTeamMember();
  const revokeInvitation = useRevokeTeamInvitation();
  const extendAccess = useResendTeamInvitation();

  const rolesQuery = useTeamRoles();
  const rolesById = new Map(
    (rolesQuery.data?.roles ?? []).map((role) => [role.id, role]),
  );
  const members = useMemo(
    () => membersQuery.data?.pages.flatMap((page) => page.members) ?? [],
    [membersQuery.data],
  );
  const canAssign = can("role.assign");

  // Status and role are filtered here, on the people already loaded.
  const byRole = roleFilter
    ? members.filter((member) =>
        member.roles.some((role) => role.id === roleFilter),
      )
    : members;
  const counts = {
    all: byRole.length,
    active: byRole.filter((member) => member.status === "active").length,
    invited: byRole.filter((member) => member.status === "awaiting_sign_in")
      .length,
  };
  const shown = byRole.filter((member) =>
    statusFilter === "all"
      ? true
      : statusFilter === "active"
        ? member.status === "active"
        : member.status === "awaiting_sign_in",
  );

  const report = async (action: () => Promise<unknown>, success: string) => {
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

  const confirm = async () => {
    if (!confirming) return;
    const { kind, member } = confirming;
    setConfirming(null);
    if (kind === "remove" && member.userId) {
      const userId = member.userId;
      await report(
        () => removeMember.mutateAsync(userId),
        `${member.name || member.email} is off the team.`,
      );
    } else if (kind === "cancel" && member.invitationId) {
      const invitationId = member.invitationId;
      await report(
        () => revokeInvitation.mutateAsync(invitationId),
        `${member.email} will not be added.`,
      );
    }
  };

  const menuFor = (member: TeamMember): RowMenuItem[] => {
    if (member.status === "awaiting_sign_in") {
      if (!can("team.invite")) return [];
      const invitationId = member.invitationId;
      return [
        {
          label: "Change roles",
          icon: PencilSimple,
          onSelect: () => setEditing(member),
        },
        {
          label: "Extend access window",
          icon: ArrowClockwise,
          disabled: extendAccess.isPending || !invitationId,
          onSelect: () =>
            invitationId &&
            void report(
              () => extendAccess.mutateAsync(invitationId),
              `${member.email} has 7 more days to sign in.`,
            ),
        },
        {
          label: "Remove from team",
          icon: XCircle,
          danger: true,
          separated: true,
          onSelect: () => setConfirming({ kind: "cancel", member }),
        },
      ];
    }
    // Changing someone's roles means handing out or taking back each of
    // them; offer it only when every role they hold is yours to give.
    const manageable = member.roles.every((role) => {
      const full = rolesById.get(role.id);
      return full ? canGrantRole(full) : false;
    });
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
              icon: XCircle,
              danger: true,
              separated: canAssign && manageable,
              onSelect: () =>
                setConfirming({ kind: "remove" as const, member }),
            },
          ]
        : []),
    ];
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "invited", label: "Invited" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name or email"
            label="Search team members"
          />
        </div>
        <div
          role="group"
          aria-label="Filter by status"
          className={`inline-flex h-10 items-center gap-0.5 rounded-xl border p-1 ${line} bg-[color-mix(in_srgb,var(--text)_3%,transparent)]`}
        >
          {filters.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex h-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[0.8rem] font-semibold transition-colors ${active ? "bg-[color-mix(in_srgb,var(--text)_9%,transparent)] text-(--text)" : "text-(--muted) hover:text-(--text)"}`}
              >
                {filter.label}
                <span className="tabular-nums opacity-60">
                  {counts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
        <RoleFilter value={roleFilter} onChange={setRoleFilter} />
        {counts.invited > 0 ? (
          <p className="ml-auto text-xs text-(--muted)">
            {counts.invited} {counts.invited === 1 ? "hasn't" : "haven't"}{" "}
            signed in yet
          </p>
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
            <span>Status</span>
            <span>Joined</span>
            <span>Last active</span>
            <span className="sr-only">Actions</span>
          </div>
          {shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-(--muted)">
              Nobody here.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {shown.map((member) => {
                const status = memberStatus(member);
                const invited = member.status === "awaiting_sign_in";
                return (
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
                        <span className="block truncate text-xs text-(--muted)">
                          {invited
                            ? "Hasn't signed in yet"
                            : member.name
                              ? member.email
                              : ""}
                        </span>
                      </span>
                    </div>

                    <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                      <RoleChips roles={member.roles} />
                    </div>

                    <div className="col-span-2 row-start-3 md:col-span-1 md:row-start-auto">
                      <span className="flex items-center gap-2 text-sm font-semibold text-(--text)">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </span>
                      <span className="block pl-3.5 text-xs text-(--muted)">
                        {status.detail}
                      </span>
                    </div>

                    <span className="hidden text-sm text-(--muted) md:block">
                      {invited ? "—" : formatTeamDate(member.joinedAt)}
                    </span>
                    <span className="hidden text-sm text-(--muted) md:block">
                      {invited
                        ? "Never"
                        : formatLastActive(member.lastActiveAt)}
                    </span>

                    <div className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
                      <RowMenu
                        label={`Actions for ${member.name || member.email}`}
                        title={member.email}
                        items={menuFor(member)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
        icon={XCircle}
        tone="danger"
        emphasis="cancel"
        title={
          confirming?.kind === "cancel"
            ? `Remove ${confirming.member.email} from the team?`
            : `Remove ${confirming?.member.name || confirming?.member.email || "this person"} from the team?`
        }
        description={
          confirming?.kind === "cancel"
            ? "They will not get these roles when they sign in."
            : "They lose every team role at once and keep their account as a learner."
        }
        cancelLabel="Keep"
        confirmLabel="Remove"
        pendingLabel="Removing…"
      />
    </div>
  );
}
