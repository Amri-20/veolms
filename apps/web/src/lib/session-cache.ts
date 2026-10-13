/**
 * Answers the API gives every visitor alike and that rarely change, kept for
 * the life of the tab so a reload or a return to the page does not ask again.
 *
 * Only for public data: nothing here is cleared at login or logout. It is
 * read after the first render (inside a query function), never during it, so
 * a prerendered page hydrates against the markup it was built with.
 */

interface SessionCacheEntry<T> {
  value: T;
  savedAt: number;
}

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
    return null;
  }
};

export function readSessionCache<T>(
  key: string,
  maxAgeMs: number,
  isValid: (value: unknown) => value is T,
): SessionCacheEntry<T> | undefined {
  try {
    const saved: unknown = JSON.parse(
      getSessionStorage()?.getItem(key) ?? "null",
    );
    if (!saved || typeof saved !== "object") return undefined;
    const { value, savedAt } = saved as Record<string, unknown>;
    if (typeof savedAt !== "number" || !isValid(value)) return undefined;
    const age = Date.now() - savedAt;
    // A clock that was set back would otherwise keep the copy for good.
    if (age < 0 || age > maxAgeMs) return undefined;
    return { value, savedAt };
  } catch {
    return undefined;
  }
}

export function writeSessionCache<T>(key: string, value: T): void {
  try {
    getSessionStorage()?.setItem(
      key,
      JSON.stringify({
        value,
        savedAt: Date.now(),
      } satisfies SessionCacheEntry<T>),
    );
  } catch {
    // A full or unavailable store only means the next load asks again.
  }
}

export function clearSessionCache(key: string): void {
  try {
    getSessionStorage()?.removeItem(key);
  } catch {
    // Nothing was kept, so there is nothing to clear.
  }
}
