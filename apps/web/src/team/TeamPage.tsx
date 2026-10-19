import { PaperPlaneTiltIcon as PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { PlusIcon as Plus } from "@phosphor-icons/react/Plus";
import { ShieldWarningIcon as ShieldWarning } from "@phosphor-icons/react/ShieldWarning";
import { UserPlusIcon as UserPlus } from "@phosphor-icons/react/UserPlus";
import { useState } from "react";
import { useLocation } from "react-router";
import { Button } from "../components/Button";
import type { NavigateTo } from "../routing/navigation";
import {
  useTeamInvitations,
  useTeamMembers,
  useTeamRoles,
} from "../services/team";
import { AcademyPageFallback } from "../shell/academyPageFallbacks";
import type { ToastMessage } from "../ToastNotification";
import { InvitationsTab } from "./invitations/InvitationsTab";
import { InvitePanel } from "./invitations/InvitePanel";
import { AddMemberPanel } from "./members/AddMemberPanel";
import { MembersTab } from "./members/MembersTab";
import { RoleEditorPanel } from "./roles/RoleEditorPanel";
import { RolesTab } from "./roles/RolesTab";
import {
  TEAM_TAB_DEFINITIONS,
  isTeamTab,
  teamTabFromPath,
  type TeamTab,
} from "./teamTabs";
import { useTeamAccess } from "./useTeamAccess";

export interface TeamPageProps {
  tab?: string;
  onNavigatePage?: NavigateTo;
  setNotice?: (message: ToastMessage) => void;
}

type Panel = "add-member" | "invite" | "new-role" | null;

function AccessDenied({ onNavigatePage }: { onNavigatePage?: NavigateTo }) {
  return (
    <div className="mx-auto mt-10 grid max-w-xl place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] p-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent)">
        <ShieldWarning size={24} weight="bold" />
      </span>
      <h1 className="mt-3 text-lg font-semibold">Access denied</h1>
      <p className="mt-1 max-w-md text-sm text-(--muted)">
        Your roles do not include managing the team.
      </p>
      <div className="mt-4">
        <Button onClick={() => onNavigatePage?.("/")}>Return home</Button>
      </div>
    </div>
  );
}

/**
 * Who works on the academy and what each person may do: members and their
 * roles, the roles themselves, and invitations waiting to be accepted.
 */
export function TeamPage({ tab, onNavigatePage, setNotice }: TeamPageProps) {
  const access = useTeamAccess();
  if (access.isLoading) return <AcademyPageFallback />;
  if (!access.canViewPage) {
    return <AccessDenied onNavigatePage={onNavigatePage} />;
  }
  return (
    <TeamWorkspace
      tab={tab}
      onNavigatePage={onNavigatePage}
      setNotice={setNotice}
    />
  );
}

function TeamWorkspace({ tab, onNavigatePage, setNotice }: TeamPageProps) {
  const { pathname } = useLocation();
  const activeTab: TeamTab = isTeamTab(tab) ? tab : teamTabFromPath(pathname);
  const { can } = useTeamAccess();
  const [panel, setPanel] = useState<Panel>(null);

  const members = useTeamMembers("");
  const roles = useTeamRoles();
  const invitations = useTeamInvitations("all");
  const customRolesEnabled = roles.data?.customRolesEnabled ?? false;
  const pendingInvites = (invitations.data?.pages ?? [])
    .flatMap((page) => page.invitations)
    .filter((invitation) => invitation.status === "pending").length;

  const counts: Record<TeamTab, number | undefined> = {
    members: members.data?.pages[0]?.totalCount,
    roles: roles.data?.roles.length,
    invitations: invitations.data ? pendingInvites : undefined,
  };

  const action =
    activeTab === "members" && can("role.assign")
      ? { label: "Add member", icon: UserPlus, panel: "add-member" as const }
      : activeTab === "roles" && customRolesEnabled && can("role.create")
        ? { label: "New role", icon: Plus, panel: "new-role" as const }
        : activeTab === "invitations" && can("team.invite")
          ? {
              label: "Invite people",
              icon: PaperPlaneTilt,
              panel: "invite" as const,
            }
          : null;

  return (
    <div className="pb-10" aria-labelledby="team-page-title">
      <header className="flex flex-wrap items-start justify-between gap-4 px-1 pt-2">
        <div>
          <h1
            id="team-page-title"
            className="text-[1.75rem] leading-tight font-bold tracking-tight text-(--text)"
          >
            Team
          </h1>
          <p className="mt-1 text-sm text-(--muted)">
            Who works on the academy and what each person may do.
          </p>
        </div>
        {action ? (
          <Button onClick={() => setPanel(action.panel)}>
            <action.icon size={17} weight="bold" />
            {action.label}
          </Button>
        ) : null}
      </header>

      <nav
        aria-label="Team sections"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,var(--text)_10%,transparent)]"
      >
        {TEAM_TAB_DEFINITIONS.map((definition) => {
          const active = definition.id === activeTab;
          const count = counts[definition.id];
          return (
            <button
              key={definition.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                onNavigatePage?.(`/team/${definition.id}`, {
                  resetScroll: true,
                })
              }
              className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${active ? "border-(--accent) text-(--accent)" : "border-transparent text-(--muted) hover:text-(--text)"}`}
            >
              {definition.label}
              {typeof count === "number" ? (
                <span
                  className={`rounded-md px-1.5 py-px text-[0.7rem] tabular-nums ${active ? "bg-(--accent)/15 text-(--accent)" : "bg-[color-mix(in_srgb,var(--text)_8%,transparent)] text-(--muted)"}`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6" role="tabpanel">
        {activeTab === "members" ? (
          <MembersTab
            setNotice={setNotice}
            onAddMember={() => setPanel("add-member")}
          />
        ) : activeTab === "roles" ? (
          <RolesTab setNotice={setNotice} />
        ) : (
          <InvitationsTab
            setNotice={setNotice}
            onInvite={() => setPanel("invite")}
            onViewMember={() =>
              onNavigatePage?.("/team/members", { resetScroll: true })
            }
          />
        )}
      </div>

      {panel === "add-member" ? (
        <AddMemberPanel onClose={() => setPanel(null)} setNotice={setNotice} />
      ) : null}
      {panel === "invite" ? (
        <InvitePanel onClose={() => setPanel(null)} />
      ) : null}
      {panel === "new-role" ? (
        <RoleEditorPanel
          target={{ mode: "create" }}
          customRolesEnabled={customRolesEnabled}
          onClose={() => setPanel(null)}
          onDuplicate={() => undefined}
          setNotice={setNotice}
        />
      ) : null}
    </div>
  );
}
