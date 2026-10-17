import {
  studentContactUpdateRequestSchema,
  studentContactUpdateResponseSchema,
  studentDetailResponseSchema,
  studentListQuerySchema,
  studentListResponseSchema,
  studentUsernameParamsSchema,
} from "@veolms/contracts";

import { errorResponse } from "../../lib/errors.ts";
import { jsonResponse } from "../../lib/responses.ts";
import type { RoutePlugin } from "../../lib/route-plugin.ts";
import { ADMIN_ROLE, INSTRUCTOR_ROLE } from "../auth/index.ts";
import { createAuthContext } from "../auth/shared/auth.context.ts";
import { createStudentsController } from "./students.controller.ts";
import { createStudentsService } from "./students.service.ts";

const studentsRoutes: RoutePlugin = async (app, options) => {
  const auth = createAuthContext(options);
  const service = createStudentsService({
    database: options.database,
    authService: auth.authService,
  });
  const controller = createStudentsController({ service });

  const requireInstructorOrAdmin = [
    ...auth.mfaVerified,
    auth.middleware.requireRoles([ADMIN_ROLE, INSTRUCTOR_ROLE]),
  ];
  const requireAdmin = [
    ...auth.mfaVerified,
    auth.middleware.requireRoles([ADMIN_ROLE]),
  ];

  app.get(
    "/students",
    {
      preHandler: requireInstructorOrAdmin,
      schema: {
        operationId: "listStudents",
        tags: ["Students"],
        summary:
          "List academy students with cursor-based pagination and filters",
        querystring: studentListQuerySchema,
        response: {
          200: jsonResponse(
            "List of students with cursor pagination",
            studentListResponseSchema,
          ),
          401: errorResponse("Authentication required"),
          403: errorResponse("Forbidden"),
        },
      },
    },
    controller.list,
  );

  app.get(
    "/students/:username",
    {
      preHandler: requireInstructorOrAdmin,
      schema: {
        operationId: "getStudentByUsername",
        tags: ["Students"],
        summary: "Get detailed profile and course progress of a student",
        params: studentUsernameParamsSchema,
        response: {
          200: jsonResponse(
            "Student profile and enrolled courses",
            studentDetailResponseSchema,
          ),
          401: errorResponse("Authentication required"),
          403: errorResponse("Forbidden"),
          404: errorResponse("Student not found"),
        },
      },
    },
    controller.getByUsername,
  );

  app.patch(
    "/students/:username/contact",
    {
      preHandler: requireAdmin,
      schema: {
        operationId: "updateStudentContact",
        tags: ["Students"],
        summary: "Change a student's email or phone number (admins only)",
        params: studentUsernameParamsSchema,
        body: studentContactUpdateRequestSchema,
        response: {
          200: jsonResponse(
            "The student's contact details as saved",
            studentContactUpdateResponseSchema,
          ),
          400: errorResponse("Invalid email or phone number"),
          401: errorResponse("Authentication required"),
          403: errorResponse("Forbidden"),
          404: errorResponse("Student not found"),
          409: errorResponse("Email or phone number already in use"),
        },
      },
    },
    controller.updateContact,
  );
};

export default studentsRoutes;
