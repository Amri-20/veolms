import { useEffect, useMemo, useState } from "react";
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

const GENERIC_PATH_PARTS =
  /^(?:index|readme|notes?|main|default|home|watch|view|page|post|p)$/i;

/** A file name or path part as words: "01_What-Are-Types%3F" → "01 What Are Types?". */
function readablePathPart(part: string): string {
  let text = part;
  try {
    text = decodeURIComponent(part);
  } catch {
    // Kept as written when it is not valid percent-encoding.
  }
  return text
    .replace(/\.(md|html?|php|aspx?)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A preview made from the link alone, with no request: the site, the last
 * part of the path as a title, and the parts before it as a trail
 * ("evosKaushik › Typescript Notes › …"). Nothing about the page is fetched,
 * so there is no image or summary.
 */
export function buildLinkPreviewFromUrl(
  url: string,
): LinkPreviewResponse | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const siteName = parsed.hostname.replace(/^www\./i, "");
  const parts = parsed.pathname
    .split("/")
    .filter(Boolean)
    // GitHub's "blob/main" and "tree/main" say nothing to a reader.
    .filter(
      (part, index, all) =>
        !(
          siteName === "github.com" &&
          (((part === "blob" || part === "tree") && index === 2) ||
            (index === 3 && (all[2] === "blob" || all[2] === "tree")))
        ),
    )
    // A language code ("en-US") says nothing about the page.
    .filter((part) => !/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(part))
    .map(readablePathPart)
    .filter(Boolean);
  // A generic last part ("notes.md", "index", "watch") makes a poor title:
  // the part before it names the page better.
  if (parts.length > 1 && GENERIC_PATH_PARTS.test(parts.at(-1)!)) parts.pop();
  const last = parts.at(-1);
  const title = last && !GENERIC_PATH_PARTS.test(last) ? last : siteName;
  const trail = title === siteName ? [] : parts.slice(0, -1);
  const description =
    trail.length > 3
      ? [...trail.slice(0, 2), "…", trail.at(-1)].join(" › ")
      : trail.join(" › ");
  return {
    url: parsed.toString(),
    siteName,
    title,
    description: description || null,
    imageUrl: null,
  };
}

/** `useLinkPreview`'s shape, made from the link alone (no request). */
export function useUrlLinkPreview(
  url?: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const normalizedUrl = url ? normalizePreviewUrl(url.trim()) : null;
  const data = useMemo(
    () =>
      enabled && normalizedUrl && isValidPreviewUrl(normalizedUrl)
        ? (buildLinkPreviewFromUrl(normalizedUrl) ?? undefined)
        : undefined,
    [enabled, normalizedUrl],
  );
  return { data };
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

/**
 * The first link written as one (with "http(s)://" or "www."). A preview
 * made from the link alone needs that: "app.ts" or "console.log" in a post
 * read as web addresses otherwise, and nothing is fetched to tell them
 * apart.
 */
export function extractFirstWrittenUrl(text: string): string | null {
  if (!text) return null;
  const match = /(?:https?:\/\/|www\.)[^\s<>"'`]+/i.exec(text);
  return match ? extractFirstUrl(match[0]) : null;
}
