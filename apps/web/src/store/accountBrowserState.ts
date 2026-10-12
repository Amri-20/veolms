import { forgetSessionTabs } from "../routing/tabSessionState";

/**
 * What this browser keeps about the account that was signed in, outside the
 * account's own (id-scoped) keys, and forgets when that session ends.
 *
 * It is called from `authStore.clearAuth`, which every way out of a session
 * goes through: signing out, a request answered "not signed in", `/auth/me`
 * finding no session, deactivating the account, calling off a sign-in. Only
 * the sign-out button used to forget anything, so after a session expired
 * the next account to sign in on the same tab opened on the previous one's
 * Settings tab and saw its course search.
 *
 * Only state that is cheap to lose and wrong to hand on is listed here.
 * Unsaved writing is deliberately not: the lesson-editor drafts
 * (`veolms:lesson-editor-draft:`), the quiz-builder drafts
 * (`veolms:quiz-builder:draft:`) and the discussion drafts stay, because a
 * session that expires in the middle of writing must not take the text with
 * it. The last-opened lesson of a course (`veolms-last-lesson-`) stays too:
 * it is what brings the same learner back to their lesson after signing in
 * again.
 */

/** The course catalogue's search box (`CoursesPage`). */
export const COURSE_CATALOGUE_SEARCH_SESSION_KEY =
  "veolms-course-catalogue-search";

/**
 * Session-storage keys forgotten with the session, besides the remembered
 * Settings and Discussions tabs: the catalogue search, and each course's
 * lesson search and whether it was open (`learning/Curriculum.tsx`,
 * `veolms-learning-<course>-curriculum-search[-open]`).
 */
export function isAccountSessionStorageKey(key: string): boolean {
  return (
    key === COURSE_CATALOGUE_SEARCH_SESSION_KEY ||
    /^veolms-learning-.+-curriculum-search(-open)?$/.test(key)
  );
}

/**
 * Local-storage keys forgotten with the session: the per-course progress map
 * written by the player (`veolms-learning-<course>-progress`,
 * `learning/LearningWorkspace.tsx`). It carries no account, and the course
 * cards show the higher of it and the server's figure, so the next account
 * was shown the previous one's progress. The server holds the real figure.
 *
 * The account-scoped progress store (`veolms-learning-progress-v1:<user>:…`,
 * `learning/learningProgressStorage.ts`) is not matched: it is the only key
 * of the two with a ":" in it, and it holds progress not yet sent.
 */
export function isAccountLocalStorageKey(key: string): boolean {
  return (
    key.startsWith("veolms-learning-") &&
    key.endsWith("-progress") &&
    !key.includes(":")
  );
}

function removeMatchingKeys(
  storage: Storage,
  shouldRemove: (key: string) => boolean,
) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && shouldRemove(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

export function forgetAccountBrowserState(): void {
  if (typeof window === "undefined") return;
  forgetSessionTabs();
  try {
    removeMatchingKeys(window.sessionStorage, isAccountSessionStorageKey);
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }
  try {
    removeMatchingKeys(window.localStorage, isAccountLocalStorageKey);
  } catch {
    // Local storage can be unavailable in privacy-restricted contexts.
  }
}
