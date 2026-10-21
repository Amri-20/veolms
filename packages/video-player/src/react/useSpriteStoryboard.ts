import { useEffect, useRef } from "react";
import type { VideoNetworkRequest, VideoSource } from "../core/types";
import { SpriteStoryboardLoader } from "../storyboard/SpriteStoryboardLoader";
import { usePlayerController } from "./context";
import { usePlayerState } from "./usePlayerState";

/**
 * Below this pace (seconds of video per second of pointer movement) the
 * viewer is reading the timeline rather than sweeping across it, and the
 * detail sheet under the pointer is fetched.
 */
const SLOW_PREVIEW_SECONDS_PER_SECOND = 30;
/** A pointer resting this long fetches the detail sheet under it. */
const PREVIEW_DWELL_MS = 150;
/** Pace is measured over at least this much time, not event to event. */
const PREVIEW_PACE_WINDOW_MS = 80;
/**
 * How long the lesson plays before a preview video is filled in behind it,
 * so the fill never competes with the start of playback.
 */
const BACKGROUND_FILL_DELAY_MS = 4_000;

function resolveDocumentUrl(url: string): string {
  if (typeof document === "undefined") return url;
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

/**
 * Feeds the player's storyboard from a sprite storyboard index
 * (`SpriteStoryboardIndex`): the coarse level on the first hover or drag,
 * detail sheets where the pointer slows down or stops. Sheet requests go
 * through the source's request filter as `thumbnail` requests, which is
 * where an application adds its playback token.
 */
export function useSpriteStoryboard(
  url: string | undefined,
  onError?: (error: unknown) => void,
): void {
  const controller = usePlayerController();
  const source = usePlayerState(({ media }) => media.source);
  // Read when a sheet is requested, so a renewed token is used without
  // starting the storyboard over.
  const sourceRef = useRef<VideoSource | null>(source);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    sourceRef.current = source;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!url) return undefined;
    const loader = new SpriteStoryboardLoader({
      indexUrl: resolveDocumentUrl(url),
      prepareUrl: async (requestUrl) => {
        const request: VideoNetworkRequest = {
          type: "thumbnail",
          uris: [requestUrl],
          method: "GET",
          headers: {},
          body: null,
          allowCrossSiteCredentials: false,
        };
        await sourceRef.current?.networking?.requestFilter?.(request);
        return request.uris[0] ?? requestUrl;
      },
      onFrames: (frames) => controller.setStoryboard(frames),
      onError: (error) => onErrorRef.current?.(error),
    });

    let anchor: { time: number; at: number } | null = null;
    let lastTime: number | null = null;
    let dwellTimer: number | undefined;
    let fillTimer: number | undefined;
    let filled = false;
    // Fetches a preview video (when the storyboard has one) behind the
    // lesson at low priority, once.
    const fill = (from: number) => {
      if (filled) return;
      filled = true;
      window.clearTimeout(fillTimer);
      loader.fillInBackground(from);
    };
    const unsubscribe = controller.subscribe(() => {
      const snapshot = controller.getSnapshot();
      // After the lesson has played a few seconds, so it never competes
      // with the start of playback...
      if (!filled && fillTimer === undefined && snapshot.media.playing) {
        fillTimer = window.setTimeout(
          () => fill(controller.getSnapshot().media.currentTime),
          BACKGROUND_FILL_DELAY_MS,
        );
      }
      const { previewTime } = snapshot.ui;
      if (previewTime === null || previewTime === lastTime) return;
      lastTime = previewTime;
      void loader.start();
      // ...or at once when the viewer points at the timeline: previews are
      // wanted now, starting from there.
      fill(previewTime);

      const now = performance.now();
      // A pointer that rested before moving again starts a new measure.
      if (anchor && now - anchor.at > PREVIEW_PACE_WINDOW_MS * 3) anchor = null;
      const pace =
        anchor && now > anchor.at
          ? (Math.abs(previewTime - anchor.time) / (now - anchor.at)) * 1_000
          : Number.POSITIVE_INFINITY;
      if (!anchor || now - anchor.at >= PREVIEW_PACE_WINDOW_MS) {
        anchor = { time: previewTime, at: now };
      }
      window.clearTimeout(dwellTimer);
      if (pace <= SLOW_PREVIEW_SECONDS_PER_SECOND) {
        loader.requestDetail(previewTime);
      } else {
        dwellTimer = window.setTimeout(
          () => loader.requestDetail(previewTime),
          PREVIEW_DWELL_MS,
        );
      }
    });

    return () => {
      unsubscribe();
      window.clearTimeout(dwellTimer);
      window.clearTimeout(fillTimer);
      loader.destroy();
      controller.setStoryboard([]);
    };
  }, [controller, url]);
}
