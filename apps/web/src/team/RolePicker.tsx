import { CheckIcon as Check } from "@phosphor-icons/react/Check";
import type { TeamRole } from "@veolms/contracts";
import { useTeamRoles } from "../services/team";
import { roleLabel } from "./teamFormat";
import { StatusChip } from "./TeamBits";
import { useTeamAccess } from "./useTeamAccess";

/**
 * Choose team roles. Roles the signed-in person could not hand out are shown
 * but locked, with the reason, so the list is the same for everyone.
 */
export function RolePicker({
  selected,
  onChange,
  idPrefix,
}: {
  selected: readonly string[];
  onChange: (roleIds: string[]) => void;
  idPrefix: string;
}) {
  const rolesQuery = useTeamRoles();
  const { canGrantRole } = useTeamAccess();
  const roles = rolesQuery.data?.roles ?? [];
  const selectedSet = new Set(selected);

  if (rolesQuery.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl bg-(--hover)"
          />
        ))}
      </div>
    );
  }

  if (rolesQuery.isError) {
    return (
      <p className="text-sm text-rose-500">
        Roles could not be loaded. {rolesQuery.error.message}
      </p>
    );
  }

  const toggle = (role: TeamRole) => {
    const next = new Set(selectedSet);
    if (next.has(role.id)) next.delete(role.id);
    else next.add(role.id);
    onChange([...next]);
  };

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {roles.map((role) => {
        const checked = selectedSet.has(role.id);
        // The API checks both giving and taking away a role against your
        // own permissions, so a role you could not give is locked either way.
        const locked = !canGrantRole(role);
        const inputId = `${idPrefix}-${role.id}`;
        return (
          <li key={role.id}>
            <label
              htmlFor={inputId}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${checked ? "border-(--accent) bg-(--accent)/6" : "border-[color-mix(in_srgb,var(--text)_12%,transparent)]"} ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-(--hover)"}`}
            >
              <input
                id={inputId}
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={locked}
                onChange={() => toggle(role)}
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? "border-(--accent) bg-(--accent) text-(--on-accent)" : "border-[color-mix(in_srgb,var(--text)_30%,transparent)]"}`}
              >
                {checked ? <Check size={11} weight="bold" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-(--text)">
                  {roleLabel(role.name)}
                  {role.isSystem ? (
                    <StatusChip tone="neutral">Built-in</StatusChip>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-(--muted)">
                  {locked
                    ? "You can only give roles whose permissions you hold yourself."
                    : role.description ||
                      `${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
