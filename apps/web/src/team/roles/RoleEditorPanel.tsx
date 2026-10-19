import { CopyIcon as Copy } from "@phosphor-icons/react/Copy";
import { LockSimpleIcon as LockSimple } from "@phosphor-icons/react/LockSimple";
import { TrashIcon as Trash } from "@phosphor-icons/react/Trash";
import {
  permissionCatalogue,
  TEAM_ROLE_DESCRIPTION_MAX_LENGTH,
  TEAM_ROLE_NAME_MAX_LENGTH,
  type Permission,
  type TeamRole,
} from "@veolms/contracts";
import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { SlideOverPanel } from "../../components/SlideOverPanel";
import {
  useCreateTeamRole,
  useDeleteTeamRole,
  useUpdateTeamRole,
} from "../../services/team";
import { ConfirmActionModal } from "../../shell/ConfirmActionModal";
import type { ToastMessage } from "../../ToastNotification";
import { roleLabel } from "../teamFormat";
import {
  FieldLabel,
  inputClassName,
  PanelBody,
  PanelFooter,
  secondaryButtonClassName,
  StatusChip,
} from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { isRequiredByOther, tick, untick } from "./permissionSelection";

export type RoleEditorTarget =
  { mode: "create"; from?: TeamRole } | { mode: "edit"; role: TeamRole };

