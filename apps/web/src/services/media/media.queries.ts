import { useQuery } from "@tanstack/react-query";
import { mediaKeys } from "./media.keys";
import { mediaService } from "./media.service";

/** How often a video's processing is checked while it is still going on. */
const VIDEO_PROGRESS_POLL_MS = 3000;

/**
 * A video's processing (transcoding), checked every few seconds until it
 * has finished one way or the other.
 */
export function useVideoJobProgress(mediaAssetId: string | null) {
  return useQuery({
    queryKey: mediaKeys.videoProgress(mediaAssetId ?? ""),
    queryFn: () => mediaService.getVideoJobProgress(mediaAssetId!),
    enabled: Boolean(mediaAssetId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" ||
        status === "failed" ||
        status === "cancelled"
        ? false
        : VIDEO_PROGRESS_POLL_MS;
    },
  });
}

export function useMediaImageVariantManifest(
  mediaAssetId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: mediaKeys.imageVariantManifest(mediaAssetId ?? ""),
    queryFn: () => mediaService.getImageVariantManifest(mediaAssetId!),
    enabled: Boolean(mediaAssetId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
