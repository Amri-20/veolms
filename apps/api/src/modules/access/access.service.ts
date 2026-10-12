import crypto from "node:crypto";
import type {
  AccessGrant,
  AccessGrantSource,
  AccessGrantStatus,
} from "@veolms/contracts";
import type { Database } from "@veolms/database";
import type { Kysely } from "kysely";
import { AppError } from "../../lib/errors.ts";
import * as accessRepo from "./access.repository.ts";
// access.repository.ts is the module's canonical source for this type — see
// the comment there for the full history of it having been separately (and,
// in auth's case, incorrectly) redefined in 4 places.
import type { Executor } from "./access.repository.ts";

export type { Executor };

export interface AccessService {
  grantAccess(
    database: Executor,
    params: {
      userId: string;
      courseId: string;
      orderId?: string | null;
      source: AccessGrantSource;
      validFrom?: Date;
      validUntil?: Date | null;
    },
  ): Promise<AccessGrant>;

  grantManualAccess(
    database: Executor,
    params: {
      userId: string;
      courseId: string;
      validUntil?: Date | null;
    },
  ): Promise<AccessGrant>;

  revokeAccessGrantById(database: Executor, grantId: string): Promise<void>;

  listUserGrants(database: Executor, userId: string): Promise<AccessGrant[]>;

  hasActiveAccess(
    database: Executor,
    userId: string,
    courseId: string,
  ): Promise<boolean>;

  listActiveUserIdsForCourse(
    database: Executor,
    courseId: string,
  ): Promise<string[]>;

  revokeAccessForOrder(database: Executor, orderId: string): Promise<void>;

  revokeAccessForOrderCourse(
    database: Executor,
    orderId: string,
    courseId: string,
  ): Promise<void>;

  /** Courses whose live grant currently belongs to an order. */
  listActiveCourseIdsForOrder(
    database: Executor,
    orderId: string,
  ): Promise<string[]>;

  /** Moves a course grant to another order without interrupting access. */
  reassignGrantToOrder(
    database: Executor,
    input: {
      fromOrderId: string;
      courseId: string;
      toOrderId: string;
      source: "purchase" | "bundle_purchase";
    },
  ): Promise<void>;
}

/**
 * Runs `work` in a transaction: the caller's, when it is already in one,
 * otherwise a new one. A grant and the enrolment that mirrors it are two
 * writes; made separately, a failure between them left a learner with
 * access and no enrolment, or an enrolment that outlived a revoked grant.
 */
async function inTransaction<T>(
  database: Executor,
  work: (transaction: Executor) => Promise<T>,
): Promise<T> {
  if (database.isTransaction) return work(database);
  return (database as Kysely<Database>).transaction().execute(work);
}

