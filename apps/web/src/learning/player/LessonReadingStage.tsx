import { useMemo } from "react";
import { BookOpenText } from "@phosphor-icons/react/BookOpenText";
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
export function LessonReadingStage({ article }: { article: string }) {
  const content = useMemo(() => createDiscussionDraft(article), [article]);

  return (
    <div
      className="absolute inset-0 touch-pan-y overflow-y-auto border-b border-[color-mix(in_srgb,var(--text)_12%,transparent)] px-5 py-6 [scrollbar-width:thin] sm:px-8"
      {...{ [LESSON_READING_SCROLL_ATTRIBUTE]: "" }}
    >
      <p className="mt-0 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-(--muted) uppercase">
        <BookOpenText size={15} weight="bold" aria-hidden="true" />
        Reading
      </p>
      <DiscussionMarkdown
        content={content}
        label="Lesson reading"
        preserveSoftBreaks
        className="wrap-anywhere [&>:first-child]:mt-0"
      />
    </div>
  );
}
