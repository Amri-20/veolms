import { PlusIcon as Plus } from "@phosphor-icons/react/Plus";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { useState } from "react";
import { Button } from "../../components/Button";
import { ElevatedCard } from "../../components/ElevatedCard";
import { useTeamRoles } from "../../services/team";
import type { ToastMessage } from "../../ToastNotification";
import { roleLabel } from "../teamFormat";
import { EmptyState, StatusChip } from "../TeamBits";
import { useTeamAccess } from "../useTeamAccess";
import { RoleEditorPanel, type RoleEditorTarget } from "./RoleEditorPanel";

export function RolesTab({
  setNotice,
}: {
  setNotice?: (message: ToastMessage) => void;
}) {
  const rolesQuery = useTeamRoles();
  const { can } = useTeamAccess();
  const [editor, setEditor] = useState<RoleEditorTarget | null>(null);
  const roles = rolesQuery.data?.roles ?? [];
  const customRolesEnabled = rolesQuery.data?.customRolesEnabled ?? false;

  return (
    <div className="settings-content">
      <header className="settings-detail__header">
        <div>
          <h2>Roles</h2>
          <p>
            Each role is a set of permissions. Built-in roles are fixed;
            {customRolesEnabled
              ? " build your own from any of them."
              : " custom roles are coming soon."}
          </p>
        </div>
        {customRolesEnabled && can("role.create") ? (
          <Button onClick={() => setEditor({ mode: "create" })}>
            <Plus size={17} weight="bold" />
            New role
          </Button>
        ) : null}
      </header>

      {rolesQuery.isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-(--hover)"
            />
          ))}
        </div>
      ) : rolesQuery.isError ? (
        <p className="text-sm text-rose-500">
          Roles could not be loaded. {rolesQuery.error.message}
        </p>
      ) : roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No roles yet" />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <li key={role.id}>
              <ElevatedCard
                as="button"
                type="button"
                padded
                onClick={() => setEditor({ mode: "edit", role })}
                className="flex h-full w-full cursor-pointer flex-col items-start gap-2 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-base font-semibold text-(--text)">
                    {roleLabel(role.name)}
                  </span>
                  {role.isSystem ? (
                    <StatusChip tone="neutral">Built-in</StatusChip>
                  ) : null}
                </span>
                <span className="line-clamp-2 text-sm text-(--muted)">
                  {role.description || "No description."}
                </span>
                <span className="mt-auto flex gap-3 pt-1 text-xs text-(--muted)">
                  <span>
                    <strong className="text-(--text)">
                      {role.permissions.length}
                    </strong>{" "}
                    permissions
                  </span>
                  <span>
                    <strong className="text-(--text)">
                      {role.memberCount}
                    </strong>{" "}
                    {role.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
              </ElevatedCard>
            </li>
          ))}
        </ul>
      )}

      {editor ? (
        <RoleEditorPanel
          // A new key per target resets the form when Duplicate swaps it.
          key={
            editor.mode === "edit"
              ? editor.role.id
              : `new-${editor.from?.id ?? ""}`
          }
          target={editor}
          customRolesEnabled={customRolesEnabled}
          onClose={() => setEditor(null)}
          onDuplicate={(role) => setEditor({ mode: "create", from: role })}
          setNotice={setNotice}
        />
      ) : null}
    </div>
  );
}
