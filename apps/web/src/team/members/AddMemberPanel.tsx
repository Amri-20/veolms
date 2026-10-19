import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { EnvelopeSimpleIcon as EnvelopeSimple } from "@phosphor-icons/react/EnvelopeSimple";
import { UserPlusIcon as UserPlus } from "@phosphor-icons/react/UserPlus";
import type { TeamUserSearchResult } from "@veolms/contracts";
import { useDeferredValue, useState } from "react";
import { Button } from "../../components/Button";
import { SlideOverPanel } from "../../components/SlideOverPanel";
import {
  useCreateTeamInvitations,
  useSetTeamMemberRoles,
  useTeamUserSearch,
} from "../../services/team";
import type { ToastMessage } from "../../ToastNotification";
import { RolePicker } from "../RolePicker";
import { looksLikeEmail } from "../teamFormat";
import {
  FieldLabel,
  PanelBody,
  PanelFooter,
  PersonAvatar,
  RoleChips,
  SearchField,
  secondaryButtonClassName,
} from "../TeamBits";

type Target =
  | { kind: "user"; user: TeamUserSearchResult }
  | { kind: "email"; email: string; mode: "preapproved" | "invite" };

/**
 * Add someone to the team: find an account and pick roles (applied at
 * once), or, when nobody matches, add the email so the roles apply on first
 * sign-in, or send an invitation to accept.
 */
