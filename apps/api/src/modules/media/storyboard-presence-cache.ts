/**
 * Whether a ready video has a seek-preview storyboard, so the playback
 * bootstrap can name it. Storyboards are made after the video, by a script
 * run off the server, and written to `storyboard/index.json` beside the
 * manifest. The index records the output it was made from (`outputId`), so
 * one left behind by an earlier transcode is not offered for the new one.
 *
 * Kept in memory per output: a found storyboard for a day, a missing one for
 * a few minutes (it may be made at any time). Like the inlined manifest this
 * is an enhancement: a slow or failed read means no storyboard this time,
 * never a failed bootstrap.
 */

export const STORYBOARD_INDEX_FILE = "storyboard/index.json";
export const STORYBOARD_PRESENT_TTL_MS = 24 * 60 * 60 * 1000;
export const STORYBOARD_MISSING_TTL_MS = 5 * 60 * 1000;
export const STORYBOARD_READ_TIMEOUT_MS = 300;
export const STORYBOARD_INDEX_MAX_BYTES = 64 * 1024;
const STORYBOARD_CACHE_MAX_ENTRIES = 2_000;

/** The storyboard index key for a manifest key (its folder + the file). */
export function storyboardIndexKeyFor(manifestKey: string): string {
  const slash = manifestKey.lastIndexOf("/");
  const folder = slash === -1 ? "" : manifestKey.slice(0, slash + 1);
  return `${folder}${STORYBOARD_INDEX_FILE}`;
}

/** True when `text` is a storyboard index made from output `outputId`. */
export function isStoryboardIndexFor(
  text: string | null,
  outputId: string,
): boolean {
  if (!text) return false;
  try {
    const index = JSON.parse(text) as { version?: unknown; outputId?: unknown };
    // An output with no id (older rows) accepts any index in its folder.
    return index.version === 1 && (!outputId || index.outputId === outputId);
  } catch {
    return false;
  }
}

interface Entry {
  present: boolean;
  expiresAt: number;
}

export function createStoryboardPresenceCache(
  options: { now?: () => number; timeoutMs?: number } = {},
) {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? STORYBOARD_READ_TIMEOUT_MS;
  const entries = new Map<string, Entry>();
  const reads = new Map<string, Promise<boolean>>();

  function remember(key: string, present: boolean): void {
    entries.delete(key);
    while (entries.size >= STORYBOARD_CACHE_MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
    entries.set(key, {
      present,
      expiresAt:
        now() +
        (present ? STORYBOARD_PRESENT_TTL_MS : STORYBOARD_MISSING_TTL_MS),
    });
  }

  /**
   * Whether the storyboard at `indexKey` was made from `outputId`. Answers
   * from memory when it can; otherwise reads the index, giving up (false)
   * after the timeout while the read goes on to fill the cache. Never throws.
   */
  async function resolve(
    indexKey: string,
    outputId: string,
    read: (key: string) => Promise<string | null>,
  ): Promise<boolean> {
    const cacheKey = `${indexKey}#${outputId}`;
    const cached = entries.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.present;

    let pending = reads.get(cacheKey);
    if (!pending) {
      pending = read(indexKey)
        .then((text) => {
          const present = isStoryboardIndexFor(text, outputId);
          remember(cacheKey, present);
          return present;
        })
        .catch(() => false)
        .finally(() => reads.delete(cacheKey));
      reads.set(cacheKey, pending);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<boolean>((settle) => {
      timer = setTimeout(() => settle(false), timeoutMs);
    });
    try {
      return await Promise.race([pending, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  return { resolve, clear: () => entries.clear() };
}
