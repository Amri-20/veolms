import type { TeamMember } from "@veolms/contracts";
import { useState } from "react";
import { Button } from "../../components/Button";
import { SlideOverPanel } from "../../components/SlideOverPanel";
import {
  useSetTeamMemberRoles,
  useUpdateTeamInvitationRoles,
} from "../../services/team";
import type { ToastMessage } from "../../ToastNotification";
import { RolePicker } from "../RolePicker";
import {
  FieldLabel,
  PanelBody,
  PanelFooter,
  PersonAvatar,
  secondaryButtonClassName,
} from "../TeamBits";

/** Change a member's roles, or those waiting for someone's first sign-in. */
export function EditRolesPanel({
  member,
  onClose,
  setNotice,
}: {
  member: TeamMember;
  onClose: () => void;
  setNotice?: (message: ToastMessage) => void;
}) {
  const [roleIds, setRoleIds] = useState(member.roles.map((role) => role.id));
  const [error, setError] = useState<string | null>(null);
  const setMemberRoles = useSetTeamMemberRoles();
  const updateInvitation = useUpdateTeamInvitationRoles();
  const pending = setMemberRoles.isPending || updateInvitation.isPending;
  const name = member.name || member.email;

  const save = async () => {
    setError(null);
    try {
      if (member.userId) {
        await setMemberRoles.mutateAsync({ userId: member.userId, roleIds });
      } else if (member.invitationId) {
        await updateInvitation.mutateAsync({
          invitationId: member.invitationId,
          roleIds,
        });
      }
      setNotice?.({ type: "success", message: `Roles for ${name} saved.` });
      onClose();
    } catch (cause) {
      setError(
        (cause as { message?: string }).message ?? "Something went wrong.",
      );
    }
  };

  return (
    <SlideOverPanel
      label={`Roles for ${name}`}
      title="Change roles"
      onClose={onClose}
      closeLabel="Close"
    >
      <PanelBody>
        <div className="mb-6 flex items-center gap-3">
          <PersonAvatar
            name={member.name}
            email={member.email}
            avatarUrl={member.avatarUrl}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-(--text)">
              {name}
            </span>
            <span className="block truncate text-xs text-(--muted)">
              {member.status === "awaiting_sign_in"
                ? "Waiting for first sign-in"
                : member.email}
            </span>
          </span>
        </div>
        <FieldLabel hint="Taking every role away takes them off the team.">
          Roles
        </FieldLabel>
        <RolePicker
          selected={roleIds}
          onChange={setRoleIds}
          idPrefix={`edit-role-${member.userId ?? member.invitationId}`}
        />
        {error ? (
          <p role="alert" className="mt-4 text-sm text-rose-500">
            {error}
          </p>
        ) : null}
      </PanelBody>
      <PanelFooter>
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={onClose}
        >
          Cancel
        </button>
        <Button
          disabled={pending || (roleIds.length === 0 && !member.userId)}
          onClick={() => void save()}
        >
          {pending
            ? "Saving…"
            : roleIds.length === 0
              ? "Remove from team"
              : "Save roles"}
        </Button>
      </PanelFooter>
    </SlideOverPanel>
  );
}
