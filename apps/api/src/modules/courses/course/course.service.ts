import crypto from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Kysely } from "kysely";
import type { Database } from "@veolms/database";
import type {
  CreateCourseRequest,
  UpdateCourseBasicsRequest,
  CourseBasicsResponse,
  CourseCreatedResponse,
  CourseListQuery,
  CourseListResponse,
  CourseOverviewResponse,
  CourseSummary,
  LessonDescriptionResponse,
  CoursePricingSummary,
  ManagedCourseSummary,
} from "@veolms/contracts";
import { config } from "../../../config.ts";
import { AppError } from "../../../lib/errors.ts";
import type { AppServices } from "../../../services/index.ts";
import {
  slugify,
  assertOptimisticUpdate,
  canManageCourse,
  getCourseAndVerifyOwner as verifyCourseOwner,
} from "../shared/courses.utils.ts";
import {
  ADMIN_ROLE,
  createAuthService,
  type AuthService,
} from "../../auth/index.ts";
import * as courseRepo from "./course.repository.ts";
import {
  createCategoryService,
  type CategoryService,
} from "../category/category.service.ts";
import {
  createCurriculumService,
  type CurriculumService,
} from "../curriculum/curriculum.service.ts";
import {
  createConfigurationService,
  type ConfigurationService,
} from "../configuration/configuration.service.ts";
import {
  createIncludesService,
  type IncludesService,
} from "../includes/includes.service.ts";
import {
  createAccessService,
  isOpenFreeCourse,
  isRestrictedFreeCourse,
} from "../../access/index.ts";
import { resolveCoursePricing } from "../../commerce/index.ts";
import { createMediaService, type MediaService } from "../../media/index.ts";
import { resolveAliasedBasicsUpdate } from "./basics-aliased-field.ts";
import { resolveBasicsCategoryUpdate } from "./basics-category.ts";
import { resolveDetailsLevelUpdate } from "./details-level.ts";
import {
  isLessonListedInOverview,
  resolveOverviewVisibility,
  type OverviewViewer,
} from "./overview-visibility.ts";
import {
  getLessonDurationSeconds,
  presentAccessRule,
  presentCourse,
  presentCurriculum,
  presentPricing,
  presentSettings,
  type CourseThumbnailUrls,
} from "../shared/courses.presenters.ts";

const accessService = createAccessService();

/**
 * Resource rows for a viewer who may not download them. Each keeps its place
 * in its lesson and loses its name: a resource's title starts out as the
 * name of the uploaded file, so the title says as much as the file name.
 */
function redactLockedResources<
  Resource extends { lesson_id: string; title: string },
>(resources: readonly Resource[]): Resource[] {
  const countByLesson = new Map<string, number>();
  return resources.map((resource) => {
    const position = (countByLesson.get(resource.lesson_id) ?? 0) + 1;
    countByLesson.set(resource.lesson_id, position);
    return { ...resource, title: `Resource ${position}` };
  });
}

const ALLOWED_THUMBNAIL_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type PublishedCourseSummaryRow = Awaited<
  ReturnType<typeof courseRepo.listPublishedCourses>
>[number];
type PublicCourseSummaryRow = Omit<
  PublishedCourseSummaryRow,
  "created_at" | "created_at_cursor"
>;

function decodePublishedCourseCursor(cursor: string, sort: "latest" | "title") {
  const separator = cursor.lastIndexOf("~");
  if (separator <= 0) {
    throw new AppError(400, "INVALID_COURSE_CURSOR", "Invalid course cursor.");
  }

  let value: string;
  try {
    value = decodeURIComponent(cursor.slice(0, separator));
  } catch {
    throw new AppError(400, "INVALID_COURSE_CURSOR", "Invalid course cursor.");
  }
  const id = cursor.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/iu.test(id)) {
    throw new AppError(400, "INVALID_COURSE_CURSOR", "Invalid course cursor.");
  }
  if (sort === "latest" && !Number.isFinite(Date.parse(value))) {
    throw new AppError(400, "INVALID_COURSE_CURSOR", "Invalid course cursor.");
  }

  return { value, id };
}

function encodePublishedCourseCursor(
  row: { created_at_cursor: string; id: string; title: string },
  sort: "latest" | "title",
) {
  const value = sort === "title" ? row.title : row.created_at_cursor;
  return `${encodeURIComponent(value)}~${row.id}`;
}

type PublicThumbnailVariant = CourseThumbnailUrls["thumbnailSrcSet"][number];

const NO_THUMBNAIL: CourseThumbnailUrls = {
  thumbnailUrl: null,
  thumbnailSrcSet: [],
};

