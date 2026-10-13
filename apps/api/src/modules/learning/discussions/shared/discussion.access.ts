import type { DatabaseExecutor } from "@veolms/database";
import type { DiscussionVisibility } from "@veolms/contracts";
import { findSettingsByCourseId } from "../../../courses/configuration/configuration.repository.ts";
import {
  createAccessService,
  isOpenFreeCourse,
} from "../../../access/index.ts";
import { ADMIN_ROLE } from "../../../auth/index.ts";
import { httpError } from "../../../../lib/errors.ts";
import { DiscussionErrors } from "./discussion.errors.ts";
import { createDiscussionRepository } from "./discussion.repository.ts";

// "Is this course open to a signed-in learner who holds no grant" is asked
// of `isOpenFreeCourse`, the rule lesson playback, quizzes and the course
// overview use: free and not access-restricted. It used to be written out
// here as "not restricted and not paid", which also opened a published
// course that has no pricing row; the shared rule does not. Both the
// single-course check in `canAccessCourse` and the bulk listing in
// `listAccessibleCourseIds` read the two columns and ask the same function,
// so they cannot drift from each other or from the rest of the API.

export interface DiscussionActor {
  userId: string;
  roles: readonly string[];
}

export interface ThreadAccessTarget {
  userId: string;
  courseId: string;
  visibility: string;
  status?: string;
  isLocked?: boolean;
}

export interface NoteAccessTarget {
  userId: string;
  courseId: string;
  visibility: DiscussionVisibility;
}

export interface DiscussionAccess {
  canAccessCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<boolean>;
  assertCanAccessCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<void>;
  assertCanParticipateInCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<void>;
  assertNotesEnabled(db: DatabaseExecutor, courseId: string): Promise<void>;
  assertThreadKindEnabled(
    db: DatabaseExecutor,
    courseId: string,
    kind: string,
  ): Promise<void>;
  assertCanAccessThread(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    thread: ThreadAccessTarget,
  ): Promise<void>;
  /**
   * The thread-level half of `assertCanAccessThread`, for a caller that has
   * already established the actor's access to the thread's course and knows
   * whether the actor moderates it. Reads nothing.
   */
  assertThreadVisibleToMember(
    actor: DiscussionActor,
    thread: ThreadAccessTarget,
    canModerate: boolean,
  ): void;
  assertCanAccessNote(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    note: NoteAccessTarget,
    maskedNotFoundError?: unknown,
  ): Promise<void>;
  assertThreadIsActive(thread: ThreadAccessTarget): void;
  assertReplyIsActive(reply: { status?: string }): void;
  assertThreadNotLocked(thread: ThreadAccessTarget): void;
  assertNotSuspended(
    db: DatabaseExecutor,
    userId: string,
    courseId: string,
    kind: string,
  ): Promise<void>;
  listAccessibleCourseIds(
    db: DatabaseExecutor,
    actor: DiscussionActor,
  ): Promise<readonly string[] | "all">;
  /**
   * Courses whose discussions the actor may see as staff (everyone's
   * threads, moderation reports): every course for an admin, otherwise only
   * the courses the actor created.
   */
  listModeratableCourseIds(
    db: DatabaseExecutor,
    actor: DiscussionActor,
  ): Promise<readonly string[] | "all">;
  canModerateCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<boolean>;
  assertCanModerateCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<void>;
  assertCanModeratePlatform(actor: DiscussionActor): void;
}

