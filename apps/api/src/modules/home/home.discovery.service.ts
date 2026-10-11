import type { HomeDiscoveryResponse } from "@veolms/contracts";
import type { CourseService } from "../courses/course/course.service.ts";

export interface HomeDiscoveryService {
  getDiscovery(): Promise<HomeDiscoveryResponse>;
}

/** How long one build of the public Home discovery is reused. */
const HOME_DISCOVERY_CACHE_MS = 30_000;

export function createHomeDiscoveryService({
  courseService,
}: {
  courseService: Pick<CourseService, "getHomeDiscovery">;
}): HomeDiscoveryService {
  // The same for every visitor, and asked for on every visit to Home, so
  // one build is shared for a short while (as the guest page's is). A build
  // in progress is shared too: a burst of visitors waits on one query set
  // instead of starting one each.
  let cached:
    { expiresAt: number; discovery: ReturnType<typeof build> } | undefined;
  const build = () => courseService.getHomeDiscovery();

  return {
    async getDiscovery() {
      const now = Date.now();
      if (cached && cached.expiresAt > now) return await cached.discovery;

      const entry = {
        expiresAt: now + HOME_DISCOVERY_CACHE_MS,
        discovery: build(),
      };
      cached = entry;
      try {
        return await entry.discovery;
      } catch (error) {
        // A failed build must not be served again from the cache.
        if (cached === entry) cached = undefined;
        throw error;
      }
    },
  };
}
