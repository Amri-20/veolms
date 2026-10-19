import {
  TEAM_INVITATION_MAX_EMAILS,
  TEAM_INVITATION_MESSAGE_MAX_LENGTH,
  type CreateTeamInvitationsResponse,
  type TeamInvitationKind,
} from "@veolms/contracts";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { SlideOverPanel } from "../../components/SlideOverPanel";
import { useCreateTeamInvitations } from "../../services/team";
import { RolePicker } from "../RolePicker";
import { parseEmailList } from "../teamFormat";
import {
  FieldLabel,
  inputClassName,
  PanelBody,
  PanelFooter,
  secondaryButtonClassName,
  StatusChip,
} from "../TeamBits";

const OUTCOME_LABELS: Record<
  CreateTeamInvitationsResponse["results"][number]["outcome"],
  { label: string; tone: "success" | "accent" | "neutral" | "danger" }
> = {
  invited: { label: "Invited", tone: "success" },
  updated: { label: "Invitation renewed", tone: "success" },
  preapproved: { label: "Added by email", tone: "success" },
  promoted: { label: "Added now", tone: "accent" },
  already_member: { label: "Already has these roles", tone: "neutral" },
  failed: { label: "Not added", tone: "danger" },
};

/** Invite several people at once, then show what happened for each. */
export function InvitePanel({ onClose }: { onClose: () => void }) {
  const [emailsText, setEmailsText] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [kind, setKind] = useState<TeamInvitationKind>("invite");
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTeamInvitations();
  const [results, setResults] =
    useState<CreateTeamInvitationsResponse["results"]>();

  const { valid, invalid } = parseEmailList(emailsText);
  const tooMany = valid.length > TEAM_INVITATION_MAX_EMAILS;

  const submit = async () => {
    setError(null);
    try {
      const response = await create.mutateAsync({
        emails: valid,
        roleIds,
        kind,
        notify: kind === "invite" ? true : notify,
        message: message.trim() || null,
      });
      setResults(response.results);
    } catch (cause) {
      setError(
        (cause as { message?: string }).message ?? "Something went wrong.",
      );
    }
  };

  return (
    <SlideOverPanel
      label="Invite people"
      title="Invite people"
      onClose={onClose}
      closeLabel="Close"
    >
      <PanelBody>
        {results ? (
          <ul className="m-0 flex list-none flex-col divide-y divide-[color-mix(in_srgb,var(--text)_8%,transparent)] p-0">
            {results.map((result) => {
              const outcome = OUTCOME_LABELS[result.outcome];
              return (
                <li key={result.email} className="flex flex-col gap-1 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-(--text)">
                      {result.email}
                    </span>
                    <StatusChip tone={outcome.tone}>{outcome.label}</StatusChip>
                  </span>
                  {result.error ? (
                    <span className="text-xs text-rose-500">
                      {result.error}
                    </span>
                  ) : null}
                  {!result.error &&
                  !result.emailSent &&
                  (result.outcome === "invited" ||
                    result.outcome === "updated") ? (
                    <span className="text-xs text-amber-500">
                      The email did not go out. Resend it from the list.
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <FieldLabel
                htmlFor="invite-emails"
                hint="Paste one or more addresses, separated by commas or new lines."
              >
                Emails
              </FieldLabel>
              <textarea
                id="invite-emails"
                className={`${inputClassName} h-auto min-h-24 py-2`}
                value={emailsText}
                onChange={(event) => setEmailsText(event.target.value)}
                placeholder="name@example.com"
                autoFocus
              />
              <p className="mt-1 text-xs text-(--muted)">
                {valid.length} address{valid.length === 1 ? "" : "es"}
                {invalid.length > 0 ? (
                  <span className="text-rose-500">
                    {" "}
                    · not an email: {invalid.slice(0, 3).join(", ")}
                  </span>
                ) : null}
                {tooMany ? (
                  <span className="text-rose-500">
                    {" "}
                    · at most {TEAM_INVITATION_MAX_EMAILS} at a time
                  </span>
                ) : null}
              </p>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-(--text)">
                How
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    [
                      "invite",
                      "Send invite",
                      "They get a link and accept first.",
                    ],
                    [
                      "preapproved",
                      "Add by email",
                      "Roles apply the first time they sign in.",
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 ${kind === value ? "border-(--accent) bg-(--accent)/6" : "border-[color-mix(in_srgb,var(--text)_12%,transparent)] hover:bg-(--hover)"}`}
                  >
                    <input
                      type="radio"
                      name="invite-kind"
                      value={value}
                      checked={kind === value}
                      onChange={() => setKind(value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-(--text)">
                      {label}
                    </span>
                    <span className="text-xs text-(--muted)">{hint}</span>
                  </label>
                ))}
              </div>
              {kind === "preapproved" ? (
                <div className="mt-3">
                  <Checkbox
                    id="invite-notify"
                    checked={notify}
                    onCheckedChange={setNotify}
                    label="Email them to say they were added"
                  />
                </div>
              ) : null}
            </fieldset>

            <div>
              <FieldLabel>Roles</FieldLabel>
              <RolePicker
                selected={roleIds}
                onChange={setRoleIds}
                idPrefix="invite-role"
              />
            </div>

            <div>
              <FieldLabel
                htmlFor="invite-message"
                hint="Optional. Shown in the email."
              >
                Message
              </FieldLabel>
              <textarea
                id="invite-message"
                className={`${inputClassName} h-auto min-h-18 py-2`}
                value={message}
                maxLength={TEAM_INVITATION_MESSAGE_MAX_LENGTH}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-rose-500">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </PanelBody>
      <PanelFooter>
        {results ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={onClose}
            >
              Cancel
            </button>
            <Button
              disabled={
                create.isPending ||
                valid.length === 0 ||
                tooMany ||
                invalid.length > 0 ||
                roleIds.length === 0
              }
              onClick={() => void submit()}
            >
              {create.isPending
                ? "Sending…"
                : kind === "invite"
                  ? `Invite ${valid.length || ""}`.trim()
                  : `Add ${valid.length || ""}`.trim()}
            </Button>
          </>
        )}
      </PanelFooter>
    </SlideOverPanel>
  );
}
