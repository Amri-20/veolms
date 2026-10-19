import type { Permission, TeamRole } from "@veolms/contracts";
import { useCallback } from "react";
import { useCapabilities } from "../services/authorization";
import { useAuthStore } from "../store/auth.store";

/**
 * What the signed-in person may do on the Team page. Mirrors the API's
 * rules so the page never offers what the API would refuse: you can only
 * hand out (or take away) roles whose every permission you hold, and only
 * an admin hands out admin.
 */
export function useTeamAccess() {
  const capabilities = useCapabilities();
  const roles = useAuthStore((state) => state.user?.roles);
  const isAdmin = Boolean(
    roles?.some((role) => role.toLowerCase() === "admin"),
  );
  const { can } = capabilities;

  const canGrantRole = useCallback(
    (role: Pick<TeamRole, "name" | "permissions">) => {
      if (isAdmin) return true;
      if (role.name.toLowerCase() === "admin") return false;
      return role.permissions.every((key) => can(key));
    },
    [can, isAdmin],
  );

  const canGrantPermissions = useCallback(
    (keys: readonly Permission[]) => isAdmin || keys.every((key) => can(key)),
    [can, isAdmin],
  );

  return {
    isLoading: capabilities.isPending,
    isAdmin,
    can,
    canGrantRole,
    canGrantPermissions,
    canViewPage: can("team.read") || can("role.read"),
  };
}
