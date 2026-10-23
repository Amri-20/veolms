import { onSiteContentChange, type SiteContentChange } from "@veolms/api-core";
import type {
  CourseOverviewResponse,
  CoursePublicCurriculum,
} from "@veolms/contracts";

/**
 * Process-local cache of a course as every visitor sees it: the overview a
 * signed-out visitor gets, and the public curriculum (that overview without
 * the price, with its version). Both are the same for whoever asks, and
 * building them costs about a dozen queries in three serial round trips
 * plus a hash of the whole curriculum. The course pages, the signed-out
 * overview and every `/courses/:id/access` answer (for `curriculumVersion`)
 * read it.
 *
 * Shared by every course service in the process: `createCourseService` is
 * called by many modules, and a cache per service would be cold in most of
 * them and could not be cleared from one place.
 *
 * Coherence:
 * - Entries live for COURSE_CACHE_TTL_MS (default 30 s).
 * - Every successful API write that changes a course clears that course,
 *   and every site-wide change (categories, a finished transcode, an
 *   instructor's name) clears everything, in this process, from the
 *   `onSiteContentChange` hook (see `applySiteContentChange`). The
 *   requests that count are the ones `detectSiteContentChange` names.
 * - Other instances, the CLI and background jobs are seen when the entry
 *   expires: bounded by the TTL. Set the TTL to 0 to disable caching.
 * - A load still in flight when its course is cleared is not kept: it may
 *   have read the course before the change.
 * - Failed loads (an unknown or unpublished course) are not kept, so made-up
 *   slugs cannot fill the cache.
 *
 * Cached answers are shared between requests: callers must not mutate them.
 */
export interface PublicCourseContent {
  courseId: string;
  /** The overview as a signed-out visitor gets it. */
  overview: CourseOverviewResponse;
  curriculum: CoursePublicCurriculum;
}

const MAX_ENTRIES = 500;

interface CacheEntry {
  expiresAtMs: number;
  /** Known up front for a uuid key, otherwise once the load has finished. */
  courseId: string | null;
  content: Promise<PublicCourseContent>;
}

/** Keyed by the course id or slug the caller asked by. */
const entries = new Map<string, CacheEntry>();

/**
 * The course by `courseIdOrSlug`, from the cache when it is fresh, otherwise
 * from `load`. Concurrent misses for the same key share one load.
 */
export async function getCachedPublicCourseContent(
  courseIdOrSlug: string,
  ttlMs: number,
  load: () => Promise<PublicCourseContent>,
  /** Whether the key is a course id (rather than a slug). */
  keyIsCourseId: boolean,
): Promise<PublicCourseContent> {
  if (ttlMs <= 0) return await load();

  const now = Date.now();
  const cached = entries.get(courseIdOrSlug);
  if (cached && cached.expiresAtMs > now) return await cached.content;
  if (cached) entries.delete(courseIdOrSlug);

  if (entries.size >= MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order).
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }

  const entry: CacheEntry = {
    expiresAtMs: now + ttlMs,
    courseId: keyIsCourseId ? courseIdOrSlug.toLowerCase() : null,
    content: load(),
  };
  entries.set(courseIdOrSlug, entry);
  entry.content.then(
    (content) => {
      entry.courseId = content.courseId.toLowerCase();
    },
    () => {
      if (entries.get(courseIdOrSlug) === entry) {
        entries.delete(courseIdOrSlug);
      }
    },
  );
  return await entry.content;
}

/**
 * Clear one course, by its id and every slug it was asked by, and any load
 * whose course is not known yet.
 */
export function evictCachedCourseContent(courseId: string): void {
  const id = courseId.toLowerCase();
  for (const [key, entry] of entries) {
    if (entry.courseId === null || entry.courseId === id) entries.delete(key);
  }
}

/** Clear everything — a change that every course page draws from. */
export function clearCourseContentCache(): void {
  entries.clear();
}

/** What a finished request changed, applied to the cache. */
export function applySiteContentChange(change: SiteContentChange): void {
  if (change.scope === "course") evictCachedCourseContent(change.courseId);
  else clearCourseContentCache();
}

// The cache is cleared by whichever API app this process runs (core's or
// the cloud's): both are built by api-core's factory, which reports every
// change before the response is sent.
onSiteContentChange(applySiteContentChange);
