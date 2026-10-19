import {
  dashboardQuerySchema,
  analyticsFilterQuerySchema,
  analyticsCoursesResponseSchema,
  analyticsOverviewResponseSchema,
  analyticsRevenueResponseSchema,
  dashboardSummaryResponseSchema,
} from "@veolms/contracts";
import type { z } from "zod";
import { createAuthContext } from "../auth/shared/auth.context.ts";
import {
  createAuthorizationGuard,
  createAuthorizationService,
} from "../authorization/index.ts";
import { createCourseService } from "../courses/course/course.service.ts";
import { createOrderService } from "../commerce/orders/order.service.ts";
import { createEnrollmentService } from "../commerce/enrollments/enrollment.service.ts";
import { createStudentsService } from "../students/students.service.ts";
import { createLearningProgressService } from "../learning-progress/learning-progress.service.ts";
import { errorResponse } from "../../lib/errors.ts";
import { jsonResponse } from "../../lib/responses.ts";
import type { RoutePlugin } from "../../lib/route-plugin.ts";
import { createAnalyticsService } from "./analytics.service.ts";
import {
  createAnalyticsController,
  type AnalyticsController,
} from "./analytics.controller.ts";

/**
 * One tab, two routes: `/analytics/admin/<tab>` for the whole academy
 * (analytics.revenue.read on the platform) and `/analytics/instructor/<tab>`
 * for the caller's own courses (analytics.course.read on a course). The
 * response shape is the same; only the scope differs.
 */
const TABS = [
  {
    key: "overview",
    handler: "overview",
    title: "analytics overview",
    description:
      "Revenue, orders, enrollments, the commerce funnel and course performance",
    schema: analyticsOverviewResponseSchema,
  },
  {
    key: "revenue",
    handler: "revenue",
    title: "revenue analytics",
    description:
      "Sales, refunds, revenue by product and source, payment methods and coupons",
    schema: analyticsRevenueResponseSchema,
  },
  {
    key: "courses",
    handler: "courses",
    title: "courses and content analytics",
    description:
      "Catalogue size, enrollments, completion, top courses and quiz results",
    schema: analyticsCoursesResponseSchema,
  },
] as const satisfies ReadonlyArray<{
  key: string;
  handler: keyof AnalyticsController;
  title: string;
  description: string;
  schema: z.ZodType;
}>;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const analyticsRoutes: RoutePlugin = async (app, options) => {
  const auth = createAuthContext(options);
  const authorizationService = createAuthorizationService(options.database);
  const authGuard = createAuthorizationGuard(authorizationService);
  const courseService = createCourseService({
    database: options.database,
    services: options.services,
  });

  const service = createAnalyticsService({
    database: options.database,
    orderService: createOrderService({ database: options.database }),
    enrollmentService: createEnrollmentService({
      database: options.database,
      courseService,
    }),
    studentsService: createStudentsService({ database: options.database }),
    courseService,
    learningProgressService: createLearningProgressService({
      database: options.database,
      services: options.services,
    }),
  });
  const controller = createAnalyticsController({ service });

  const errors = {
    401: errorResponse("Authentication required"),
    403: errorResponse("Forbidden"),
  };

  for (const tab of TABS) {
    app.get(
      `/analytics/admin/${tab.key}`,
      {
        schema: {
          operationId: `getAdminAnalytics${capitalize(tab.key)}`,
          tags: ["Analytics"],
          summary: `Get platform-wide ${tab.title}`,
          description: `${tab.description} across the whole academy, or a single course when ?courseId= is given. Requires the analytics.revenue.read permission.`,
          querystring: analyticsFilterQuerySchema,
          response: {
            200: jsonResponse(`Admin ${tab.title}`, tab.schema),
            ...errors,
          },
        },
        preHandler: [
          ...auth.mfaVerified,
          authGuard.authorize("analytics.revenue.read", "platform"),
        ],
      },
      controller[tab.handler],
    );

    app.get(
      `/analytics/instructor/${tab.key}`,
      {
        schema: {
          operationId: `getInstructorAnalytics${capitalize(tab.key)}`,
          tags: ["Analytics"],
          summary: `Get instructor ${tab.title}`,
          description: `${tab.description} for a specific course (?courseId=) or, with none given, every course the caller owns. Requires the analytics.course.read permission.`,
          querystring: analyticsFilterQuerySchema,
          response: {
            200: jsonResponse(`Instructor ${tab.title}`, tab.schema),
            ...errors,
          },
        },
        preHandler: [
          ...auth.mfaVerified,
          authGuard.authorize("analytics.course.read", "course"),
        ],
      },
      controller[tab.handler],
    );
  }

  app.get(
    "/analytics/dashboard",
    {
      schema: {
        operationId: "getDashboardSummary",
        tags: ["Analytics"],
        summary: "Get the dashboard summary",
        description:
          "Returns the top dashboard card metrics, Learning Activity, and the range-aware Revenue Overview. Requires the platform-wide analytics.revenue.read permission.",
        querystring: dashboardQuerySchema,
        response: {
          200: jsonResponse(
            "Dashboard summary",
            dashboardSummaryResponseSchema,
          ),
          ...errors,
        },
      },
      preHandler: [
        ...auth.mfaVerified,
        authGuard.authorize("analytics.revenue.read", "platform"),
      ],
    },
    controller.dashboard,
  );
};

export default analyticsRoutes;
