import type { FastifyRequest } from "fastify";
import type { AnalyticsFilterQuery, DashboardQuery } from "@veolms/contracts";
import type { AnalyticsService } from "./analytics.service.ts";

type RequestContext = FastifyRequest & {
  user: NonNullable<FastifyRequest["user"]>;
  authorization?: {
    permission?: string;
  };
};
const context = (request: FastifyRequest) => request as RequestContext;
const actor = (request: FastifyRequest) => ({
  id: context(request).user.id,
  roles: context(request).user.roles,
});

type TabRequest = FastifyRequest<{ Querystring: AnalyticsFilterQuery }>;

/**
 * The admin and instructor routes of a tab share a handler: the service
 * widens an admin's scope to the whole academy by their role, and the
 * route's permission guard is what tells the two apart.
 */
export function createAnalyticsController({
  service,
}: {
  service: AnalyticsService;
}) {
  return {
    overview: async (request: TabRequest) =>
      service.overview(actor(request), request.query),
    revenue: async (request: TabRequest) =>
      service.revenue(actor(request), request.query),
    courses: async (request: TabRequest) =>
      service.courses(actor(request), request.query),
    dashboard: async (
      request: FastifyRequest<{ Querystring: DashboardQuery }>,
    ) => service.dashboard(actor(request), request.query.range),
  };
}

export type AnalyticsController = ReturnType<typeof createAnalyticsController>;
