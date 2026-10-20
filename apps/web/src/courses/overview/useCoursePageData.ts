import { useEffect, useState } from "react";
import type {
  CourseAccessResponse,
  CourseOverviewResponse,
} from "@veolms/contracts";
import type { ApiError } from "../../lib/api-error";
import {
  useCourseAccess,
  useCourseOverview,
  useCoursePublicCurriculum,
  useStaticCurriculum,
} from "../../services/courses";
import {
  curriculumToOverview,
  type CourseCurriculumPreview,
} from "../staticCurriculum";

export interface CoursePageData {
  /** The course as the page draws it; undefined until something is in. */
  overview: CourseOverviewResponse | undefined;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  /** What the viewer may do with the course; undefined until it answers. */
  access: CourseAccessResponse | undefined;
  accessPending: boolean;
  /** How many sections the whole curriculum has. */
  totalSections: number | undefined;
  /** Whether `overview` holds every section, or the first ones only. */
  sectionsComplete: boolean;
  /** Asks for the sections the page was not built with. */
  requestAllSections: () => void;
}

type IdleHandle = number;

function onIdle(callback: () => void): () => void {
  const host = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => IdleHandle;
    cancelIdleCallback?: (handle: IdleHandle) => void;
  };
  if (host.requestIdleCallback && host.cancelIdleCallback) {
    const handle = host.requestIdleCallback(callback, { timeout: 4000 });
    return () => host.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 1500);
  return () => window.clearTimeout(handle);
}

/**
 * Where a course page's course comes from. What every visitor sees is in
 * the page itself, built ahead of time: the course and its first sections.
 * The rest of the curriculum is a file the site was built with, fetched
 * once the page is idle or when the reader asks for it. The viewer's own
 * part (the price in force, whether they hold the course, their progress,
 * whether they manage it) is one small answer from the API.
 *
 * The API's curriculum is asked for only when the page has no built copy
 * (the dev server, a course published after the build) or when its copy is
 * older than the course (the access answer carries the current version).
 * The course's creator and admins get the whole overview, unpublished
 * lessons included, as do learners who hold an archived course, which has
 * no public curriculum.
 */
export function useCoursePageData({
  courseSlug,
  preview,
  enabled,
  awaitsAccess,
}: {
  courseSlug: string | undefined;
  preview: CourseCurriculumPreview | undefined;
  enabled: boolean;
  /** Whether the page waits for the access answer (a signed-in viewer). */
  awaitsAccess: boolean;
}): CoursePageData {
  // The built course belongs to the page first loaded; another course's
  // route must not be drawn with it.
  const seeded =
    preview &&
    courseSlug &&
    (preview.curriculum.course.slug === courseSlug ||
      preview.curriculum.course.id === courseSlug)
      ? preview
      : undefined;

  const accessQuery = useCourseAccess(courseSlug, { enabled });
  const access = accessQuery.data;
  const isManager = access?.viewer === "manager";
  const builtBeforeChange = Boolean(
    seeded && access && access.curriculumVersion !== seeded.curriculum.version,
  );

  const [wantsAllSections, setWantsAllSections] = useState(false);
  const needsFile =
    enabled &&
    Boolean(seeded) &&
    !seeded?.complete &&
    !builtBeforeChange &&
    !isManager;
  // The rest of the curriculum is fetched while the reader is still looking
  // at the top of the page, so "Show all sections" usually finds it there.
  useEffect(() => {
    if (!needsFile || wantsAllSections) return;
    return onIdle(() => setWantsAllSections(true));
  }, [needsFile, wantsAllSections]);
  const fileQuery = useStaticCurriculum(
    seeded?.curriculum.course.slug,
    seeded?.curriculum.version,
    { enabled: needsFile && wantsAllSections },
  );
  const fileMissing = fileQuery.isFetched && !fileQuery.data;

  const needsApiCurriculum =
    enabled &&
    !isManager &&
    (!seeded || builtBeforeChange || (wantsAllSections && fileMissing));
  const apiCurriculum = useCoursePublicCurriculum(courseSlug, {
    enabled: needsApiCurriculum,
  });
  const publicCurriculumMissing =
    apiCurriculum.error?.status === 404 && Boolean(access);

  const personal = useCourseOverview(courseSlug, {
    enabled: enabled && (isManager || publicCurriculumMissing),
  });

  const fullCurriculum =
    (needsApiCurriculum ? apiCurriculum.data : undefined) ?? fileQuery.data;
  const curriculum =
    fullCurriculum ?? (builtBeforeChange ? undefined : seeded?.curriculum);
  const sectionsComplete = Boolean(fullCurriculum) || Boolean(seeded?.complete);
  const pricing = access?.pricing ?? seeded?.pricing ?? null;

  let overview: CourseOverviewResponse | undefined;
  if ((isManager || publicCurriculumMissing) && personal.data) {
    overview = personal.data;
  } else if (curriculum) {
    overview = curriculumToOverview(curriculum, pricing);
    if (access) overview = { ...overview, canSelfEnroll: access.canSelfEnroll };
  } else if (seeded && builtBeforeChange) {
    // Older than the course, but better than an empty page while the
    // current curriculum is on its way.
    overview = curriculumToOverview(seeded.curriculum, pricing);
  }

  const overviewIsWhole =
    overview === personal.data ? Boolean(personal.data) : sectionsComplete;
  const totalSections = overviewIsWhole
    ? overview?.sections.length
    : seeded?.totalSections;

  const isLoading =
    !overview &&
    (accessQuery.isLoading || apiCurriculum.isLoading || personal.isLoading);
  const error = overview
    ? null
    : (personal.error ??
      (publicCurriculumMissing ? null : apiCurriculum.error) ??
      accessQuery.error ??
      null);

  return {
    overview,
    isLoading,
    error,
    refetch: () => {
      void accessQuery.refetch();
      if (needsApiCurriculum) void apiCurriculum.refetch();
      if (isManager || publicCurriculumMissing) void personal.refetch();
    },
    access,
    accessPending: awaitsAccess && enabled && accessQuery.isPending,
    totalSections,
    sectionsComplete: overviewIsWhole,
    requestAllSections: () => setWantsAllSections(true),
  };
}