export function createAccessService(): AccessService {
  async function grantAccess(
    database: Executor,
    params: {
      userId: string;
      courseId: string;
      orderId?: string | null;
      source: AccessGrantSource;
      validFrom?: Date;
      validUntil?: Date | null;
    },
  ): Promise<AccessGrant> {
    const now = new Date();
    const grant = await accessRepo.insertAccessGrant(database, {
      id: crypto.randomUUID(),
      user_id: params.userId,
      course_id: params.courseId,
      order_id: params.orderId ?? null,
      status: "active",
      source: params.source,
      valid_from: params.validFrom ?? now,
      valid_until: params.validUntil ?? null,
      created_at: now,
      updated_at: now,
    });

    return {
      id: grant.id,
      userId: grant.user_id,
      courseId: grant.course_id,
      purchaseId: grant.order_id,
      status: grant.status as AccessGrantStatus,
      source: grant.source as AccessGrantSource,
      validFrom: grant.valid_from,
      validUntil: grant.valid_until,
      createdAt: grant.created_at,
      updatedAt: grant.updated_at,
    };
  }

  async function grantManualAccess(
    outerDatabase: Executor,
    params: {
      userId: string;
      courseId: string;
      validUntil?: Date | null;
    },
  ): Promise<AccessGrant> {
    // An unreadable date reached the database as an invalid timestamp and
    // came back as a server error.
    if (params.validUntil && Number.isNaN(params.validUntil.getTime())) {
      throw new AppError(
        400,
        "INVALID_VALID_UNTIL",
        "validUntil is not a valid date.",
      );
    }

    return inTransaction(outerDatabase, async (database) => {
      const now = new Date();
      const grant = await grantAccess(database, {
        userId: params.userId,
        courseId: params.courseId,
        source: "admin_grant",
        validFrom: now,
        validUntil: params.validUntil,
      });

      // The enrolment mirrors the grant as it now stands, not the request.
      // The grant keeps what the learner already held (a longer or lifetime
      // period, and the order that paid for it); writing the requested
      // values here instead gave a lifetime buyer an enrolment that expired
      // with a short manual grant, and detached it from its order. The
      // course then left My Courses and could be bought a second time,
      // while a refund of the first order revoked nothing.
      const enrollment = {
        order_id: grant.purchaseId ?? null,
        status: "active" as const,
        source:
          grant.source === "purchase"
            ? ("direct_purchase" as const)
            : grant.source,
        access_starts_at: new Date(grant.validFrom),
        access_expires_at: grant.validUntil ? new Date(grant.validUntil) : null,
        updated_at: now,
      };
      await database
        .insertInto("enrollments")
        .values({
          id: crypto.randomUUID(),
          user_id: params.userId,
          course_id: params.courseId,
          ...enrollment,
          created_at: now,
        })
        .onConflict((oc) => {
          // A grant that stayed with its order leaves the enrolment's own
          // source as it was: "purchase" on the grant covers both a course
          // bought alone and one bought in a bundle, and the enrolment is
          // where that difference is kept.
          const { source, ...withoutSource } = enrollment;
          return oc
            .columns(["user_id", "course_id"])
            .doUpdateSet(
              grant.source === "purchase"
                ? withoutSource
                : { ...withoutSource, source },
            );
        })
        .executeTakeFirst();

      return grant;
    });
  }

  async function revokeAccessGrantById(
    outerDatabase: Executor,
    grantId: string,
  ): Promise<void> {
    await inTransaction(outerDatabase, async (database) => {
      const grant = await database
        .selectFrom("access_grants")
        .selectAll()
        .where("id", "=", grantId)
        .executeTakeFirst();

      // Answered "revoked successfully" for an id that matched nothing.
      if (!grant) {
        throw new AppError(
          404,
          "ACCESS_GRANT_NOT_FOUND",
          "Access grant not found.",
        );
      }

      await accessRepo.updateAccessGrantStatus(database, grantId, "revoked");

      await database
        .updateTable("enrollments")
        .set({
          status: "revoked",
          updated_at: new Date(),
        })
        .where("user_id", "=", grant.user_id)
        .where("course_id", "=", grant.course_id)
        .execute();
    });
  }

  async function listUserGrants(
    database: Executor,
    userId: string,
  ): Promise<AccessGrant[]> {
    const rows = await accessRepo.listUserAccessGrants(database, userId);
    return rows.map((g) => ({
      id: g.id,
      userId: g.user_id,
      courseId: g.course_id,
      purchaseId: g.order_id,
      status: g.status as AccessGrantStatus,
      source: g.source as AccessGrantSource,
      validFrom: g.valid_from,
      validUntil: g.valid_until,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));
  }

  async function hasActiveAccess(
    database: Executor,
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const grant = await accessRepo.findAccessGrant(database, userId, courseId);
    if (!grant) return false;
    if (grant.status !== "active") return false;
    if (grant.valid_until && new Date() > new Date(grant.valid_until))
      return false;
    return true;
  }

  async function listActiveUserIdsForCourse(
    database: Executor,
    courseId: string,
  ): Promise<string[]> {
    const rows = await accessRepo.listActiveUserIdsForCourse(
      database,
      courseId,
    );
    return rows;
  }

  async function revokeAccessForOrder(
    database: Executor,
    orderId: string,
  ): Promise<void> {
    await accessRepo.revokeAccessGrantsByOrderId(database, orderId);
  }

  async function revokeAccessForOrderCourse(
    database: Executor,
    orderId: string,
    courseId: string,
  ): Promise<void> {
    await accessRepo.revokeAccessGrantsForOrderCourse(
      database,
      orderId,
      courseId,
    );
  }

  async function listActiveCourseIdsForOrder(
    database: Executor,
    orderId: string,
  ): Promise<string[]> {
    return await accessRepo.listActiveGrantCourseIdsByOrderId(
      database,
      orderId,
    );
  }

  async function reassignGrantToOrder(
    database: Executor,
    input: {
      fromOrderId: string;
      courseId: string;
      toOrderId: string;
      source: "purchase" | "bundle_purchase";
    },
  ): Promise<void> {
    await accessRepo.reassignAccessGrantOrder(database, input);
  }

  return {
    grantAccess,
    grantManualAccess,
    revokeAccessGrantById,
    listUserGrants,
    hasActiveAccess,
    listActiveUserIdsForCourse,
    revokeAccessForOrder,
    revokeAccessForOrderCourse,
    listActiveCourseIdsForOrder,
    reassignGrantToOrder,
  };
}