/** `srcset` entries as the learner-facing schemas carry them. */
function toSrcSet(variants: readonly PublicThumbnailVariant[]) {
  return variants.map(({ url, width }) => ({ url, width }));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * A course's length is the sum of its lesson media; one with no timed media
 * falls back to the instructor's estimate (stored in minutes).
 */
function resolveTotalDurationSeconds(
  lessonDurationSeconds: number,
  estimatedDurationMinutes: number | null | undefined,
): number {
  if (lessonDurationSeconds > 0) return lessonDurationSeconds;
  return estimatedDurationMinutes && estimatedDurationMinutes > 0
    ? estimatedDurationMinutes * 60
    : 0;
}

const FALLBACK_THUMBNAIL_WIDTHS = [160, 240, 320, 480, 640, 960, 1280] as const;

function resolveFallbackThumbnailVariants(
  services: AppServices,
  thumbnailMediaId?: string | null,
  thumbnailStorageKey?: string | null,
): PublicThumbnailVariant[] {
  if (!thumbnailMediaId) return [];

  const thumbnailPrefix = resolveThumbnailPrefix(
    thumbnailMediaId,
    thumbnailStorageKey,
  );

  return FALLBACK_THUMBNAIL_WIDTHS.flatMap((width) => {
    const url = services.storage.getPublicObjectUrl(
      `${thumbnailPrefix}/${width}.webp`,
    );
    return url ? [{ url, width, height: Math.round((width * 9) / 16) }] : [];
  });
}

function resolveThumbnailPrefix(
  thumbnailMediaId: string,
  thumbnailStorageKey?: string | null,
): string {
  const normalizedKey = thumbnailStorageKey?.replace(/^\/+/, "") ?? "";
  const visibilityPrefix = normalizedKey.startsWith("protected/")
    ? "protected/"
    : "public/";
  return `${visibilityPrefix}thumbnails/${thumbnailMediaId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPersistedThumbnailKey(
  metadata: unknown,
  variant: "full" | number,
): string | null {
  if (!isRecord(metadata)) return null;

  if (variant === "full") {
    const full = metadata.full;
    if (!isRecord(full) || typeof full.key !== "string") return null;
    return full.key.trim() || null;
  }

  if (!Array.isArray(metadata.variants)) return null;
  const matchingVariant = metadata.variants.find(
    (item) => isRecord(item) && item.width === variant,
  );
  if (!isRecord(matchingVariant) || typeof matchingVariant.key !== "string") {
    return null;
  }
  return matchingVariant.key.trim() || null;
}

function resolvePublicThumbnailUrls(
  services: AppServices,
  metadata: unknown,
  thumbnailMediaId?: string | null,
  thumbnailStorageKey?: string | null,
): {
  thumbnailUrl: string | null;
  thumbnailSrcSet: PublicThumbnailVariant[];
} {
  const thumbnailPrefix = thumbnailMediaId
    ? resolveThumbnailPrefix(thumbnailMediaId, thumbnailStorageKey)
    : null;
  const fallbackUrl = thumbnailMediaId
    ? services.storage.getPublicObjectUrl(`${thumbnailPrefix}/full.webp`)
    : null;
  const persistedFullKey = getPersistedThumbnailKey(metadata, "full");
  const thumbnailUrl = persistedFullKey
    ? (services.storage.getPublicObjectUrl(persistedFullKey) ?? fallbackUrl)
    : fallbackUrl;
  const fallbackVariants = resolveFallbackThumbnailVariants(
    services,
    thumbnailMediaId,
    thumbnailStorageKey,
  );

  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return { thumbnailUrl, thumbnailSrcSet: fallbackVariants };
  }

  const record = metadata as Record<string, unknown>;
  const variants = Array.isArray(record.variants)
    ? record.variants.flatMap((variant): PublicThumbnailVariant[] => {
        if (
          typeof variant !== "object" ||
          variant === null ||
          Array.isArray(variant)
        ) {
          return [];
        }
        const item = variant as Record<string, unknown>;
        // Sizes go out through schemas that require positive integers; a
        // malformed variant is skipped rather than failing the whole list.
        if (!isPositiveInteger(item.width) || !isPositiveInteger(item.height)) {
          return [];
        }
        const persistedKey = getPersistedThumbnailKey(metadata, item.width);
        const derivedKey = thumbnailPrefix
          ? `${thumbnailPrefix}/${item.width}.webp`
          : null;
        const key = persistedKey ?? derivedKey;
        const url = key ? services.storage.getPublicObjectUrl(key) : null;
        return url ? [{ url, width: item.width, height: item.height }] : [];
      })
    : [];

  return {
    thumbnailUrl,
    thumbnailSrcSet: variants.length > 0 ? variants : fallbackVariants,
  };
}
import {
  createCourseDeletionService,
  type CourseDeletionService,
} from "../lifecycle/course-deletion.service.ts";

export interface CourseServiceOptions {
  database: Kysely<Database>;
  services: AppServices;
  authService?: AuthService;
  categoryService?: CategoryService;
  curriculumService?: CurriculumService;
  configurationService?: ConfigurationService;
  includesService?: IncludesService;
  mediaService?: MediaService;
  deletionService?: CourseDeletionService;
  /** See `COURSE_OVERVIEW_LESSON_DESCRIPTIONS`. */
  overviewLessonDescriptions?: boolean;
}

export function createCourseService({
  database,
  services,
  authService = createAuthService({ database }),
  categoryService = createCategoryService({ database }),
  curriculumService = createCurriculumService({ database, services }),
  configurationService = createConfigurationService({ database }),
  includesService = createIncludesService({ database }),
  mediaService = createMediaService({ database, services }),
  deletionService = createCourseDeletionService({
    database,
    storage: services.storage,
  }),
  overviewLessonDescriptions = config.COURSE_OVERVIEW_LESSON_DESCRIPTIONS,
}: CourseServiceOptions) {
  async function toPublicCourseSummary(row: PublicCourseSummaryRow) {
    const totalDurationSeconds = resolveTotalDurationSeconds(
      Number(row.lesson_duration_seconds ?? 0),
      row.estimated_duration,
    );

    const pricing: CoursePricingSummary = row.pricing_type
      ? {
          pricingType: row.pricing_type as "free" | "paid",
          price: Number(row.price ?? 0),
          currency: row.currency ?? "INR",
          salePrice:
            row.sale_price !== null && row.sale_price !== undefined
              ? Number(row.sale_price)
              : null,
          showDiscountBadge: row.show_discount_badge === true,
        }
      : {
          pricingType: "free",
          price: 0,
          currency: "INR",
          salePrice: null,
          showDiscountBadge: false,
        };

    const { thumbnailUrl, thumbnailSrcSet } = resolvePublicThumbnailUrls(
      services,
      row.thumbnail_metadata,
      row.thumbnail_media_id,
      row.thumbnail_storage_key,
    );

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.short_description ?? "",
      thumbnailUrl,
      thumbnailSrcSet: toSrcSet(thumbnailSrcSet),
      totalSections: Number(row.total_sections ?? 0),
      totalLessons: Number(row.total_lessons ?? 0),
      totalDurationSeconds,
      pricing,
      certificateEnabled: Boolean(row.certificate_enabled ?? false),
      // The same rule, on the same stored values, as the course overview's
      // `canSelfEnroll`, so a card and the page it opens agree. Whether the
      // course is free is read as checkout reads it: a priced course that
      // sells for nothing is a free one.
      canSelfEnroll: !isRestrictedFreeCourse({
        pricing_type: resolveCoursePricing(
          row.pricing_type
            ? {
                pricing_type: row.pricing_type,
                price: pricing.price,
                sale_price: pricing.salePrice,
              }
            : null,
        ).pricingType,
        access_type: row.access_type,
      }),
    } satisfies CourseSummary;
  }

  /**
   * Verifies course existence and owner permissions.
   */
  /** Refuses a category id that names no category. */
  async function assertCategoryExists(
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (!categoryId) return;
    if (await categoryService.findCategoryById(categoryId)) return;
    throw new AppError(
      400,
      "INVALID_CATEGORY",
      "Selected category does not exist.",
    );
  }

  function getCourseAndVerifyOwner(
    courseId: string,
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    return verifyCourseOwner(database, courseId, creatorId, userRoles);
  }

  /**
   * Thumbnail URLs for a media row the caller has already loaded. A
   * thumbnail under a public CDN prefix needs no further query; one stored
   * under a protected prefix is served through a signed delivery URL.
   */
  async function resolveThumbnailFromMedia(
    media: { id: string; metadata: unknown; storage_key: string },
    requestingUserId?: string,
    userRoles?: readonly string[],
  ): Promise<CourseThumbnailUrls> {
    const publicUrls = resolvePublicThumbnailUrls(
      services,
      media.metadata,
      media.id,
      media.storage_key,
    );
    if (
      publicUrls.thumbnailUrl &&
      services.storage.isCdnPublicKey(media.storage_key)
    ) {
      return publicUrls;
    }

    try {
      const directUrl = await mediaService.getMediaDelivery(
        media.id,
        requestingUserId,
        userRoles,
      );
      return { thumbnailUrl: directUrl.url, thumbnailSrcSet: [] };
    } catch (error) {
      // Keep an orphaned media reference from breaking an otherwise valid
      // course response. Access and CDN configuration failures still
      // propagate so the caller never silently receives a proxy URL.
      if (error instanceof AppError && error.statusCode === 404) {
        return NO_THUMBNAIL;
      }
      throw error;
    }
  }

  async function resolveCourseThumbnailUrls(
    thumbnailMediaId: string | null | undefined,
    requestingUserId?: string,
    userRoles?: readonly string[],
  ): Promise<CourseThumbnailUrls> {
    if (!thumbnailMediaId) return NO_THUMBNAIL;

    const media = await mediaService.getMediaAsset(
      thumbnailMediaId,
      requestingUserId,
      userRoles,
    );
    if (!media) return NO_THUMBNAIL;

    return await resolveThumbnailFromMedia(media, requestingUserId, userRoles);
  }

  /**
   * One read for every media row a curriculum shows: lesson videos (for
   * their duration) and resource files (for their name, type and size).
   */
  async function loadCurriculumMedia(
    lessons: readonly { content_media_id: string | null }[],
    resources: readonly { media_asset_id: string }[],
    ownerId?: string,
    userRoles?: readonly string[],
  ) {
    const mediaIds = new Set<string>();
    for (const lesson of lessons) {
      if (lesson.content_media_id) mediaIds.add(lesson.content_media_id);
    }
    for (const resource of resources) mediaIds.add(resource.media_asset_id);

    const assets = await mediaService.getMediaAssets(
      Array.from(mediaIds),
      ownerId,
      userRoles,
    );
    return new Map(assets.map((media) => [media.id, media]));
  }

  /**
   * Lists published courses with optional filtering.
   */
  async function listPublishedCourses(
    filters?: CourseListQuery,
  ): Promise<CourseListResponse> {
    const sort = filters?.sort ?? "latest";
    const cursor = filters?.cursor
      ? decodePublishedCourseCursor(filters.cursor, sort)
      : undefined;
    // The contract leaves `limit` optional; an omitted limit used to return
    // the ENTIRE catalog (plus per-row correlated subqueries) on a public,
    // unauthenticated endpoint. Default to the contract's maximum instead —
    // callers that want more pages follow nextCursor.
    const pageLimit = filters?.limit ?? 60;
    const rows = await courseRepo.listPublishedCourses(database, {
      creatorId: filters?.creatorId,
      limit: pageLimit,
      cursor,
      search: filters?.search,
      sort,
    });
    const hasNextPage = rows.length > pageLimit;
    const pageRows = hasNextPage ? rows.slice(0, pageLimit) : rows;
    const courses = await Promise.all(pageRows.map(toPublicCourseSummary));
    const lastRow = pageRows.at(-1);
    return {
      courses,
      ...(hasNextPage && lastRow
        ? { nextCursor: encodePublishedCourseCursor(lastRow, sort) }
        : {}),
    };
  }

  async function listPublishedCourseOptions() {
    return {
      courses: await courseRepo.listPublishedCourseOptions(database),
    };
  }

  async function getHomeDiscovery() {
    const limit = 8;
    const [popularRows, freeRows, recentRows] = await Promise.all([
      courseRepo.listHomeDiscoveryCourses(database, {
        limit,
        order: "popular",
      }),
      courseRepo.listHomeDiscoveryCourses(database, {
        limit,
        order: "popular",
        freeOnly: true,
      }),
      courseRepo.listHomeDiscoveryCourses(database, {
        limit,
        order: "recent",
      }),
    ]);

    const [popularCourses, freeCourses, recentCourses] = await Promise.all([
      Promise.all(popularRows.map(toPublicCourseSummary)),
      Promise.all(freeRows.map(toPublicCourseSummary)),
      Promise.all(recentRows.map(toPublicCourseSummary)),
    ]);

    return { popularCourses, freeCourses, recentCourses };
  }

  /**
   * Published courses as public summaries, for callers that curate their own
   * selection (the configurable home page). `courseIds` returns exactly those
   * courses, in the given order, skipping any that are no longer published.
   */
  async function listPublicCourseSummaries(options: {
    limit: number;
    order: "popular" | "recent";
    freeOnly?: boolean;
    courseIds?: readonly string[];
  }) {
    const rows = await courseRepo.listHomeDiscoveryCourses(database, options);
    const summaries = await Promise.all(rows.map(toPublicCourseSummary));
    if (!options.courseIds) return summaries;

    const position = new Map(options.courseIds.map((id, index) => [id, index]));
    return summaries.sort(
      (left, right) =>
        (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0),
    );
  }

  /**
   * Retrieves a published course by its URL-safe slug.
   */
  async function getPublishedCourseBySlug(slug: string) {
    return await courseRepo.findPublishedCourseBySlug(database, slug);
  }

  /**
   * Lists published courses authored by a specific creator.
   */
  async function listAvailableCoursesByCreator(creatorId: string) {
    const rows = await courseRepo.listAvailableCoursesByCreator(
      database,
      creatorId,
    );
    return {
      courses: await Promise.all(
        rows.map(async (row) =>
          presentCourse(row, {
            thumbnail: await resolveCourseThumbnailUrls(
              row.thumbnail_media_id,
              creatorId,
            ),
          }),
        ),
      ),
    };
  }

  /**
   * Creates a draft course with optional basic fields.
   */
  async function createCourse(
    payload: string | CreateCourseRequest,
    creatorId: string,
  ) {
    const data: CreateCourseRequest =
      typeof payload === "string" ? { title: payload } : payload;
    const title = data.title;
    // slugify keeps only Latin letters and digits, so a title written entirely
    // in another script (Hindi, Chinese, emoji) slugified to "" — and an
    // empty slug fails the catalogue's response schema for every visitor.
    const baseSlug =
      slugify(title) || `course-${crypto.randomBytes(4).toString("hex")}`;
    let slug = baseSlug;
    let attempts = 0;

    // Check slug collision and append salt if needed
    while (await courseRepo.findCourseBySlugIncludingDeleted(database, slug)) {
      attempts++;
      slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
      if (attempts > 5) {
        slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
        break;
      }
    }

    const courseId = crypto.randomUUID();
    const now = new Date();
    const shortDescription = data.shortDescription ?? null;
    const description = data.description ?? null;
    const categoryId = data.categoryId ?? null;
    // The same refusal an edit gives. Without it an unknown id reached the
    // foreign key and came back as a generic error.
    await assertCategoryExists(categoryId);
    const difficulty = (data.difficulty ?? data.difficultyLevel ?? null) as
      "beginner" | "intermediate" | "advanced" | null;
    const thumbnailMediaId = data.thumbnailMediaId ?? null;
    const trailerMediaId = data.trailerMediaId ?? null;
    const instructorAlias = data.instructorAlias ?? null;

    if (thumbnailMediaId) {
      const thumb = await mediaService.getMediaAsset(
        thumbnailMediaId,
        creatorId,
      );
      if (
        !thumb ||
        thumb.type !== "image" ||
        !ALLOWED_THUMBNAIL_MIME_TYPES.has(thumb.mime_type)
      ) {
        throw new AppError(
          400,
          "INVALID_THUMBNAIL",
          "Thumbnail must be a valid image asset.",
        );
      }
    }

    if (trailerMediaId) {
      const trailer = await mediaService.getMediaAsset(
        trailerMediaId,
        creatorId,
      );
      if (!trailer || trailer.type !== "video") {
        throw new AppError(
          400,
          "INVALID_TRAILER",
          "Trailer must be a valid video asset.",
        );
      }
    }

    await courseRepo.insertCourse(database, {
      id: courseId,
      slug,
      title,
      short_description: shortDescription,
      description,
      creator_id: creatorId,
      category_id: categoryId,
      difficulty,
      thumbnail_media_id: thumbnailMediaId,
      trailer_media_id: trailerMediaId,
      instructor_alias: instructorAlias,
      status: "draft",
      version: 1,
      created_at: now,
      updated_at: now,
    });

    return {
      id: courseId,
      slug,
      title,
      instructorAlias,
      version: 1,
    } satisfies CourseCreatedResponse;
  }

  /**
   * Lists all courses for the authoring/management view.
   */
  async function listMyCourses(
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    // Admins manage every course; everyone else (instructors included) sees
    // only the courses they created.
    const isAdmin = userRoles?.includes(ADMIN_ROLE) ?? false;
    const rows = await courseRepo.listManagedCourses(
      database,
      isAdmin ? undefined : creatorId,
    );
    const courses = await Promise.all(
      rows.map(async (c) => {
        // The thumbnail's media row came with the course, so the usual case
        // costs no query. Only an administrator, or the user the course's
        // media belongs to, is shown it — the same rule as a media lookup.
        const mediaOwnerId = c.creator_id ?? creatorId;
        const thumbnail =
          c.thumbnail_media_id &&
          c.thumbnail_storage_key !== null &&
          (isAdmin || c.thumbnail_owner_id === mediaOwnerId)
            ? await resolveThumbnailFromMedia(
                {
                  id: c.thumbnail_media_id,
                  metadata: c.thumbnail_metadata,
                  storage_key: c.thumbnail_storage_key,
                },
                mediaOwnerId,
                userRoles,
              )
            : NO_THUMBNAIL;

        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          shortDescription: c.short_description,
          difficulty: c.difficulty,
          status: c.status,
          creatorId: c.creator_id,
          thumbnailMediaId: c.thumbnail_media_id,
          thumbnailUrl: thumbnail.thumbnailUrl,
          thumbnailSrcSet: thumbnail.thumbnailSrcSet,
          createdAt: c.created_at.toISOString(),
          updatedAt: c.updated_at.toISOString(),
          totalSections: Number(c.total_sections ?? 0),
          totalLessons: Number(c.total_lessons ?? 0),
          totalDurationSeconds: resolveTotalDurationSeconds(
            Number(c.lesson_duration_seconds ?? 0),
            c.estimated_duration,
          ),
        } satisfies ManagedCourseSummary;
      }),
    );
    return { courses };
  }

  /** Ids of every non-deleted course the user created. */
  async function listOwnedCourseIds(creatorId: string): Promise<string[]> {
    return await courseRepo.listCourseIdsByCreator(database, creatorId);
  }

  /**
   * Lists only the course identity and status needed by analytics scope
   * resolution, using the same visibility split as the course-management
   * list. This intentionally avoids course media and metadata hydration.
   */
  async function listMyCourseScope(
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    const rows = userRoles?.includes(ADMIN_ROLE)
      ? await courseRepo.listAllCourseScope(database)
      : await courseRepo.listAvailableCourseScopeByCreator(database, creatorId);

    return {
      courses: rows.map((course) => ({
        id: course.id,
        status: course.status,
      })),
    };
  }

  /**
   * Lightweight course summaries for analytics scope resolution.
   *
   * The analytics endpoints only need id/title/status/dates, but previously
   * resolved their scope through listMyCourses /
   * listAvailableCoursesByCreator, which run the full media-URL hydration —
   * up to ~5 extra queries PER COURSE (thumbnail + trailer delivery lookups)
   * for URLs the analytics response never uses. This stays a single query.
   */
  async function listMyCourseSummaries(
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    const rows = userRoles?.includes(ADMIN_ROLE)
      ? await courseRepo.listAllCourseScope(database)
      : await courseRepo.listAvailableCourseScopeByCreator(database, creatorId);

    return {
      courses: rows.map((course) => ({
        id: course.id,
        title: course.title,
        status: course.status as "draft" | "published" | "archived",
        createdAt: course.created_at.toISOString(),
        publishedAt: course.published_at?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Updates basic course metadata with optimistic concurrency validation.
   */
  async function updateCourseBasics(
    courseId: string,
    creatorId: string,
    payload: UpdateCourseBasicsRequest,
    logger: FastifyBaseLogger,
    userRoles?: readonly string[],
  ) {
    const { version, ...updates } = payload;
    const course = await getCourseAndVerifyOwner(
      courseId,
      creatorId,
      userRoles,
    );

    if (course.version !== version) {
      throw new AppError(
        409,
        "OPTIMISTIC_LOCK_CONFLICT",
        "Course has been updated by another action. Please reload.",
      );
    }

    if (
      course.status === "published" &&
      updates.description !== undefined &&
      (!updates.description || updates.description.trim().length === 0)
    ) {
      throw new AppError(
        400,
        "INVALID_DESCRIPTION",
        "Published courses must keep a non-empty description.",
      );
    }

    // One value is checked here, written below and reported back: `category`
    // is an accepted alias, and checking `categoryId` alone let an unknown
    // or a removed category through under the other name. `null` removes
    // the category (publishing does not require one, so a published course
    // may lose it too); `undefined` leaves it alone.
    const categoryUpdate = resolveBasicsCategoryUpdate(updates);
    await assertCategoryExists(categoryUpdate);
    // The level by the same rule (`difficultyLevel` is its alias): `null`
    // removes it, which `difficulty ?? difficultyLevel` skipped while the
    // response said it was gone. Publishing does not require a level.
    const difficultyUpdate = resolveAliasedBasicsUpdate(
      updates.difficulty,
      updates.difficultyLevel,
    );

    if (updates.thumbnailMediaId) {
      const thumb = await mediaService.getMediaAsset(
        updates.thumbnailMediaId,
        creatorId,
        userRoles,
      );
      if (
        !thumb ||
        thumb.type !== "image" ||
        !ALLOWED_THUMBNAIL_MIME_TYPES.has(thumb.mime_type)
      ) {
        throw new AppError(
          400,
          "INVALID_THUMBNAIL",
          "Thumbnail must be a valid image asset.",
        );
      }
    }

    if (updates.trailerMediaId) {
      const trailer = await mediaService.getMediaAsset(
        updates.trailerMediaId,
        creatorId,
        userRoles,
      );
      if (!trailer || trailer.type !== "video") {
        throw new AppError(
          400,
          "INVALID_TRAILER",
          "Trailer must be a valid video asset.",
        );
      }
    }

    const now = new Date();
    const newVersion = version + 1;

    const updateResult = await courseRepo.updateCourse(
      database,
      courseId,
      version,
      {
        title: updates.title,
        short_description: updates.shortDescription,
        description: updates.description,
        category_id: categoryUpdate,
        difficulty: difficultyUpdate,
        thumbnail_media_id: updates.thumbnailMediaId,
        trailer_media_id: updates.trailerMediaId,
        instructor_alias: updates.instructorAlias,
        version: newVersion,
        updated_at: now,
      },
    );
    assertOptimisticUpdate(updateResult);

    let transcodeJobInfo: {
      should202: boolean;
      jobId: string | null;
    } | null = null;
    if (updates.trailerMediaId) {
      transcodeJobInfo = await mediaService.queueTranscodeJob(
        updates.trailerMediaId,
        creatorId,
        logger,
        userRoles,
      );
    }

    if (transcodeJobInfo && transcodeJobInfo.should202) {
      return { accepted: true as const, version: newVersion };
    }

    return {
      accepted: false as const,
      course: {
        id: course.id,
        slug: course.slug,
        title: updates.title ?? course.title,
        shortDescription:
          updates.shortDescription !== undefined
            ? updates.shortDescription
            : course.short_description,
        description:
          updates.description !== undefined
            ? updates.description
            : course.description,
        difficulty:
          difficultyUpdate !== undefined ? difficultyUpdate : course.difficulty,
        categoryId:
          categoryUpdate !== undefined ? categoryUpdate : course.category_id,
        instructorAlias:
          updates.instructorAlias !== undefined
            ? updates.instructorAlias
            : (course.instructor_alias ?? null),
        version: newVersion,
      } satisfies CourseBasicsResponse,
    };
  }

  /**
   * Assembles the full editor payload for authoring view.
   */
  async function getCourseEditorData(
    courseId: string,
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    const course = await courseRepo.findCourseById(database, courseId);
    if (!course) {
      throw new AppError(404, "COURSE_NOT_FOUND", "Course not found.");
    }
    if (!canManageCourse(course, creatorId, userRoles)) {
      throw new AppError(403, "FORBIDDEN", "Unauthorized course access.");
    }

    // The course's media is read as its creator: an instructor sees the
    // files they attached, an administrator sees all of them.
    const mediaOwnerId = course.creator_id ?? creatorId;
    const [
      sections,
      lessons,
      resources,
      accessRules,
      pricing,
      settings,
      includes,
      thumbnail,
    ] = await Promise.all([
      curriculumService.findSectionsByCourseId(courseId),
      curriculumService.findLessonsByCourseId(courseId),
      curriculumService.listResourcesByCourseId(courseId),
      configurationService.findAccessRuleByCourseId(courseId),
      configurationService.findPricingByCourseId(courseId),
      configurationService.findSettingsByCourseId(courseId),
      includesService.listIncludesForAuthorizedCourse(courseId),
      resolveCourseThumbnailUrls(
        course.thumbnail_media_id,
        mediaOwnerId,
        userRoles,
      ),
    ]);
    const mediaById = await loadCurriculumMedia(
      lessons,
      resources,
      mediaOwnerId,
      userRoles,
    );
    const totalDurationSeconds = lessons.reduce(
      (total, lesson) => total + getLessonDurationSeconds(lesson, mediaById),
      0,
    );

    return {
      course: presentCourse(course, { thumbnail, totalDurationSeconds }),
      sections: presentCurriculum({ sections, lessons, resources, mediaById }),
      accessRules: accessRules ? presentAccessRule(accessRules) : null,
      pricing: pricing ? presentPricing(pricing) : null,
      settings: settings ? presentSettings(settings) : null,
      includes,
    };
  }

  /**
   * Whether a signed-in viewer who does not manage the course has it: the
   * course is free and unrestricted, or the viewer holds access.
   */
  async function viewerHasCourse(
    userId: string,
    courseId: string,
    pricingType: string | null | undefined,
    accessType: string | null | undefined,
  ): Promise<boolean> {
    const isOpen = isOpenFreeCourse({
      pricing_type: pricingType,
      access_type: accessType,
    });
    return isOpen || accessService.hasActiveAccess(database, userId, courseId);
  }

  /**
   * Assembles public course overview data for learners.
   */
  async function getCourseOverviewData(
    courseIdOrSlug: string,
    user?: {
      id: string;
      roles?: string[];
      /** Answer as for a learner: see `LEARNER_VIEW_HEADER`. */
      learnerView?: boolean;
    },
  ): Promise<CourseOverviewResponse> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        courseIdOrSlug,
      );

    const course = isUuid
      ? await courseRepo.findCourseById(database, courseIdOrSlug)
      : await courseRepo.findCourseBySlug(database, courseIdOrSlug);

    if (!course) {
      throw new AppError(404, "COURSE_NOT_FOUND", "Course not found.");
    }

    const visibility = resolveOverviewVisibility(course, user);
    // An archived course is still shown to a learner who holds access to
    // it, as a learner sees any course; to everyone else it stays unfound.
    if (
      !visibility.mayOpen &&
      !(await accessService.isCourseOpenToLearner(database, user?.id, course))
    ) {
      throw new AppError(404, "COURSE_NOT_FOUND", "Course not published.");
    }

    const courseId = course.id;
    const viewerManagesCourse = visibility.managesCourse;

    const [
      category,
      allSections,
      allLessons,
      allResources,
      accessRule,
      pricing,
      settings,
      includes,
      thumbnail,
    ] = await Promise.all([
      course.category_id
        ? categoryService.findCategoryById(course.category_id)
        : null,
      curriculumService.findSectionsByCourseId(courseId),
      curriculumService.findLessonsByCourseId(courseId),
      curriculumService.listResourcesByCourseId(courseId),
      configurationService.findAccessRuleByCourseId(courseId),
      configurationService.findPricingByCourseId(courseId),
      configurationService.findSettingsByCourseId(courseId),
      includesService.listIncludesForAuthorizedCourse(courseId),
      resolveCourseThumbnailUrls(
        course.thumbnail_media_id,
        course.creator_id ?? user?.id,
        user?.roles,
      ),
    ]);

    // Learners get published lessons only, and only the sections that still
    // have one: an unpublished section's title is not theirs to see. Lesson
    // order is untouched, so lesson numbers stay what they were.
    const lessons = allLessons.filter((lesson) =>
      isLessonListedInOverview(lesson, visibility),
    );
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    const sections = viewerManagesCourse
      ? allSections
      : allSections.filter((section) =>
          lessons.some((lesson) => lesson.section_id === section.id),
        );
    const resources = allResources.filter((resource) =>
      lessonIds.has(resource.lesson_id),
    );

    // What a lesson's files are called and how large they are is shown to
    // viewers who may download them, by the same rule the download applies:
    // whoever manages the course, a signed-in learner on a free unrestricted
    // course, or a learner who holds access. Everyone else sees that a
    // lesson has resources and how many, nothing about the files.
    const viewerMayDownloadResources =
      viewerManagesCourse ||
      (user !== undefined &&
        resources.length > 0 &&
        (await viewerHasCourse(
          user.id,
          courseId,
          pricing?.pricing_type,
          accessRule?.access_type,
        )));
    const visibleResources = viewerMayDownloadResources
      ? resources
      : redactLockedResources(resources);

    // "Show instructor name" is the instructor's choice, so it is applied
    // here rather than left to each client to honour.
    const instructorHidden =
      settings?.show_instructor_name === false && !viewerManagesCourse;

    // Learners who may download a resource see what it is first, so its file
    // details go out with the overview. Media is read without an owner
    // filter: the viewer is not the uploader.
    const [mediaById, creatorRows] = await Promise.all([
      loadCurriculumMedia(lessons, viewerMayDownloadResources ? resources : []),
      course.creator_id && !instructorHidden
        ? authService.listUserDisplayNamesByIds([course.creator_id])
        : [],
    ]);
    const creatorRow = creatorRows[0];

    const totalDurationSeconds = resolveTotalDurationSeconds(
      lessons.reduce(
        (total, lesson) => total + getLessonDurationSeconds(lesson, mediaById),
        0,
      ),
      settings?.estimated_duration,
    );

    return {
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        shortDescription: course.short_description,
        description: course.description,
        difficulty: course.difficulty,
        status: course.status,
        creatorId: course.creator_id,
        thumbnailUrl: thumbnail.thumbnailUrl,
        thumbnailSrcSet: toSrcSet(thumbnail.thumbnailSrcSet),
        trailerMediaId: course.trailer_media_id,
        instructorAlias: instructorHidden ? null : course.instructor_alias,
      },
      category: category ? { name: category.name } : null,
      creator: creatorRow
        ? { id: creatorRow.id, displayName: creatorRow.display_name }
        : null,
      sections: presentCurriculum({
        sections,
        lessons,
        resources: visibleResources,
        mediaById,
        // The map also holds every lesson's own media, and a resource can
        // point at one of those.
        omitResourceMedia: !viewerMayDownloadResources,
        omitLessonDescriptions: !overviewLessonDescriptions,
      }),
      pricing: pricing
        ? {
            pricingType: pricing.pricing_type,
            price: pricing.price,
            currency: pricing.currency,
            salePrice: pricing.sale_price,
            // Absent until the migration that adds the column has run.
            showDiscountBadge: pricing.show_discount_badge === true,
          }
        : null,
      settings: settings
        ? {
            allowQa: settings.allow_qa,
            allowComments: settings.allow_comments,
            allowNotes: settings.allow_notes,
            showInstructorName: settings.show_instructor_name,
            language: settings.language,
            estimatedDuration: settings.estimated_duration,
          }
        : null,
      includes: includes.map(({ text, position }) => ({ text, position })),
      // Asked of the rule checkout applies before it prices the course, so
      // the page offers enrolment exactly when checkout would allow it.
      // Whether the course is free is read as checkout reads it too: a
      // priced course that sells for nothing is a free one, and a
      // restricted free course is entered by a grant from staff only.
      canSelfEnroll: !isRestrictedFreeCourse({
        pricing_type: resolveCoursePricing(pricing).pricingType,
        access_type: accessRule?.access_type,
      }),
      stats: {
        totalSections: sections.length,
        totalLessons: lessons.length,
        totalDurationSeconds,
      },
    };
  }

  /**
   * One lesson's description, for the viewers the overview lists that lesson
   * for and nobody else: the overview is where the lesson page used to read
   * it, so the two must agree.
   */
  async function getLessonDescription(
    courseId: string,
    lessonId: string,
    user?: OverviewViewer,
  ): Promise<LessonDescriptionResponse> {
    const course = await courseRepo.findCourseById(database, courseId);
    const visibility = course
      ? resolveOverviewVisibility(course, user)
      : undefined;
    if (
      !course ||
      !visibility ||
      // The overview's rule, archived courses included.
      (!visibility.mayOpen &&
        !(await accessService.isCourseOpenToLearner(
          database,
          user?.id,
          course,
        )))
    ) {
      throw new AppError(404, "COURSE_NOT_FOUND", "Course not found.");
    }

    const lesson = await curriculumService.findLiveLessonDescription(
      lessonId,
      course.id,
    );
    if (!lesson || !isLessonListedInOverview(lesson, visibility)) {
      throw new AppError(404, "LESSON_NOT_FOUND", "Lesson not found.");
    }

    return { lessonId: lesson.id, description: lesson.description };
  }

  /**
   * Soft deletes a course after verifying ownership.
   */
  async function deleteCourse(
    courseId: string,
    creatorId: string,
    userRoles?: readonly string[],
  ) {
    return await deletionService.scheduleCourseDeletion(
      courseId,
      creatorId,
      userRoles,
    );
  }

  async function findLessonById(courseId: string, lessonId: string) {
    return curriculumService.findLessonById(lessonId, courseId);
  }

  /** Read-only course lookup for trusted module services that already perform
   * their own actor authorization (for example platform-admin analytics). */
  async function findCourseById(courseId: string) {
    return courseRepo.findCourseById(database, courseId);
  }

  /** The same lookup by slug, for the same trusted callers. */
  async function findCourseBySlug(slug: string) {
    return courseRepo.findCourseBySlug(database, slug);
  }

  /**
   * Title, slug, status and thumbnail of each of a list of courses, whatever
   * their status: what a list that names courses needs. For module services
   * that decide for themselves which of them the viewer may be told about (a
   * learner's history is one). A course that has been deleted is left out.
   */
  async function listCourseCardsByIds(courseIds: readonly string[]) {
    const courses = await courseRepo.findCoursesByIds(database, [
      ...new Set(courseIds),
    ]);
    return await Promise.all(
      courses.map(async (course) => {
        const thumbnail = course.thumbnail_media_id
          ? await resolveCourseThumbnailUrls(
              course.thumbnail_media_id,
              course.creator_id ?? undefined,
            )
          : { thumbnailUrl: course.thumbnail_url ?? null, thumbnailSrcSet: [] };
        return {
          id: course.id,
          slug: course.slug,
          title: course.title,
          status: course.status,
          thumbnailUrl: thumbnail.thumbnailUrl,
          thumbnailSrcSet: thumbnail.thumbnailSrcSet,
        };
      }),
    );
  }

  /**
   * Id and slug of the published courses among those named (each by id or
   * slug): what a learner may be told exists. For lists that only name
   * courses, such as a wishlist.
   */
  async function listPublishedCourseRefs(courseIdsOrSlugs: readonly string[]) {
    return courseRepo.findPublishedCourseRefs(database, courseIdsOrSlugs);
  }

  /**
   * Owner, status, access type and pricing type of a course addressed by id
   * or slug, in one query, for services that decide access themselves.
   */
  async function findCourseAccessByIdOrSlug(courseIdOrSlug: string) {
    return courseRepo.findCourseAccessByIdOrSlug(database, courseIdOrSlug);
  }

  async function formatCourseDto(
    c: NonNullable<Awaited<ReturnType<typeof courseRepo.findCourseById>>>,
  ) {
    const thumbnail = c.thumbnail_media_id
      ? await resolveCourseThumbnailUrls(
          c.thumbnail_media_id,
          c.creator_id ?? undefined,
        )
      : { thumbnailUrl: c.thumbnail_url ?? null, thumbnailSrcSet: [] };

    return presentCourse(c, { thumbnail });
  }

  /**
   * The three direct-update endpoints below (thumbnail, details, archive)
   * were guarded by a route permission only, so anyone holding that
   * permission could change ANY course. They go through the same ownership
   * gate as every other course mutation.
   *
   * Thumbnail and details accept the course `version` the caller last read.
   * When it is sent, a course that has changed since is refused with the
   * same 409 as the basics form; a caller that sends none is not checked.
   */
  function assertDirectUpdateVersion(
    course: { version: number },
    expectedVersion: number | undefined,
  ) {
    if (expectedVersion !== undefined && course.version !== expectedVersion) {
      throw new AppError(
        409,
        "OPTIMISTIC_LOCK_CONFLICT",
        "Course has been updated by another action. Please reload.",
      );
    }
  }

  async function updateCourseThumbnail(
    courseId: string,
    creatorId: string,
    userRoles: readonly string[] | undefined,
    payload: {
      thumbnailUrl: string;
      thumbnailMediaId?: string | null;
      version?: number;
    },
  ) {
    const course = await getCourseAndVerifyOwner(
      courseId,
      creatorId,
      userRoles,
    );
    assertDirectUpdateVersion(course, payload.version);

    // Same rule as updateCourseBasics: the asset must be an image the caller
    // owns. Unchecked, any media id could be attached here — and a media
    // asset attached to a published course is served publicly, which turned
    // this endpoint into a way to expose paid lesson files.
    if (payload.thumbnailMediaId) {
      const thumb = await mediaService.getMediaAsset(
        payload.thumbnailMediaId,
        creatorId,
        userRoles,
      );
      if (
        !thumb ||
        thumb.type !== "image" ||
        !ALLOWED_THUMBNAIL_MIME_TYPES.has(thumb.mime_type)
      ) {
        throw new AppError(
          400,
          "INVALID_THUMBNAIL",
          "Thumbnail must be a valid image asset.",
        );
      }
    }

    const updateResult = await courseRepo.updateCourseDirect(
      database,
      courseId,
      {
        thumbnail_url: payload.thumbnailUrl,
        thumbnail_media_id: payload.thumbnailMediaId ?? null,
      },
      payload.version,
    );
    // A write that landed between the read above and this one.
    if (payload.version !== undefined) assertOptimisticUpdate(updateResult);

    const updated = await courseRepo.findCourseById(database, courseId);
    return await formatCourseDto(updated!);
  }

  async function updateCourseDetails(
    courseId: string,
    creatorId: string,
    userRoles: readonly string[] | undefined,
    payload: {
      title?: string;
      subtitle?: string | null;
      description?: string | null;
      language?: string;
      level?: "beginner" | "intermediate" | "advanced" | "all_levels";
      categoryId?: string | null;
      version?: number;
    },
  ) {
    const course = await getCourseAndVerifyOwner(
      courseId,
      creatorId,
      userRoles,
    );
    assertDirectUpdateVersion(course, payload.version);
    await assertCategoryExists(payload.categoryId);

    const updates: Record<string, unknown> = {};
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.subtitle !== undefined)
      updates.short_description = payload.subtitle;
    if (payload.description !== undefined)
      updates.description = payload.description;
    if (payload.categoryId !== undefined)
      updates.category_id = payload.categoryId;
    // "all_levels" is stored as no level (see resolveDetailsLevelUpdate).
    const difficulty = resolveDetailsLevelUpdate(payload.level);
    if (difficulty !== undefined) updates.difficulty = difficulty;

    const updateResult = await courseRepo.updateCourseDirect(
      database,
      courseId,
      updates,
      payload.version,
    );
    if (payload.version !== undefined) assertOptimisticUpdate(updateResult);
    const updated = await courseRepo.findCourseById(database, courseId);
    return await formatCourseDto(updated!);
  }

  async function archiveCourse(
    courseId: string,
    creatorId: string,
    userRoles: readonly string[] | undefined,
  ) {
    await getCourseAndVerifyOwner(courseId, creatorId, userRoles);

    await courseRepo.updateCourseDirect(database, courseId, {
      status: "archived",
    });

    const updated = await courseRepo.findCourseById(database, courseId);
    return await formatCourseDto(updated!);
  }

  return {
    getCourseAndVerifyOwner,
    resolveCourseThumbnailUrls,
    createCourse,
    listMyCourses,
    listMyCourseScope,
    listOwnedCourseIds,
    listMyCourseSummaries,
    listPublishedCourses,
    getHomeDiscovery,
    listPublicCourseSummaries,
    listPublishedCourseOptions,
    getPublishedCourseBySlug,
    listAvailableCoursesByCreator,
    updateCourseBasics,
    updateCourseThumbnail,
    updateCourseDetails,
    archiveCourse,
    getCourseEditorData,
    getCourseOverviewData,
    getLessonDescription,
    deleteCourse,
    findLessonById,
    findCourseById,
    findCourseBySlug,
    listCourseCardsByIds,
    listPublishedCourseRefs,
    findCourseAccessByIdOrSlug,
  };
}

export type CourseService = ReturnType<typeof createCourseService>;
