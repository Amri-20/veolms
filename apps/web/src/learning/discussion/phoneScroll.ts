import React, { useEffect, useRef } from "react";

/**
 * Where each lesson's phone discussion was scrolled to, for as long as the
 * app stays open. On a phone the lesson's description and comments scroll in
 * their own area under the video, which is rebuilt whenever the lesson is
 * left and reopened (minimizing the player and expanding it again does
 * that), so its position is kept here rather than in the element.
 */
const phoneDiscussionScrollPositions = new Map<string, number>();

export function usePhoneDiscussionScrollMemory({
  viewportRef,
  memoryKey,
  enabled,
  contentReady,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  memoryKey: string | undefined;
  enabled: boolean;
  /** The lesson and its comments are in, so the page is its real height. */
  contentReady: boolean;
}) {
  const restoringRef = useRef(false);
  const restoredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !memoryKey || !enabled) return undefined;
    const remember = () => {
      // Its own attempts to get back to the old position are not the reader
      // scrolling, and must not overwrite what is being restored.
      if (restoringRef.current) return;
      phoneDiscussionScrollPositions.set(memoryKey, viewport.scrollTop);
    };
    viewport.addEventListener("scroll", remember, { passive: true });
    return () => viewport.removeEventListener("scroll", remember);
  }, [contentReady, enabled, memoryKey, viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (
      !viewport ||
      !memoryKey ||
      !enabled ||
      !contentReady ||
      restoredKeyRef.current === memoryKey
    ) {
      return undefined;
    }
    restoredKeyRef.current = memoryKey;
    const remembered = phoneDiscussionScrollPositions.get(memoryKey) ?? 0;
    if (remembered < 1) return undefined;

    // The list measures its comments as they appear, so the remembered
    // position may not be reachable at once. Keep going back to it until it
    // holds, the reader takes over, or a couple of seconds have passed.
    const interactions = ["wheel", "touchstart", "keydown", "pointerdown"];
    let timer: number | undefined;
    let attempts = 0;
    restoringRef.current = true;
    const stop = () => {
      restoringRef.current = false;
      window.clearTimeout(timer);
      for (const name of interactions) {
        window.removeEventListener(name, stop, true);
      }
    };
    const restore = () => {
      viewport.scrollTop = remembered;
      attempts += 1;
      if (attempts < 16) timer = window.setTimeout(restore, 120);
      else stop();
    };
    for (const name of interactions) {
      window.addEventListener(name, stop, { capture: true, passive: true });
    }
    restore();
    return stop;
  }, [contentReady, enabled, memoryKey, viewportRef]);
}
