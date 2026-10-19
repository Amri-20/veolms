import { ShieldWarningIcon as ShieldWarning } from "@phosphor-icons/react/ShieldWarning";
import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/UsersThree";
import { memo, useCallback, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Button } from "../components/Button";
import { PageHeading } from "../components/PageHeading";
import { SwipeableTabPanel } from "../navigation/SwipeableTabPanel";
import type { NavigateTo } from "../routing/navigation";
import { SettingsTabBar } from "../settings/SettingsTabBar";
import { AcademyPageFallback } from "../shell/academyPageFallbacks";
import type { ToastMessage } from "../ToastNotification";
import { InvitationsTab } from "./invitations/InvitationsTab";
import { MembersTab } from "./members/MembersTab";
import { RolesTab } from "./roles/RolesTab";
import {
  TEAM_TAB_DEFINITIONS,
  TEAM_TABS,
  isTeamTab,
  teamTabFromPath,
  type TeamTab,
} from "./teamTabs";
import { useTeamAccess } from "./useTeamAccess";
import "../styles/features/settings/foundation.css";
import "../styles/features/settings/preferences-responsive.css";

export interface TeamPageProps {
  tab?: string;
  onNavigatePage?: NavigateTo;
  setNotice?: (message: ToastMessage) => void;
}

const TeamTabContent = memo(function TeamTabContent({
  tab,
  setNotice,
}: {
  tab: TeamTab;
  setNotice?: (message: ToastMessage) => void;
}) {
  switch (tab) {
    case "members":
      return <MembersTab setNotice={setNotice} />;
    case "roles":
      return <RolesTab setNotice={setNotice} />;
    case "invitations":
      return <InvitationsTab setNotice={setNotice} />;
  }
});

function AccessDenied({ onNavigatePage }: { onNavigatePage?: NavigateTo }) {
  return (
    <div className="settings-page">
      <section className="settings-section mx-auto mt-6 grid max-w-xl place-items-center p-10! text-center">
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
      </section>
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
    <TeamTabs tab={tab} onNavigatePage={onNavigatePage} setNotice={setNotice} />
  );
}

function TeamTabs({ tab, onNavigatePage, setNotice }: TeamPageProps) {
  const { pathname } = useLocation();
  const activeTab: TeamTab = isTeamTab(tab) ? tab : teamTabFromPath(pathname);
  const activeTabIndex = TEAM_TABS.indexOf(activeTab);
  const tabListRef = useRef<HTMLElement>(null);
  const [preparedTabs, setPreparedTabs] = useState<ReadonlySet<TeamTab>>(
    () => new Set([activeTab]),
  );

  const prepareTab = useCallback((id: TeamTab) => {
    setPreparedTabs((current) => {
      if (current.has(id)) return current;
      return new Set(current).add(id);
    });
  }, []);

  const navigateTab = useCallback(
    (id: TeamTab) => {
      prepareTab(id);
      // As in Settings: the tab's pressed state paints before the route
      // change starts.
      window.requestAnimationFrame(() => {
        window.setTimeout(
          () => onNavigatePage?.(`/team/${id}`, { resetScroll: true }),
          0,
        );
      });
    },
    [onNavigatePage, prepareTab],
  );

  const prepareSwipeNeighbors = useCallback(() => {
    setPreparedTabs((current) => {
      const next = new Set(current);
      const previous = TEAM_TABS[activeTabIndex - 1];
      const following = TEAM_TABS[activeTabIndex + 1];
      if (previous) next.add(previous);
      if (following) next.add(following);
      return next.size === current.size ? current : next;
    });
  }, [activeTabIndex]);

  return (
    <div className="settings-page" aria-labelledby="team-page-title">
      <header className="settings-page__topbar contents!">
        <div className="settings-page__heading mb-2">
          <PageHeading
            id="team-page-title"
            title="Team"
            description="Who works on the academy and what each person may do."
            copyClassName="settings-page__heading-copy"
          />
          <div className="settings-page__icon" aria-hidden="true">
            <UsersThree size={25} weight="regular" />
          </div>
        </div>

        <SettingsTabBar
          tabs={TEAM_TAB_DEFINITIONS}
          activeTab={activeTab}
          idPrefix="team-tab"
          panelId="team-tab-panel"
          label="Team sections"
          navRef={tabListRef}
          onPrepare={prepareTab}
          onSelect={navigateTab}
        />
      </header>

      <SwipeableTabPanel
        tabs={TEAM_TABS}
        activeTab={activeTab}
        onTabChange={(nextTab) => navigateTab(nextTab)}
        tabListRef={tabListRef}
        id="team-tab-panel"
        className="settings-tab-content pb-8"
        stateAttribute="data-team-tab"
        labelledBy={`team-tab-${activeTab}`}
        onSwipeStart={prepareSwipeNeighbors}
        nativeOnFinePointer
        focusable={false}
      >
        {(panelTab) =>
          panelTab === activeTab || preparedTabs.has(panelTab) ? (
            <TeamTabContent tab={panelTab} setNotice={setNotice} />
          ) : null
        }
      </SwipeableTabPanel>
    </div>
  );
}