export function RoleEditorPanel({
  target,
  customRolesEnabled,
  onClose,
  onDuplicate,
  setNotice,
}: {
  target: RoleEditorTarget;
  customRolesEnabled: boolean;
  onClose: () => void;
  onDuplicate: (role: TeamRole) => void;
  setNotice?: (message: ToastMessage) => void;
}) {
  const { can, isAdmin } = useTeamAccess();
  const existing = target.mode === "edit" ? target.role : undefined;
  const source =
    existing ?? (target.mode === "create" ? target.from : undefined);
  const [name, setName] = useState(
    existing
      ? existing.name
      : source
        ? `Copy of ${roleLabel(source.name)}`
        : "",
  );
  const [description, setDescription] = useState(source?.description ?? "");
  const [selected, setSelected] = useState<Set<Permission>>(
    () => new Set(source?.permissions ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const createRole = useCreateTeamRole();
  const updateRole = useUpdateTeamRole();
  const deleteRole = useDeleteTeamRole();
  const pending = createRole.isPending || updateRole.isPending;

  const readOnly = existing
    ? existing.isSystem || !can("role.update")
    : !can("role.create") || !customRolesEnabled;
  const canDuplicate =
    Boolean(existing) && customRolesEnabled && can("role.create");
  const canDelete = Boolean(
    existing && !existing.isSystem && can("role.delete"),
  );
  const locked = (key: Permission) => !isAdmin && !can(key);

  const groups = useMemo(() => permissionCatalogue, []);

  const toggleKey = (key: Permission, checked: boolean) =>
    setSelected((current) =>
      checked ? tick(current, [key]) : untick(current, [key]),
    );

  const toggleGroup = (keys: Permission[], checked: boolean) =>
    setSelected((current) =>
      checked
        ? tick(
            current,
            keys.filter((key) => !locked(key)),
          )
        : untick(current, keys),
    );

  const save = async () => {
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: [...selected],
    };
    try {
      if (existing) {
        await updateRole.mutateAsync({ roleId: existing.id, payload });
        setNotice?.({ type: "success", message: `${payload.name} saved.` });
      } else {
        await createRole.mutateAsync(payload);
        setNotice?.({ type: "success", message: `${payload.name} created.` });
      }
      onClose();
    } catch (cause) {
      setError(
        (cause as { message?: string }).message ?? "Something went wrong.",
      );
    }
  };

  const remove = async () => {
    if (!existing) return;
    try {
      await deleteRole.mutateAsync(existing.id);
      setNotice?.({ type: "success", message: `${existing.name} deleted.` });
      onClose();
    } catch (cause) {
      setError(
        (cause as { message?: string }).message ?? "Something went wrong.",
      );
    } finally {
      setConfirmingDelete(false);
    }
  };

  const title = existing ? roleLabel(existing.name) : "New role";

  return (
    <SlideOverPanel
      label={title}
      title={
        <span className="flex items-center gap-2">
          {title}
          {existing?.isSystem ? (
            <StatusChip tone="neutral">Built-in</StatusChip>
          ) : null}
        </span>
      }
      onClose={onClose}
      closeLabel="Close"
      headerContent={
        existing?.isSystem ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-(--muted)">
            <LockSimple size={14} weight="bold" />
            Built-in roles cannot be changed.{" "}
            {canDuplicate ? "Duplicate it to make your own." : null}
          </p>
        ) : null
      }
    >
      <PanelBody>
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor="role-name">Name</FieldLabel>
            <input
              id="role-name"
              className={inputClassName}
              value={existing?.isSystem ? roleLabel(name) : name}
              maxLength={TEAM_ROLE_NAME_MAX_LENGTH}
              readOnly={readOnly}
              onChange={(event) => setName(event.target.value)}
              placeholder="For example, Support"
            />
          </div>
          <div>
            <FieldLabel htmlFor="role-description">Description</FieldLabel>
            <textarea
              id="role-description"
              className={`${inputClassName} h-auto min-h-18 py-2`}
              value={description}
              maxLength={TEAM_ROLE_DESCRIPTION_MAX_LENGTH}
              readOnly={readOnly}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this role is for"
            />
          </div>
        </div>

        <h3 className="mt-6 mb-1 text-sm font-semibold text-(--text)">
          Permissions{" "}
          <span className="font-normal text-(--muted)">({selected.size})</span>
        </h3>
        <p className="mb-3 text-xs text-(--muted)">
          Ticking a permission also ticks the ones it needs.
          {isAdmin
            ? ""
            : " You can only include permissions you hold yourself."}
        </p>

        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const keys = group.entries.map((entry) => entry.key);
            const tickedCount = keys.filter((key) => selected.has(key)).length;
            return (
              <fieldset
                key={group.area}
                className="rounded-xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] p-3"
              >
                <legend className="sr-only">{group.label}</legend>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Checkbox
                    id={`role-group-${group.area}`}
                    checked={tickedCount === keys.length}
                    disabled={readOnly}
                    onCheckedChange={(checked) => toggleGroup(keys, checked)}
                    label={
                      <span className="text-sm font-semibold text-(--text)">
                        {group.label}
                      </span>
                    }
                  />
                  <span className="text-xs text-(--muted) tabular-nums">
                    {tickedCount}/{keys.length}
                  </span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 pl-1">
                  {group.entries.map((entry) => {
                    const checked = selected.has(entry.key);
                    // Only worth saying while the role can be edited.
                    const needed =
                      !readOnly &&
                      checked &&
                      isRequiredByOther(selected, entry.key);
                    return (
                      <li key={entry.key}>
                        <Checkbox
                          id={`role-perm-${entry.key}`}
                          checked={checked}
                          disabled={
                            readOnly ||
                            needed ||
                            (!checked && locked(entry.key))
                          }
                          onCheckedChange={(next) => toggleKey(entry.key, next)}
                          label={
                            <span className="block">
                              <span className="block text-sm text-(--text)">
                                {entry.label}
                              </span>
                              <span className="block text-xs text-(--muted)">
                                {needed
                                  ? "Needed by another permission you ticked."
                                  : !checked && locked(entry.key)
                                    ? "You do not hold this permission."
                                    : entry.help}
                              </span>
                            </span>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            );
          })}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-rose-500">
            {error}
          </p>
        ) : null}
      </PanelBody>
      <PanelFooter>
        {canDelete ? (
          <button
            type="button"
            className={`${secondaryButtonClassName} mr-auto text-rose-500`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash size={16} weight="bold" />
            Delete
          </button>
        ) : null}
        {canDuplicate && existing ? (
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => onDuplicate(existing)}
          >
            <Copy size={16} weight="bold" />
            Duplicate
          </button>
        ) : null}
        {readOnly ? (
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
                pending || name.trim().length === 0 || selected.size === 0
              }
              onClick={() => void save()}
            >
              {pending ? "Saving…" : existing ? "Save role" : "Create role"}
            </Button>
          </>
        )}
      </PanelFooter>

      <ConfirmActionModal
        id="team-role-delete"
        isOpen={confirmingDelete}
        isPending={deleteRole.isPending}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => void remove()}
        icon={Trash}
        tone="danger"
        emphasis="cancel"
        title={`Delete ${existing?.name ?? "this role"}?`}
        description="Only a role nobody holds, and nobody is invited with, can be deleted."
        cancelLabel="Keep it"
        confirmLabel="Delete"
        pendingLabel="Deleting…"
      />
    </SlideOverPanel>
  );
}
