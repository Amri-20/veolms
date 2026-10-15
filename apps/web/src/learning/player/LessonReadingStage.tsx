import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BookOpenText } from "@phosphor-icons/react/BookOpenText";
import { cn } from "../../lib/utils";
import { DiscussionMarkdown } from "../discussion-editor/DiscussionMarkdown";
import { createDiscussionDraft } from "../discussion-editor/types";
import { LESSON_READING_SCROLL_ATTRIBUTE } from "./useLessonPlayerMinimizeGesture";

/**
 * What the player's shell wears while it holds a reading, in place of the
 * black of a video: the theme's darkest ground with some of the accent in
 * it at the top, fading down to a deeper shade of the same ground. Both ends
 * are made from the theme's own colours, so it follows the palette, by day
 * as well.
 */
export const lessonReadingShellClasses =
  "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent)_12%,var(--canvas)),color-mix(in_srgb,var(--canvas)_82%,black)_78%)]! [:root[data-theme=light]_&]:bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent)_10%,var(--canvas)),var(--canvas)_78%)]!";

/**
 * A reading lesson, in the place a video lesson's video takes. The text is
 * the lesson's description (a lesson has no other field for it), written in
 * the same Markdown the description card shows.
 *
 * The player keeps a video's shape (or whatever height it has been dragged
 * to), so a text longer than that scrolls inside it. The player's host
 * sends the wheel to the page behind it, and makes an exception for this
 * box while it has further to scroll (see `PersistentLearningPlayerHost`).
 */
/**
 * How the full player last showed its reading: its size and how far it was
 * scrolled. The mini player draws the same picture, scaled down, as a video
 * keeps its frame when it is minimized.
 */
const readingFrame = { width: 640, height: 360, scrollTop: 0 };

/** The full player's picture of its reading, for the minimize request. */
export function getLessonReadingFrame() {
  return { frameWidth: readingFrame.width, scrollTop: readingFrame.scrollTop };
}

export function LessonReadingStage({
  article,
  minimizeControl,
  clearBottom = false,
  initialScrollTop = 0,
}: {
  article: string;
  /**
   * The minimize button. It stands at the start of the reading, in the
   * label's row, and scrolls away with the text.
   */
  minimizeControl?: ReactNode;
  /** Leave room for the full screen buttons in the bottom corner. */
  clearBottom?: boolean;
  /** Where the text starts (the miniature shows the full player's place). */
  initialScrollTop?: number;
}) {
  const content = useMemo(() => createDiscussionDraft(article), [article]);
  // At the top of the text a finger moving down has nothing to scroll: the
  // browser is left only the upward swipes there, and the downward one goes
  // to the player, which puts the reading away like a video.
  const [atTop, setAtTop] = useState(initialScrollTop <= 0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The full player's reading (the one with the minimize button) keeps the
  // frame up to date for the miniature.
  const recordsFrame = Boolean(minimizeControl);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    if (initialScrollTop > 0) scroller.scrollTop = initialScrollTop;
    if (!recordsFrame || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const record = () => {
      if (scroller.clientWidth <= 0) return;
      readingFrame.width = scroller.offsetWidth;
      readingFrame.height = scroller.offsetHeight;
    };
    record();
    const sizes = new ResizeObserver(record);
    sizes.observe(scroller);
    return () => sizes.disconnect();
  }, [initialScrollTop, recordsFrame]);

  return (
    <div
      className={cn(
        // The same side margins at every width, so the text starts under the
        // minimize arrow on a laptop as it does on a phone.
        "absolute inset-0 overflow-y-auto border-b border-[color-mix(in_srgb,var(--text)_12%,transparent)] px-5 py-6 [scrollbar-width:thin]",
        minimizeControl && "pt-2",
        minimizeControl && atTop ? "touch-pan-down" : "touch-pan-y",
        // A phone turned sideways in full screen: the lines would run the
        // whole long side, so the text keeps well in from both edges.
        "pointer-coarse:landscape:[:fullscreen_&]:px-[max(4rem,calc(env(safe-area-inset-left)+1.25rem))]",
        clearBottom && "pb-14",
      )}
      {...{ [LESSON_READING_SCROLL_ATTRIBUTE]: "" }}
      ref={scrollerRef}
      onScroll={(event) => {
        const { scrollTop } = event.currentTarget;
        setAtTop(scrollTop <= 0);
        if (recordsFrame) readingFrame.scrollTop = scrollTop;
      }}
    >
      {/* Centred over the text. With the minimize button, the label stands
          in the button's row (36px tall); full screen and upright, it sits
          just right of the button instead. */}
      <div
        className={cn(
          "relative mb-2 flex items-center justify-center",
          minimizeControl &&
            "mb-1 h-9 portrait:[:fullscreen_&]:justify-start portrait:[:fullscreen_&]:pl-8",
        )}
      >
        {minimizeControl ? (
          // The control places itself 8px in from its box's corner; this box
          // puts it 8px from the reading's edge, where the arrow lines up
          // with the text under it.
          // While the window moves (minimizing, turning back, expanding)
          // the text travels with it and the button is hidden, as a
          // playing video's controls are.
          <div className="absolute -top-2 -left-5 [[data-learning-player-window-motion]_&]:invisible [[data-learning-player-restore-phase]_&]:invisible [[data-lesson-reading-moving]_&]:invisible">
            {minimizeControl}
          </div>
        ) : null}
        <p className="m-0 flex items-center gap-2 text-base font-semibold text-(--muted) capitalize sm:text-[17px]">
          <BookOpenText size={18} weight="bold" aria-hidden="true" />
          Reading
        </p>
      </div>
      <DiscussionMarkdown
        content={content}
        label="Lesson reading"
        preserveSoftBreaks
        className="max-w-none! wrap-anywhere [&>:first-child]:mt-0"
      />
    </div>
  );
}

/**
 * The reading in the mini player: the full player's picture of it (the same
 * line breaks, scrolled to the same place) scaled down to the small window,
 * as a minimized video keeps its frame. Too small to read; it is a picture,
 * and taps go through it to the window.
 */
export function LessonReadingMiniature({
  article,
  frame: givenFrame,
}: {
  article: string;
  /** The picture to draw (a mini player brought back after a reload). */
  frame?: { width: number; scrollTop: number };
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, height: 0 });
  const [frame] = useState(() => givenFrame ?? { ...readingFrame });
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => {
      if (box.clientWidth <= 0) return;
      const scale = box.clientWidth / frame.width;
      setFit({ scale, height: box.clientHeight / scale });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const sizes = new ResizeObserver(measure);
    sizes.observe(box);
    return () => sizes.disconnect();
  }, [frame.width]);

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {fit.scale > 0 ? (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: frame.width,
            // As tall as the small window holds, at the full width's scale.
            height: fit.height,
            transform: `scale(${fit.scale})`,
          }}
        >
          <LessonReadingStage
            article={article}
            initialScrollTop={frame.scrollTop}
          />
        </div>
      ) : null}
    </div>
  );
}
