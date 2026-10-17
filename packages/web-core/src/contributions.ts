import type { ComponentType } from "react";

/**
 * Runtime UI contributions: small pieces of interface a plugin adds to core
 * screens without core knowing what the plugin is. A plugin registers them
 * once in the browser (for example from its root layout module); the core
 * screen that owns the slot renders whatever is registered, in `order`.
 *
 * Routes are contributed at build time through `WebExtension`; these are
 * contributed at runtime because they are components, not route files.
 */

/** What a lesson-card action knows about the lesson it sits on. */
export interface LessonCardActionProps {
  /** Course slug (or id) the curriculum belongs to. */
  courseKey: string;
  lessonNumber: number;
  /** The number the lesson is shown with in the list. */
  displayNumber: number;
  lessonTitle: string;
  /** Lesson content type ("video", "quiz", "document", …). */
  contentType: string;
  isActive: boolean;
  /**
   * Shape shared by the lesson card's own action buttons, so a contributed
   * button lines up with them. The contribution adds its own tint.
   */
  actionClassName: string;
}

export interface LessonCardActionContribution {
  id: string;
  order?: number;
  component: ComponentType<LessonCardActionProps>;
}

export interface ProfileMenuIconProps {
  size?: number;
  className?: string;
}

/** A link added to the account section of the profile menu. */
export interface ProfileMenuLinkContribution {
  id: string;
  label: string;
  href: string;
  order?: number;
  icon?: ComponentType<ProfileMenuIconProps>;
  /** Workspace roles the link is shown for; all roles when omitted. */
  roles?: readonly string[];
}

export interface WebContributions {
  lessonCardActions: readonly LessonCardActionContribution[];
  profileMenuLinks: readonly ProfileMenuLinkContribution[];
}

type Listener = () => void;

interface ContributionStore {
  snapshot: WebContributions;
  listeners: Set<Listener>;
}

// One store per page, shared even when the module is bundled twice (core
// and a plugin can end up with separate copies in development).
const STORE_KEY = Symbol.for("veolms.web-core.contributions");

function getStore(): ContributionStore {
  const host = globalThis as typeof globalThis & {
    [STORE_KEY]?: ContributionStore;
  };
  host[STORE_KEY] ??= {
    snapshot: { lessonCardActions: [], profileMenuLinks: [] },
    listeners: new Set(),
  };
  return host[STORE_KEY];
}

function byOrder<T extends { order?: number }>(a: T, b: T): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function update(next: Partial<WebContributions>): void {
  const store = getStore();
  store.snapshot = { ...store.snapshot, ...next };
  for (const listener of store.listeners) listener();
}

/**
 * Adds (or replaces, by id) an action button on every lesson card.
 * Returns a function that removes it again.
 */
export function registerLessonCardAction(
  contribution: LessonCardActionContribution,
): () => void {
  const others = getStore().snapshot.lessonCardActions.filter(
    (entry) => entry.id !== contribution.id,
  );
  update({ lessonCardActions: [...others, contribution].sort(byOrder) });
  return () =>
    update({
      lessonCardActions: getStore().snapshot.lessonCardActions.filter(
        (entry) => entry !== contribution,
      ),
    });
}

/**
 * Adds (or replaces, by id) a link in the profile menu's account section.
 * Returns a function that removes it again.
 */
export function registerProfileMenuLink(
  contribution: ProfileMenuLinkContribution,
): () => void {
  const others = getStore().snapshot.profileMenuLinks.filter(
    (entry) => entry.id !== contribution.id,
  );
  update({ profileMenuLinks: [...others, contribution].sort(byOrder) });
  return () =>
    update({
      profileMenuLinks: getStore().snapshot.profileMenuLinks.filter(
        (entry) => entry !== contribution,
      ),
    });
}

/** Current contributions; the same object until something changes. */
export function getWebContributions(): WebContributions {
  return getStore().snapshot;
}

/** For `useSyncExternalStore`: calls `listener` whenever contributions change. */
export function subscribeWebContributions(listener: Listener): () => void {
  const { listeners } = getStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