export function AddMemberPanel({
  onClose,
  setNotice,
  initialUser,
}: {
  onClose: () => void;
  setNotice?: (message: ToastMessage) => void;
  /** Opened from a student's page: that person is already chosen. */
  initialUser?: TeamUserSearchResult;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [target, setTarget] = useState<Target | null>(
    initialUser ? { kind: "user", user: initialUser } : null,
  );
  const [roleIds, setRoleIds] = useState<string[]>(
    initialUser?.roles.map((role) => role.id) ?? [],
  );
  const search = useTeamUserSearch(target ? "" : deferredQuery);
  // Opened for a chosen person (from their student page): saving replaces
  // their team roles, so read the ones they hold before anything is saved.
  const initialLookup = useTeamUserSearch(initialUser?.email ?? "");
  const [initialRolesLoaded, setInitialRolesLoaded] = useState(!initialUser);
  const initialMatch = initialLookup.data?.users.find(
    (user) => user.userId === initialUser?.userId,
  );
  if (initialUser && !initialRolesLoaded && initialLookup.isSuccess) {
    setInitialRolesLoaded(true);
    if (initialMatch) {
      setTarget({ kind: "user", user: initialMatch });
      setRoleIds(initialMatch.roles.map((role) => role.id));
    }
  }
  const setRoles = useSetTeamMemberRoles();
  const invite = useCreateTeamInvitations();
  const pending = setRoles.isPending || invite.isPending || !initialRolesLoaded;
  const [error, setError] = useState<string | null>(null);

  const users = search.data?.users ?? [];
  const typedEmail = query.trim().toLowerCase();
  const exactMatch = users.some((user) => user.email === typedEmail);
  const offerEmail = looksLikeEmail(typedEmail) && !exactMatch;

  const pickUser = (user: TeamUserSearchResult) => {
    setTarget({ kind: "user", user });
    setRoleIds(user.roles.map((role) => role.id));
    setError(null);
  };

  const save = async () => {
    if (!target || roleIds.length === 0) return;
    setError(null);
    try {
      if (target.kind === "user") {
        await setRoles.mutateAsync({ userId: target.user.userId, roleIds });
        setNotice?.({
          type: "success",
          message: `${target.user.name || target.user.email} is on the team.`,
        });
      } else {
        const { results } = await invite.mutateAsync({
          emails: [target.email],
          roleIds,
          kind: target.mode,
          notify: true,
          message: null,
        });
        const result = results[0];
        if (!result || result.outcome === "failed") {
          setError(result?.error ?? "This email could not be added.");
          return;
        }
        setNotice?.({
          type:
            result.emailSent || result.outcome === "already_member"
              ? "success"
              : "warning",
          message: outcomeMessage(
            target.email,
            result.outcome,
            result.emailSent,
          ),
        });
      }
      onClose();
    } catch (cause) {
      setError(
        (cause as { message?: string }).message ?? "Something went wrong.",
      );
    }
  };

  return (
    <SlideOverPanel
      label="Add team member"
      title="Add team member"
      onClose={onClose}
      closeLabel="Close"
    >
      <PanelBody>
        {target ? (
          <ChosenTarget
            target={target}
            onChange={initialUser ? undefined : () => setTarget(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <FieldLabel hint="Search by name, username or email. To add someone without an account, type their email.">
              Who
            </FieldLabel>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Name or email"
              label="Find a person"
              autoFocus
            />
            <ul
              className="m-0 flex list-none flex-col gap-1 p-0"
              aria-live="polite"
            >
              {users.map((user) => (
                <li key={user.userId}>
                  <button
                    type="button"
                    onClick={() => pickUser(user)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-(--hover)"
                  >
                    <PersonAvatar
                      name={user.name}
                      email={user.email}
                      avatarUrl={user.avatarUrl}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-(--text)">
                        {user.name || user.username}
                      </span>
                      <span className="block truncate text-xs text-(--muted)">
                        {user.email}
                      </span>
                    </span>
                    {user.isMember ? <RoleChips roles={user.roles} /> : null}
                  </button>
                </li>
              ))}
            </ul>
            {deferredQuery.trim().length >= 2 &&
            search.isSuccess &&
            users.length === 0 &&
            !offerEmail ? (
              <p className="text-sm text-(--muted)">
                Nobody matches. Type their full email to add them by email.
              </p>
            ) : null}
            {offerEmail ? (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--text)_12%,transparent)] p-3">
                <p className="text-sm text-(--text)">
                  No account uses <strong>{typedEmail}</strong> yet.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    onClick={() =>
                      setTarget({
                        kind: "email",
                        email: typedEmail,
                        mode: "preapproved",
                      })
                    }
                  >
                    <UserPlus size={16} weight="bold" />
                    Add by email
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    onClick={() =>
                      setTarget({
                        kind: "email",
                        email: typedEmail,
                        mode: "invite",
                      })
                    }
                  >
                    <EnvelopeSimple size={16} weight="bold" />
                    Send invite
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {target ? (
          <div className="mt-6">
            <FieldLabel hint="Team members sign in with two-factor verification.">
              Roles
            </FieldLabel>
            <RolePicker
              selected={roleIds}
              onChange={setRoleIds}
              idPrefix="add-member-role"
            />
          </div>
        ) : null}

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
          disabled={!target || roleIds.length === 0 || pending}
          onClick={() => void save()}
        >
          {pending ? "Saving…" : saveLabel(target)}
        </Button>
      </PanelFooter>
    </SlideOverPanel>
  );
}

function saveLabel(target: Target | null): string {
  if (target?.kind === "email") {
    return target.mode === "invite" ? "Send invite" : "Add by email";
  }
  return target?.user.isMember ? "Save roles" : "Add to team";
}

function outcomeMessage(
  email: string,
  outcome: string,
  emailSent: boolean,
): string {
  switch (outcome) {
    case "promoted":
      return `${email} already had an account and is on the team now.`;
    case "already_member":
      return `${email} already holds these roles.`;
    case "invited":
    case "updated":
      return emailSent
        ? `Invitation sent to ${email}.`
        : `Invitation saved, but the email to ${email} failed. Resend it from Invitations.`;
    default:
      return `${email} gets these roles the first time they sign in with this address.`;
  }
}

function ChosenTarget({
  target,
  onChange,
}: {
  target: Target;
  onChange?: () => void;
}) {
  const isUser = target.kind === "user";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] p-3">
      {isUser ? (
        <PersonAvatar
          name={target.user.name}
          email={target.user.email}
          avatarUrl={target.user.avatarUrl}
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent)/12 text-(--accent)">
          <EnvelopeSimple size={18} weight="bold" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-(--text)">
          {isUser ? target.user.name || target.user.username : target.email}
        </span>
        <span className="block truncate text-xs text-(--muted)">
          {isUser
            ? target.user.email
            : target.mode === "invite"
              ? "Gets an email with a link to accept"
              : "Roles apply the first time they sign in with this email"}
        </span>
      </span>
      {isUser && target.user.isMember ? (
        <CheckCircle
          size={18}
          weight="fill"
          className="text-(--accent)"
          aria-label="Already on the team"
        />
      ) : null}
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="cursor-pointer text-sm font-semibold text-(--accent) hover:underline"
        >
          Change
        </button>
      ) : null}
    </div>
  );
}
