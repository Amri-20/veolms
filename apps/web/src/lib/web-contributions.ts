import { useSyncExternalStore } from "react";
import {
  getWebContributions,
  subscribeWebContributions,
  type WebContributions,
} from "@veolms/web-core";

/**
 * UI pieces plugins have added to core screens (see `contributions.ts` in
 * web-core). Re-renders when a plugin registers or removes one; the static
 * build and the first client render see none, so hydration matches.
 */
export function useWebContributions(): WebContributions {
  return useSyncExternalStore(
    subscribeWebContributions,
    getWebContributions,
    getServerWebContributions,
  );
}

const SERVER_CONTRIBUTIONS: WebContributions = {
  lessonCardActions: [],
  profileMenuLinks: [],
};

function getServerWebContributions(): WebContributions {
  return SERVER_CONTRIBUTIONS;
}