export function createDiscussionAccess(): DiscussionAccess {
  const access = createAccessService();
  const discussionRepo = createDiscussionRepository();

  function isAdmin(actor: DiscussionActor): boolean {
    return actor.roles.includes(ADMIN_ROLE);
  }

  async function isCourseCreator(
    db: DatabaseExecutor,
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const course = await discussionRepo.findCourseCreatorId(db, courseId);
    return course?.creator_id === userId;
  }

  async function canAccessCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<boolean> {
    if (isAdmin(actor)) return true;

    // One read answers both "is the actor the creator" and "is the course
    // open". The creator keeps access to a deleted course; nobody else does.
    const course = await discussionRepo.findCourseAccessState(db, courseId);

    if (!course) return false;
    if (course.creator_id === actor.userId) return true;
    if (course.deleted_at !== null) return false;

    if (course.status === "published" && isOpenFreeCourse(course)) {
      return true;
    }

    return access.hasActiveAccess(db, actor.userId, courseId);
  }

  async function canModerateCourse(
    db: DatabaseExecutor,
    actor: DiscussionActor,
    courseId: string,
  ): Promise<boolean> {
    if (isAdmin(actor)) return true;
    return isCourseCreator(db, actor.userId, courseId);
  }

  function scopesForKind(kind: string): Array<"commenting" | "qa" | "all"> {
    const normalized = kind === "qna" ? "question" : kind;
    if (normalized === "question") return ["qa", "all"];
    return ["commenting", "all"];
  }

  return {
    canAccessCourse,

    async assertCanAccessCourse(db, actor, courseId) {
      const allowed = await canAccessCourse(db, actor, courseId);
      if (!allowed) {
        throw DiscussionErrors.courseAccessDenied();
      }
    },

    async assertCanParticipateInCourse(db, actor, courseId) {
      if (isAdmin(actor)) return;
      if (await isCourseCreator(db, actor.userId, courseId)) return;
      if (await access.hasActiveAccess(db, actor.userId, courseId)) return;
      throw DiscussionErrors.courseAccessDenied();
    },

    async assertNotesEnabled(db, courseId) {
      const settings = await findSettingsByCourseId(db, courseId);
      if (settings && settings.allow_notes === false) {
        throw DiscussionErrors.notesDisabled();
      }
    },

    async assertThreadKindEnabled(db, courseId, kind) {
      const normalized = kind === "qna" ? "question" : kind;
      if (normalized === "question") {
        const settings = await findSettingsByCourseId(db, courseId);
        if (settings && settings.allow_qa === false) {
          throw DiscussionErrors.qaDisabled();
        }
      } else if (normalized === "comment") {
        const settings = await findSettingsByCourseId(db, courseId);
        if (settings && settings.allow_comments === false) {
          throw DiscussionErrors.commentsDisabled();
        }
      } else if (normalized === "note") {
        const settings = await findSettingsByCourseId(db, courseId);
        if (settings && settings.allow_notes === false) {
          throw DiscussionErrors.notesDisabled();
        }
      }
    },

    assertThreadVisibleToMember(actor, thread, canModerate) {
      if (thread.visibility === "private" && thread.userId !== actor.userId) {
        throw DiscussionErrors.notFound("Discussion thread");
      }
      if (
        (thread.status === "hidden" || thread.status === "deleted") &&
        !canModerate
      ) {
        throw DiscussionErrors.notFound("Discussion thread");
      }
    },

    async assertCanAccessThread(db, actor, thread) {
      const allowed = await canAccessCourse(db, actor, thread.courseId);
      if (!allowed) {
        throw DiscussionErrors.notFound("Discussion thread");
      }

      const isOwner = thread.userId === actor.userId;
      if (thread.visibility === "private" && !isOwner) {
        throw DiscussionErrors.notFound("Discussion thread");
      }

      if (thread.status === "hidden" || thread.status === "deleted") {
        const staff = await canModerateCourse(db, actor, thread.courseId);
        if (!staff) {
          throw DiscussionErrors.notFound("Discussion thread");
        }
      }
    },

    async assertCanAccessNote(db, actor, note, maskedNotFoundError) {
      const isOwner = note.userId === actor.userId;
      if (isOwner) {
        return;
      }

      if (note.visibility === "private") {
        throw maskedNotFoundError ?? DiscussionErrors.noteNotFound();
      }

      const allowed = await canAccessCourse(db, actor, note.courseId);
      if (!allowed) {
        throw DiscussionErrors.courseAccessDenied();
      }
    },

    assertThreadIsActive(thread) {
      if (thread.status && thread.status !== "active") {
        throw DiscussionErrors.notFound("Discussion thread");
      }
    },

    assertReplyIsActive(reply) {
      if (reply.status && reply.status !== "active") {
        throw DiscussionErrors.notFound("Reply");
      }
    },

    assertThreadNotLocked(thread) {
      if (thread.isLocked) {
        throw DiscussionErrors.threadLocked();
      }
    },

    async assertNotSuspended(db, userId, courseId, kind) {
      const activeSuspension = await discussionRepo.findActiveSuspension(db, {
        userId,
        courseId,
        scopes: scopesForKind(kind),
      });

      if (activeSuspension) {
        throw DiscussionErrors.suspended(
          activeSuspension.reason,
          activeSuspension.scope,
        );
      }
    },

    async listAccessibleCourseIds(db, actor) {
      if (isAdmin(actor)) return "all";

      // Three independent reads: one parallel round trip instead of three
      // serial ones on every notes, threads, workspace and bookmarks listing.
      const [grants, created, publishedCourses] = await Promise.all([
        access.listUserGrants(db, actor.userId),
        discussionRepo.listCreatedCourseIds(db, actor.userId),
        discussionRepo.listPublishedCourseOpenness(db),
      ]);

      const now = new Date();
      const ids = new Set<string>();
      for (const grant of grants) {
        if (grant.status !== "active") continue;
        if (grant.validUntil && now > new Date(grant.validUntil)) continue;
        ids.add(grant.courseId);
      }
      for (const course of created) ids.add(course.id);
      for (const course of publishedCourses) {
        if (isOpenFreeCourse(course)) ids.add(course.id);
      }

      return [...ids];
    },

    async listModeratableCourseIds(db, actor) {
      if (isAdmin(actor)) return "all";
      const rows = await discussionRepo.listActiveCreatedCourseIds(
        db,
        actor.userId,
      );
      return rows.map((row) => row.id);
    },

    async canModerateCourse(db, actor, courseId) {
      return canModerateCourse(db, actor, courseId);
    },

    async assertCanModerateCourse(db, actor, courseId) {
      const course = await discussionRepo.findCourseCreatorId(db, courseId);
      if (!course) {
        throw httpError(404, "COURSE_NOT_FOUND", "Course not found");
      }
      if (!isAdmin(actor) && course.creator_id !== actor.userId) {
        throw httpError(
          403,
          "FORBIDDEN",
          "You do not have permission to moderate this course.",
        );
      }
    },

    assertCanModeratePlatform(actor) {
      if (!isAdmin(actor)) {
        throw httpError(
          403,
          "FORBIDDEN",
          "Administrator access is required for platform moderation.",
        );
      }
    },
  };
}

export function discussionActor(user: {
  id: string;
  roles: readonly string[];
}): DiscussionActor {
  return { userId: user.id, roles: user.roles };
}

export async function assertCanAccessNote(
  db: DatabaseExecutor,
  actor: DiscussionActor,
  note: NoteAccessTarget,
  maskedNotFoundError?: unknown,
): Promise<void> {
  const access = createDiscussionAccess();
  return access.assertCanAccessNote(db, actor, note, maskedNotFoundError);
}
