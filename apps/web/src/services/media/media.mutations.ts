import { useMutation } from "@tanstack/react-query";
import type { PresignMediaRequest } from "@veolms/contracts";
import { uploadVideoResumable } from "./resumable-upload";
import { type UploadProgressHandler } from "./media.service";

export interface VideoUploadInput {
  file: File;
  visibility?: PresignMediaRequest["visibility"];
  onProgress?: UploadProgressHandler;
  signal?: AbortSignal;
}

/**
 * Uploads a video in resumable parts and confirms it, which queues its
 * processing (transcoding). Resolves with the new media asset's id; its
 * processing can then be followed with `useVideoJobProgress`.
 *
 * An interrupted upload leaves a local checkpoint behind, so choosing the
 * same file again continues from the parts storage already accepted.
 */
export function useUploadVideo() {
  return useMutation<string, Error, VideoUploadInput>({
    mutationFn: async ({ file, visibility, onProgress, signal }) => {
      const result = await uploadVideoResumable({
        file,
        visibility,
        onProgress,
        signal,
      });
      return result.mediaAssetId;
    },
  });
}
