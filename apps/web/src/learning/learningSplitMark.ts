import { useLayoutEffect, type RefObject } from "react";

/**
 * Says on the shell and on its frame that the lesson page's second card (the
 * course content) is in the frame. The stylesheet can find that out by
 * itself, with `:has([data-learning-split-pane])`, and does until this has
 * run (a page built ahead of time has no script yet). But answering it that
 * way means going through everything in the frame, and a long course with
 * its sections open is several thousand elements. A drag of the course
 * content's edge re-styles the shell and the frame on every frame, so every
 * frame paid for that search several times over; with the mark it is one
 * attribute to look at (see learning-split-layout.css).
 */
const SPLIT_MARK = "data-learning-split";

function syncSplitMark(frame: HTMLElement, shell: HTMLElement | null) {
  const shown = frame.querySelector("[data-learning-split-pane]") !== null;
  for (const element of [frame, shell]) {
    if (!element) continue;
    if (!shown) element.removeAttribute(SPLIT_MARK);
    else if (!element.hasAttribute(SPLIT_MARK)) {
      element.setAttribute(SPLIT_MARK, "");
    }
  }
}

/**
 * Keeps the mark true to the page: read from the page itself whenever a
 * pane arrives, changes (theater mode takes the pane away) or leaves, so two
 * panes on the page at once (the lesson and its stand-in) cannot leave it
 * wrong. `shown` is only what makes it look again.
 */
export function useLearningSplitMark(
  paneRef: RefObject<HTMLElement | null>,
  shown: boolean,
) {
  useLayoutEffect(() => {
    const frame = paneRef.current?.closest<HTMLElement>(".courses-main-frame");
    if (!frame) return undefined;
    const shell = frame.closest<HTMLElement>(".courses-app");
    syncSplitMark(frame, shell);
    // On leaving, the pane is still in the page while this runs; it is gone
    // by the time the microtask does.
    return () => queueMicrotask(() => syncSplitMark(frame, shell));
  }, [paneRef, shown]);
}
