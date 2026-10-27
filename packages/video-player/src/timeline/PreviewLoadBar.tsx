import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { playerRectOf } from "../react/pageFullscreen";
import { usePlayerState } from "../react/usePlayerState";
import {
  getPreviewAvailability,
  subscribePreviewAvailability,
  type PreviewAvailability,
} from "../storyboard/spriteSheetStore";
import { timeToPositionPercent } from "./timelineMath";

const NO_AVAILABILITY = () => null;

function isLoadedAt(availability: PreviewAvailability, time: number): boolean {
  return availability.loaded.some(
    ([start, end]) => time >= start && time < end,
  );
}

/**
 * Lines the bar up with the timeline: the same left and right edges, in
 * the player's own axes (a page full screen can turn the player a quarter).
 * The timeline sits some 12px in from the player's sides on larger screens
 * and runs edge to edge on phones.
 */
function useTimelineSpan(
  bar: HTMLDivElement | null,
  active: boolean,
): { left: number; right: number } | null {
  const [span, setSpan] = useState<{ left: number; right: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const frame = bar?.parentElement;
    const timeline = bar
      ?.closest("[data-video-player-root]")
      ?.querySelector<HTMLElement>("[data-video-player-timeline]");
    if (!active || !frame || !timeline) return undefined;
    const measure = () => {
      const outer = playerRectOf(frame);
      const inner = playerRectOf(timeline);
      const next = {
        left: Math.round(inner.left - outer.left),
        right: Math.round(outer.left + outer.width - inner.left - inner.width),
      };
      setSpan((previous) =>
        previous?.left === next.left && previous.right === next.right
          ? previous
          : next,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [active, bar]);
  return span;
}

/**
 * Which parts of the lesson have their seek-preview pictures downloaded,
 * as a thin bar along the top edge of the video, over the same span as the
 * timeline: green where they are here, a fainter green where they are on
 * their way. Shown while the timeline is hovered or dragged, fading out a
 * moment after. A small hanging marker shows where the pointer is: green
 * once that moment's picture is here, a pulsing white while it is still
 * coming, so the green can be seen catching up with it.
 *
 * Only for a preview video (fetched part by part where the timeline is
 * used); sheet storyboards have nothing to show here. Not in the mini
 * player.
 */
export function PreviewLoadBar() {
  const [bar, setBar] = useState<HTMLDivElement | null>(null);
  const { active, duration, frameKey, fullscreen, previewTime } =
    usePlayerState(
      ({ media, storyboard, ui }) => ({
        active: ui.previewTime !== null || ui.scrubbing,
        duration: media.duration,
        frameKey: storyboard[0]?.imageUrl ?? null,
        fullscreen: ui.fullscreen,
        previewTime: ui.previewTime,
      }),
      (left, right) =>
        left.active === right.active &&
        left.duration === right.duration &&
        left.frameKey === right.frameKey &&
        left.fullscreen === right.fullscreen &&
        left.previewTime === right.previewTime,
    );
  const availability = useSyncExternalStore(
    subscribePreviewAvailability,
    frameKey ? () => getPreviewAvailability(frameKey) : NO_AVAILABILITY,
    NO_AVAILABILITY,
  );
  const inMiniPlayer = bar?.closest("[data-mini-player-mode]") != null;
  const shown =
    active &&
    availability !== null &&
    !inMiniPlayer &&
    Number.isFinite(duration) &&
    duration > 0;
  const span = useTimelineSpan(bar, shown);

  if (!availability || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const percent = (time: number) => timeToPositionPercent(time, duration);
  const pointerLoaded =
    previewTime !== null && isLoadedAt(availability, previewTime);

  return (
    <div
      ref={setBar}
      aria-hidden="true"
      data-video-player-preview-bar=""
      data-shown={shown && span ? "true" : "false"}
      data-fullscreen={fullscreen ? "true" : "false"}
      className="pointer-events-none absolute top-0 z-2 h-1 bg-black/40 opacity-0 transition-opacity delay-500 duration-300 data-[fullscreen=true]:top-[env(safe-area-inset-top,0px)] data-[shown=true]:opacity-100 data-[shown=true]:delay-0 data-[shown=true]:duration-150"
      style={{ left: span?.left ?? 0, right: span?.right ?? 0 }}
    >
      <div className="absolute inset-x-0 top-0 h-0.75 bg-white/25">
        {availability.loading.map(([start, end]) => (
          <span
            key={`loading-${start}`}
            className="absolute inset-y-0 bg-green-400/35"
            style={{
              left: `${percent(start)}%`,
              width: `${percent(end - start)}%`,
            }}
          />
        ))}
        {availability.loaded.map(([start, end]) => (
          <span
            key={`loaded-${start}`}
            className="absolute inset-y-0 bg-green-400"
            style={{
              left: `${percent(start)}%`,
              width: `${percent(end - start)}%`,
            }}
          />
        ))}
      </div>
      {previewTime !== null ? (
        <span
          data-loaded={pointerLoaded ? "true" : "false"}
          className="absolute top-0 h-2.5 w-1 -translate-x-1/2 animate-[video-player-preview-marker-wait_0.9s_ease-in-out_infinite] rounded-b-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.5)] motion-reduce:animate-none data-[loaded=true]:animate-none data-[loaded=true]:bg-green-300 data-[loaded=true]:shadow-[0_0_6px_rgb(74_222_128/0.9)]"
          style={{ left: `${percent(previewTime)}%` }}
        />
      ) : null}
    </div>
  );
}
