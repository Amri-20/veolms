import type { DatabaseExecutor } from "@veolms/database";
import * as learningProgressRepository from "./learning-progress.repository.ts";

/**
 * What the courses module may ask of learning progress when a lesson's
 * content changes.
 *
 * A lesson with no video (and no quiz) is finished by opening it: there is
 * nothing in it to watch. When its creator later attaches a video, the
 * learners who opened it earlier would keep a finished lesson they never
 * watched, and their course would go on counting it. Clearing the lesson's
 * progress at that moment puts every learner back to "not started" on it,
 * so the course percentage drops by that lesson until the video is watched.
 *
 * The caller passes its own executor so the progress goes in the same
 * transaction as the change that attaches the video.
 */
export function createLessonProgressResetService() {
  return {
    /** Clears every learner's progress on the lesson; returns the row count. */
    async clearLessonProgress(
      database: DatabaseExecutor,
      lessonId: string,
    ): Promise<number> {
      return await learningProgressRepository.deleteLessonProgress(
        database,
        lessonId,
      );
    },
  };
}

export type LessonProgressResetService = ReturnType<
  typeof createLessonProgressResetService
>;
