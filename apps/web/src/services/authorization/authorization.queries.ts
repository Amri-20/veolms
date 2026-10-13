import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { CapabilitiesResponse, Permission } from "@veolms/contracts";
import type { ApiError } from "../../lib/api-error";
import { useAuthStore } from "../../store/auth.store";
import { authorizationKeys } from "./authorization.keys";
import { authorizationService } from "./authorization.service";

const capabilitiesQueryOptions = (params: {
  courseId?: string;
  userId?: string | null;
}) => ({
  queryKey: authorizationKeys.capabilities(params),
  queryFn: () =>
    authorizationService.getCapabilities({ courseId: params.courseId }),
  staleTime: 2 * 60 * 1000,
});

export function useCapabilities(options?: {
  courseId?: string;
  enabled?: boolean;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery<CapabilitiesResponse, ApiError>({
    ...capabilitiesQueryOptions({ courseId: options?.courseId, userId }),
    enabled: options?.enabled ?? true,
  });

  const permissions = new Set(query.data?.permissions ?? []);

  const can = (permission: Permission): boolean => {
    return permissions.has(permission);
  };

  return {
    ...query,
    can,
    permissions: query.data?.permissions ?? [],
  };
}

/**
 * Asks what an account may do before its session check has answered, for a
 * browser that remembers which account it was. The answer is kept under that
 * account, so it is only used if the session turns out to be the same one.
 */
export function prefetchCapabilities(queryClient: QueryClient, userId: string) {
  return queryClient.prefetchQuery(capabilitiesQueryOptions({ userId }));
}
