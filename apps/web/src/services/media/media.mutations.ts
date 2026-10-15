import { useMutation } from "@tanstack/react-query";
import type { PresignMediaRequest } from "@veolms/contracts";
import { mediaService, type UploadProgressHandler } from "./media.service";

export interface VideoUploadInput {
  file: File;
  visibility?: PresignMediaRequest["visibility"];
  onProgress?: UploadProgressHandler;
  signal?: AbortSignal;
}

/**
 * Uploads a video straight to storage and confirms it, which queues its
 * processing (transcoding). Resolves with the new media asset's id; its
 * processing can then be followed with `useVideoJobProgress`.
 */
export function useUploadVideo() {
  return useMutation<string, Error, VideoUploadInput>({
    mutationFn: async ({ file, visibility, onProgress, signal }) => {
      const presigned = await mediaService.presignVideoUpload({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        visibility,
      });
      await mediaService.uploadFileToPresignedUrl(
        presigned.uploadUrl,
        file,
        onProgress,
        signal,
      );
      await mediaService.confirmUpload(presigned.mediaAssetId);
      return presigned.mediaAssetId;
    },
  });
}
