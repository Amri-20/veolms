import type { TeamRole } from "@veolms/contracts";
import { useState } from "react";
import { useTeamRoles } from "../services/team";
import { roleLabel } from "./teamFormat";
import { SquareCheck } from "./TeamBits";
import { useTeamAccess } from "./useTeamAccess";

const FIRST_SHOWN = 4;

/** Everyday roles first; admin last, as the one to think twice about. */
function pickerOrder(roles: readonly TeamRole[]): TeamRole[] {
  return [...roles].sort((a, b) => {
    const adminA = a.name.toLowerCase() === "admin";
    const adminB = b.name.toLowerCase() === "admin";
    if (adminA !== adminB) return adminA ? 1 : -1;
    return 0;
  });
}

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
  const [showAll, setShowAll] = useState(false);
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

  const roles = pickerOrder(rolesQuery.data.roles);
  // A chosen role is never tucked away behind "Show more".
  const hiddenSelected = roles
    .slice(FIRST_SHOWN)
    .some((role) => selectedSet.has(role.id));
  const visible =
    showAll || hiddenSelected ? roles : roles.slice(0, FIRST_SHOWN);
  const hiddenCount = roles.length - visible.length;

  const toggle = (role: TeamRole) => {
    const next = new Set(selectedSet);
    if (next.has(role.id)) next.delete(role.id);
    else next.add(role.id);
    onChange([...next]);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)]">
      <ul className="m-0 list-none p-0">
        {visible.map((role) => {
          const checked = selectedSet.has(role.id);
          // The API checks giving and taking away a role against your own
          // permissions, so a role you could not give is locked either way.
          const locked = !canGrantRole(role);
          const inputId = `${idPrefix}-${role.id}`;
          return (
            <li
              key={role.id}
              className="border-b border-[color-mix(in_srgb,var(--text)_8%,transparent)] last:border-b-0"
            >
              <label
                htmlFor={inputId}
                className={`flex items-center gap-3 px-3.5 py-3 transition-colors ${checked ? "bg-(--accent)/8" : ""} ${locked ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-(--hover)"}`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggle(role)}
                />
                <SquareCheck checked={checked} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-(--text)">
                    {roleLabel(role.name)}
                  </span>
                  <span className="block truncate text-xs text-(--muted)">
                    {locked
                      ? "Includes permissions you do not hold."
                      : role.description || "No description."}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[0.7rem] text-(--muted)">
                  {role.permissions.length} perms
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full cursor-pointer border-t border-[color-mix(in_srgb,var(--text)_8%,transparent)] px-3.5 py-2.5 text-left text-xs font-semibold text-(--accent) hover:bg-(--hover)"
        >
          Show {hiddenCount} more role{hiddenCount === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  );
}
