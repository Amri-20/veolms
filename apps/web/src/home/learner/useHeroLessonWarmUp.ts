import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { prefetchCoursePage } from "../../services/courses";
import { prefetchLearningProgressSnapshot } from "../../services/learning-progress";

/** How many segments past the learner's place the lesson's video fetches. */
const HERO_LESSON_SEGMENTS = 3;

/**
 * Gets the lesson the home page leads with ready before the learner presses
 * Enter, so it opens as if they had never left it: once the page is idle,
 * the course's curriculum file and access answer (what the lesson page asks
 * for first) and the lesson's video, its start-up answer and a few segments
 * from where the learner left off (`preloadLessonPlayback`, which also loads
 * the video engine), the learner's progress in the course (the lesson page
 * waits for it before starting the video), and the player's own code, which
 * the lesson page loads only once it is open. The lesson page's code and
 * stylesheets are fetched by `<PrefetchPageLinks>` beside the hero (see
 * LearnerHome).
 *
 * Skipped on a connection that asks to save data (preloadLessonPlayback
 * fetches only the small start-up answer then). Nothing is cancelled when
 * the learner goes elsewhere: the video preload is the page's one
 * speculative preload, which the next one (a hovered lesson) replaces.
 */
export function useHeroLessonWarmUp(
  lesson: { courseSlug: string; lessonNumber: number } | null,
) {
  const queryClient = useQueryClient();
  const courseSlug = lesson?.courseSlug;
  const lessonNumber = lesson?.lessonNumber;

  useEffect(() => {
    if (!courseSlug || !lessonNumber) return undefined;
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      void prefetchCoursePage(queryClient, courseSlug);
      void prefetchLearningProgressSnapshot(queryClient, courseSlug);
      void import("../../learning/player/PersistentLearningPlayerHost");
      void import("../../learning/earlyHlsPreload").then(
        ({ preloadLessonPlayback }) => {
          if (cancelled) return;
          void preloadLessonPlayback(courseSlug, lessonNumber, {
            segments: HERO_LESSON_SEGMENTS,
          });
        },
      );
    };
    // After what the home page itself needs: its own requests come first.
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(handle);
      };
    }
    const timer = window.setTimeout(warm, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [courseSlug, lessonNumber, queryClient]);
}
