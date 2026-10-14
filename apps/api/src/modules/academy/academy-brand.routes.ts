import {
  academyBrandResponseSchema,
  updateAcademyBrandRequestSchema,
  type UpdateAcademyBrandRequest,
} from "@veolms/contracts";
import type { FastifyRequest } from "fastify";

import { errorResponse } from "../../lib/errors.ts";
import { jsonResponse } from "../../lib/responses.ts";
import type { RoutePlugin } from "../../lib/route-plugin.ts";
import { createAuthMiddleware } from "../../middlewares/auth.middleware.ts";
import { ADMIN_ROLE, createSessionService } from "../auth/index.ts";
import { createAcademyBrandService } from "./academy-brand.service.ts";

/**
 * The academy's name and logo, which its emails carry. Administrators only:
 * set during setup, changed here afterwards.
 */
const academyBrandRoutes: RoutePlugin = async (app, options) => {
  const middleware = createAuthMiddleware(
    createSessionService({ database: options.database }),
  );
  const requireAdmin = [
    middleware.authenticate,
    middleware.requireAuthenticated,
    middleware.requireMfaVerified,
    middleware.requireRoles([ADMIN_ROLE]),
  ];
  const service = createAcademyBrandService({ database: options.database });

  app.get(
    "/academy/brand",
    {
      preHandler: requireAdmin,
      schema: {
        operationId: "getAcademyBrand",
        tags: ["Academy"],
        summary: "The academy's name and logo",
        response: {
          200: jsonResponse("The academy's brand.", academyBrandResponseSchema),
          401: errorResponse("Unauthorized"),
          403: errorResponse("Forbidden"),
        },
      },
    },
    async () => await service.readBrand(),
  );

  app.put(
    "/academy/brand",
    {
      preHandler: requireAdmin,
      schema: {
        operationId: "updateAcademyBrand",
        tags: ["Academy"],
        summary: "Change the academy's name and logo",
        body: updateAcademyBrandRequestSchema,
        response: {
          200: jsonResponse("The saved brand.", academyBrandResponseSchema),
          400: errorResponse("Invalid name or logo address"),
          401: errorResponse("Unauthorized"),
          403: errorResponse("Forbidden"),
          409: errorResponse("The academy has not been set up yet"),
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdateAcademyBrandRequest }>) =>
      await service.updateBrand(request.body),
  );
};

export default academyBrandRoutes;
