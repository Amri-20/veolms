import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { DashboardRange } from "@veolms/contracts";
import { analyticsKeys } from "./analytics.keys";
import {
  analyticsService,
  type AnalyticsFilterParams,
} from "./analytics.service";

export function useAdminAnalyticsOverview(
  params: AnalyticsFilterParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: analyticsKeys.adminOverview(params),
    queryFn: () => analyticsService.getAdminOverview(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useInstructorAnalyticsOverview(
  params: AnalyticsFilterParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: analyticsKeys.instructorOverview(params),
    queryFn: () => analyticsService.getInstructorOverview(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

const dashboardQueryOptions = (range: DashboardRange) => ({
  queryKey: analyticsKeys.dashboard(range),
  queryFn: () => analyticsService.getDashboard(range),
  staleTime: 30_000,
});

export function useDashboard(
  range: DashboardRange = "30d",
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...dashboardQueryOptions(range),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Asks for the dashboard's numbers ahead of the dashboard itself, whose code
 * and permission check are still on their way, so that it opens with them
 * rather than with its own loading state.
 */
export function prefetchDashboard(
  queryClient: QueryClient,
  range: DashboardRange = "30d",
) {
  return queryClient.prefetchQuery(dashboardQueryOptions(range));
}
