import type { DatabaseExecutor as Executor } from "@veolms/database";
import type { Permission, CapabilitiesResponse } from "@veolms/contracts";
import * as repo from "./authorization.repository.ts";

export interface AuthorizationCheckRequest {
  userId: string;
  permission: Permission;
  courseId?: string | null;
  featureKey?: string;
  /**
   * Count only roles that reach every course: for academy-wide surfaces
   * (platform moderation, all students), where an instructor's course
   * permissions must not apply.
   */
  platformWide?: boolean;
}

export interface AuthorizationDecision {
  allowed: boolean;
  code?: "ALLOWED" | "PERMISSION_DENIED" | "FEATURE_DISABLED";
  reason?: string;
  permission?: Permission;
  scope?: {
    courseId?: string | null;
  };
}

export interface AuthorizationService {
  check(request: AuthorizationCheckRequest): Promise<AuthorizationDecision>;
  getCapabilities(params: {
    userId: string;
    courseId?: string | null;
  }): Promise<CapabilitiesResponse>;
  resolveScope(
    resourceType: "platform" | "course" | "lesson" | "section",
    resourceId?: string,
  ): Promise<{ courseId: string | null }>;
}

export function createAuthorizationService(
  database: Executor,
): AuthorizationService {
  return {
    async check(
      request: AuthorizationCheckRequest,
    ): Promise<AuthorizationDecision> {
      const { userId, permission, courseId, featureKey, platformWide } =
        request;

      // 1. Check Feature Entitlement if a feature is bound to this action
      if (featureKey) {
        const featureEnabled = await repo.isFeatureEnabled(
          database,
          featureKey,
        );
        if (!featureEnabled) {
          return {
            allowed: false,
            code: "FEATURE_DISABLED",
            reason: `Feature '${featureKey}' is disabled on the platform`,
            scope: { courseId },
          };
        }
      }

      // 2. Check Scoped Role Permissions
      const result = await repo.checkUserPermission(database, {
        userId,
        permissionKey: permission,
        courseId,
        excludeOwnCoursesOnlyRoles: platformWide,
      });

      if (!result.allowed) {
        return {
          allowed: false,
          code: "PERMISSION_DENIED",
          reason:
            result.reason ??
            "You do not have permission to perform this action",
          scope: { courseId },
        };
      }

      return {
        allowed: true,
        code: "ALLOWED",
        scope: { courseId },
      };
    },

    async getCapabilities(params: {
      userId: string;
      courseId?: string | null;
    }): Promise<CapabilitiesResponse> {
      const { userId, courseId } = params;

      const [permissions, academyPermissions] = await Promise.all([
        repo.getUserEffectivePermissions(database, { userId, courseId }),
        repo.getUserEffectivePermissions(database, {
          userId,
          excludeOwnCoursesOnlyRoles: true,
        }),
      ]);
      return { permissions, academyPermissions };
    },

    async resolveScope(
      resourceType: "platform" | "course" | "lesson" | "section",
      resourceId?: string,
    ): Promise<{ courseId: string | null }> {
      if (resourceType === "platform" || !resourceId) {
        return { courseId: null };
      }

      if (resourceType === "course") {
        const resolved = await repo.resolveCourseScope(database, resourceId);
        return {
          courseId: resolved?.courseId ?? resourceId,
        };
      }

      if (resourceType === "lesson") {
        const resolved = await repo.resolveLessonScope(database, resourceId);
        return {
          courseId: resolved?.courseId ?? null,
        };
      }

      if (resourceType === "section") {
        const resolved = await repo.resolveSectionScope(database, resourceId);
        return {
          courseId: resolved?.courseId ?? null,
        };
      }

      return { courseId: null };
    },
  };
}
