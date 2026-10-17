import { readResumePosition } from "./lessonPlayerPersistence";
import {
  createLearningHlsRequestFilter,
  LEARNING_HLS_MIME_TYPE,
  LEARNING_HLS_STREAMING,
  toAbsoluteLearningMediaUrl,
} from "./learningHlsConstants";

function shouldResumeFromLastPosition(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const stored = JSON.parse(
      localStorage.getItem("veolms-learning-preferences") || "{}",
    ) as { resumeFromLastPosition?: unknown };
    if (typeof stored.resumeFromLastPosition === "boolean") {
      return stored.resumeFromLastPosition;
    }
  } catch {
    // Prefer the product default when preference storage is unavailable.
  }
  return true;
}

// Two segments per stream, at the quality the player would pick anyway (so
// they are the ones it plays), instead of three. The player puts its normal
// settings back once it takes the preload over.
const SPECULATIVE_PRELOAD_STREAMING = {
  segmentPrefetchLimit: 2,
} as const;

export function createLearningHlsPreloadSource(options: {
  manifestUrl: string;
  mediaKey?: string;
  protectedPlayback?: boolean;
  segmentToken?: string;
  segmentTokenExpiresAt?: number;
  /** The master playlist from the bootstrap, served in place of fetching it. */
  inlinedMasterManifest?: string;
  refreshSegmentToken?: () => Promise<{
    token: string;
    expiresAt?: number;
  } | null>;
  /**
   * A guess at the next click (a hovered or next lesson), not the lesson
   * being opened: fetch less of it, so passing over a few lessons competes
   * less with the video playing now.
   */
  speculative?: boolean;
}) {
  const startTime =
    options.mediaKey && shouldResumeFromLastPosition()
      ? readResumePosition(options.mediaKey)
      : 0;
  const isDash = /\.mpd(?:$|[?#])/i.test(options.manifestUrl);
  return {
    id: options.mediaKey,
    src: toAbsoluteLearningMediaUrl(options.manifestUrl),
    type: isDash ? "application/dash+xml" : LEARNING_HLS_MIME_TYPE,
    kind: isDash ? ("dash" as const) : ("hls" as const),
    startTime,
    streaming: options.speculative
      ? {
          ...LEARNING_HLS_STREAMING,
          ...SPECULATIVE_PRELOAD_STREAMING,
        }
      : { ...LEARNING_HLS_STREAMING },
    inlinedManifest: options.inlinedMasterManifest,
    networking: {
      requestFilter: createLearningHlsRequestFilter({
        protectedPlayback: options.protectedPlayback,
        segmentToken: options.segmentToken,
        segmentTokenExpiresAt: options.segmentTokenExpiresAt,
        refreshSegmentToken: options.refreshSegmentToken,
      }),
    },
  };
}
