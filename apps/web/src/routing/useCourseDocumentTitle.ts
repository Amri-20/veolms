import { useCallback, useSyncExternalStore } from "react";
import { useLocation, useMatches, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseOverviewResponse } from "@veolms/contracts";
import { courseKeys } from "../services/courses";
import { getCourseDocumentTitle } from "./routeDescriptors";
import { useDocumentTitle } from "./useDocumentTitle";

const getServerCourseTitle = () => undefined;

/**
 * On the course overview page, puts the course's own name in the tab title
 * once the page has fetched the course. It only reads what the page's own
 * request left in the query cache: it makes no request and does not take
 * part in that query, so the page loads exactly as before.
 */
export function useCourseOverviewDocumentTitle(active: boolean): void {
  const matches = useMatches();
  const { pathname } = useLocation();
  const { courseSlug } = useParams();
  const queryClient = useQueryClient();
  const slug = active ? courseSlug : undefined;

  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );
  const getCourseTitle = useCallback(
    () =>
      slug
        ? queryClient.getQueryData<CourseOverviewResponse>(
            courseKeys.overview(slug),
          )?.course.title
        : undefined,
    [queryClient, slug],
  );
  const courseTitle = useSyncExternalStore(
    subscribe,
    getCourseTitle,
    getServerCourseTitle,
  );

  useDocumentTitle(
    slug
      ? getCourseDocumentTitle(
          "course-overview",
          { courseSlug: slug },
          pathname,
          matches,
          { courseTitle },
        )
      : undefined,
  );
}
