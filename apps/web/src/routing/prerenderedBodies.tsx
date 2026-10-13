import { lazy, useState, type ComponentType } from "react";
import { readHomeHint } from "../store/homeHint";
import {
  CATALOGUE_CHUNK_URL_PLACEHOLDER,
  GUEST_HOME_CHUNK_URL_PLACEHOLDER,
} from "./routeChunkPreloads";

/**
 * A lazily loaded page body whose markup is already in the prerendered
 * document.
 *
 * React can only hydrate such a body once its module has loaded. Until then
 * the surrounding Suspense boundary stays dehydrated, and the first parent
 * re-render makes React give up on it: the prerendered markup is removed and
 * the body is rendered from scratch when the module finally arrives. On a
 * slow connection that blanked content which was already on screen for
 * seconds and pushed the largest paint out with it.
 *
 * `preload` loads the module ahead of hydration (see entry.client.tsx). Once
 * it has loaded, the body renders synchronously, so it hydrates with the
 * rest of the page and the prerendered markup is kept.
 *
 * The same holds for a page fetched ahead of a visit: once its module is
 * here it renders at once, where a bare `lazy()` shows its fallback for a
 * moment even then.
 */
export function definePrerenderedBody<Module, Props extends object>(
  load: () => Promise<Module>,
  pick: (module: Module) => ComponentType<Props>,
) {
  let loaded: ComponentType<Props> | null = null;
  let pending: Promise<ComponentType<Props>> | null = null;
  const preload = () => {
    pending ??= load().then((module) => {
      loaded = pick(module);
      return loaded;
    });
    return pending;
  };
  const Lazy = lazy(() =>
    preload().then((component) => ({ default: component })),
  );

  function Body(props: Props) {
    // Decided once per mount: switching component type later would remount.
    const [Ready] = useState(() => loaded);
    return Ready ? <Ready {...props} /> : <Lazy {...props} />;
  }

  return { Body, preload };
}

export const guestHomeBody = definePrerenderedBody(
  () => import("../GuestHome"),
  (module) => module.GuestHome,
);

export const courseCatalogueBody = definePrerenderedBody(
  () => import("../courses/CourseCatalogue"),
  (module) => module.CourseCatalogue,
);

// Fetched ahead of a visit by the shell (see its warm-up effect), so that
// opening them shows the page and not a placeholder for it.
export const settingsPageBody = definePrerenderedBody(
  () => import("../SettingsPage"),
  (module) => module.SettingsPage,
);

export const workspacePageBody = definePrerenderedBody(
  () => import("../workspace/WorkspacePages"),
  (module) => module.WorkspacePage,
);

// The dashboard. Its code is fetched while the session is checked (see the
// shell's warm-up effect), so that when the checks are done it takes its
// placeholder's place at once.
export const creatorDashboardBody = definePrerenderedBody(
  () => import("../CreatorDashboard"),
  (module) => module.CreatorDashboard,
);

// The login pop-up. Fetched with the app when the address asks for it (see
// entry.client.tsx) and while the login address checks the session, so it
// opens with the page and not a moment after it.
export const loginDialogBody = definePrerenderedBody(
  () => import("../auth/LoginDialog"),
  (module) => module.default,
);

function documentPreloads(chunkUrl: string) {
  // Anywhere in the document, not only <head>: the link may still be on its
  // way there when this runs.
  return [
    ...document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"]'),
  ].some((link) => link.getAttribute("href") === chunkUrl);
}

/**
 * Starts loading the bodies the prerendered document contains, recognised by
 * the module preload each one emits. Returns null when there is nothing to
 * wait for.
 */
export function preloadPrerenderedBodies(): Promise<unknown> | null {
  const pending: Promise<unknown>[] = [];
  // A browser that was signed in last time never shows the guest home; its
  // prerendered copy is hidden from the first paint, so nothing waits on it.
  // The dev server's document is not prerendered and carries no preloads, but
  // it is handed the home page's data (see loadDevelopmentHomePageData), so
  // the page renders on the first pass there too. Loading its module first
  // keeps that pass from showing the loading state while the module arrives.
  const isDevelopmentHome =
    import.meta.env.DEV && ["/", "/home"].includes(window.location.pathname);
  // A learner who had no courses last time is the exception: their home is
  // the guest home with a greeting, and it is what the first paint shows.
  if (
    (isDevelopmentHome || documentPreloads(GUEST_HOME_CHUNK_URL_PLACEHOLDER)) &&
    (!document.documentElement.dataset.sessionHint ||
      readHomeHint() === "new-learner")
  ) {
    pending.push(guestHomeBody.preload());
  }
  if (documentPreloads(CATALOGUE_CHUNK_URL_PLACEHOLDER)) {
    pending.push(courseCatalogueBody.preload());
  }
  return pending.length ? Promise.all(pending) : null;
}
