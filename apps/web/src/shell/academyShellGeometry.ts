import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_CONTENT_REVEAL_DISTANCE,
  MOBILE_DRAWER_INITIAL_SNAP_POINT,
  SIDEBAR_SWIPE_EXCLUSION_SELECTOR,
  SIDEBAR_DOCK_VERTICAL_MAX_WIDTH,
} from "./academyShellConstants";

export const getLearningMobileMenuSnapPoint = () => {
  const player = document.querySelector<HTMLElement>(
    ".learning-workspace__player-wrap",
  );
  const viewportHeight = window.innerHeight;
  if (!player || viewportHeight <= 0) return MOBILE_DRAWER_INITIAL_SNAP_POINT;

  const playerBottom = Math.max(
    0,
    Math.min(viewportHeight, player.getBoundingClientRect().bottom),
  );
  return Math.max(
    0.2,
    Math.min(0.92, (viewportHeight - playerBottom) / viewportHeight),
  );
};

export const isSidebarSwipeExcludedTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest(SIDEBAR_SWIPE_EXCLUSION_SELECTOR));

export const isFocusedSidebarSwipeInput = (target: EventTarget | null) => {
  const focused = document.activeElement;
  if (
    focused instanceof HTMLElement &&
    focused.matches(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  )
    return true;
  if (!(target instanceof Element)) return false;
  const editable = target.closest<HTMLElement>(
    'input:not([type="range"]), textarea, select, [contenteditable]:not([contenteditable="false"])',
  );
  if (!editable) return false;
  return focused === editable || Boolean(focused && editable.contains(focused));
};

/**
 * Everything a dragged sidebar's width decides about what is rendered: which
 * way the appearance dock lies, whether the sidebar's content has come into
 * view, and whether it is down to the collapsed rail. Two widths with the
 * same key render the same shell.
 */
export const getSidebarResizeRenderKey = (width: number) =>
  (width > SIDEBAR_DOCK_VERTICAL_MAX_WIDTH ? 4 : 0) +
  (width >= SIDEBAR_COLLAPSED_WIDTH + SIDEBAR_CONTENT_REVEAL_DISTANCE ? 2 : 0) +
  (width <= SIDEBAR_COLLAPSED_WIDTH ? 1 : 0);

export const subscribeToNothing = () => () => {};

/** Names a page shown in the shell by what it is and where. */
export const getSurfacePageKey = (surfacePage: string, pathname = "") =>
  `${surfacePage}:${pathname.replace(/(.)\/+$/, "$1")}`;
