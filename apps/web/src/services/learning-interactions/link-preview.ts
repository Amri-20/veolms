import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  isValidPreviewHost,
  isValidPreviewUrl,
  normalizePreviewUrl,
  type LinkPreviewResponse,
} from "@veolms/contracts";
import { learningInteractionsService } from "./learning-interactions.service";
import { learningInteractionKeys } from "./learning-interactions.keys";

export {
  isValidPreviewHost,
  isValidPreviewUrl,
  normalizePreviewUrl,
  type LinkPreviewResponse,
};

export interface UseLinkPreviewOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useLinkPreview(
  url?: string | null,
  options?: UseLinkPreviewOptions,
) {
  const debounceMs = options?.debounceMs ?? 500;
  const normalizedUrl = url ? normalizePreviewUrl(url.trim()) : null;
  const isInitialValid = Boolean(
    normalizedUrl && isValidPreviewUrl(normalizedUrl),
  );

  const [debouncedUrl, setDebouncedUrl] = useState<string | null>(() => {
    return isInitialValid ? normalizedUrl : null;
  });

  useEffect(() => {
    if (!normalizedUrl || !isValidPreviewUrl(normalizedUrl)) {
      setDebouncedUrl(null);
      return;
    }

    if (debounceMs <= 0) {
      setDebouncedUrl(normalizedUrl);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedUrl(normalizedUrl);
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [normalizedUrl, debounceMs]);

  const activeQueryUrl = debouncedUrl;
  const isValidUrl = Boolean(
    activeQueryUrl && isValidPreviewUrl(activeQueryUrl),
  );

  return useQuery<LinkPreviewResponse>({
    queryKey: learningInteractionKeys.linkPreview(activeQueryUrl || ""),
    queryFn: () => learningInteractionsService.getLinkPreview(activeQueryUrl!),
    enabled: isValidUrl && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    // The API already makes its bounded retry and caches its fallback result.
    // Retrying here would repeat it every time an expanded Hub card remounts.
    retry: false,
    retryOnMount: false,
  });
}

const URL_REGEX =
  /(?:https?:\/\/[^\s<>"'`]+|\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}(?::\d+)?(?:\/[^\s<>"'`]*)?)/gi;

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const regex = new RegExp(URL_REGEX.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0]?.replace(/[.,;:!?)]+$/, "");
    if (!raw) continue;
    const normalized = normalizePreviewUrl(raw);
    try {
      const parsed = new URL(normalized);
      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        isValidPreviewHost(parsed.hostname)
      ) {
        return parsed.toString();
      }
    } catch {
      // Continue to next match
    }
  }
  return null;
}
