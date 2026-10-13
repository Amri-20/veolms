import type { DatabaseExecutor } from "@veolms/database";
import type { LessonDiscussionSort } from "@veolms/contracts";
import { sql } from "kysely";
import { exactCursorTimestamp } from "../../../../lib/keyset.ts";
import { toDate } from "../shared/discussion.utils.ts";
import { discussionVisibilityPredicate } from "../shared/discussion.visibility.ts";

export const FEED_SOURCE_RANK = {
  note: 1,
  thread: 2,
} as const;

export type FeedSourceType = keyof typeof FEED_SOURCE_RANK;

export interface FeedCandidate {
  entityId: string;
  sourceType: FeedSourceType;
  sourceRank: number;
  createdAt: Date;
  score: number;
}

export interface FeedCandidateOptions {
  academyId: string;
  courseId: string;
  lessonId: string;
  /** Thread kinds to include; none leaves threads out of the feed. */
  threadKinds: readonly ("comment" | "question")[];
  includeNotes: boolean;
  /** Whose private and unlisted posts are visible; nobody's when absent. */
  viewerUserId: string | null | undefined;
  mine: boolean;
  sort: LessonDiscussionSort;
  cursor?: {
    entityId: string;
    sourceRank: number;
    createdAt: Date;
    score: number;
  };
  limit: number;
}

export interface DiscussionsFeedRepository {
  /**
   * One page (plus one row) of a lesson's threads and notes as a single
   * ordered stream of ids; the posts themselves are loaded by their owners.
   */
  listCandidates(
    db: DatabaseExecutor,
    options: FeedCandidateOptions,
  ): Promise<FeedCandidate[]>;
}

export function createDiscussionsFeedRepository(): DiscussionsFeedRepository {
  return {
    async listCandidates(db, options) {
      const sources = [];
      const kinds = options.threadKinds;

      if (kinds.length > 0) {
        const kindPredicate = sql` t.kind in (${sql.join(
          kinds.map((kind) => sql`${kind}`),
          sql`, `,
        )})`;
        sources.push(sql`
      select
        t.id as "entityId",
        'thread'::text as "sourceType",
        ${FEED_SOURCE_RANK.thread}::int as "sourceRank",
        t.created_at as "createdAt",
        (coalesce(t.likes_count, 0) + coalesce(t.replies_count, 0))::int as score
      from learning_threads as t
      where t.academy_id = ${options.academyId}
        and t.course_id = ${options.courseId}
        and t.lesson_id = ${options.lessonId}
        and t.status = 'active'
        and ${kindPredicate}
        and ${discussionVisibilityPredicate(
          "t",
          options.viewerUserId,
          options.mine,
        )}
    `);
      }

      if (options.includeNotes) {
        sources.push(sql`
      select
        n.id as "entityId",
        'note'::text as "sourceType",
        ${FEED_SOURCE_RANK.note}::int as "sourceRank",
        n.created_at as "createdAt",
        coalesce(n.likes_count, 0)::int as score
      from learning_notes as n
      where n.academy_id = ${options.academyId}
        and n.course_id = ${options.courseId}
        and n.lesson_id = ${options.lessonId}
        and ${discussionVisibilityPredicate(
          "n",
          options.viewerUserId,
          options.mine,
        )}
    `);
      }

      if (sources.length === 0) return [];

      const cursor = options.cursor;
      // The cursor row is a thread or a note; read its exact timestamp back.
      const cursorCreatedAt = cursor
        ? exactCursorTimestamp(
            ["learning_threads", "learning_notes"],
            "created_at",
            cursor.entityId,
            cursor.createdAt,
          )
        : undefined;
      const cursorWhere = cursor
        ? options.sort === "top"
          ? sql`where (
          score < ${cursor.score}
          or (
            score = ${cursor.score}
            and "createdAt" < ${cursorCreatedAt}
          )
          or (
            score = ${cursor.score}
            and "createdAt" = ${cursorCreatedAt}
            and "sourceRank" < ${cursor.sourceRank}
          )
          or (
            score = ${cursor.score}
            and "createdAt" = ${cursorCreatedAt}
            and "sourceRank" = ${cursor.sourceRank}
            and "entityId" < ${cursor.entityId}::uuid
          )
        )`
          : sql`where (
          "createdAt" < ${cursorCreatedAt}
          or (
            "createdAt" = ${cursorCreatedAt}
            and "sourceRank" < ${cursor.sourceRank}
          )
          or (
            "createdAt" = ${cursorCreatedAt}
            and "sourceRank" = ${cursor.sourceRank}
            and "entityId" < ${cursor.entityId}::uuid
          )
        )`
        : sql``;

      const orderBy =
        options.sort === "top"
          ? sql`order by score desc, "createdAt" desc, "sourceRank" desc, "entityId" desc`
          : sql`order by "createdAt" desc, "sourceRank" desc, "entityId" desc`;

      const result = await sql<FeedCandidate>`
    select *
    from (${sql.join(sources, sql` union all `)}) as feed
    ${cursorWhere}
    ${orderBy}
    limit ${options.limit + 1}
  `.execute(db);

      return result.rows.map((row) => ({
        ...row,
        createdAt: toDate(row.createdAt),
        sourceRank: Number(row.sourceRank),
        score: Number(row.score),
      }));
    },
  };
}
