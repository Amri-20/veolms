import type { AuthenticatedRequestContext } from "./auth.types.ts";

/**
 * Process-local cache for the per-request authentication context.
 *
 * Every authenticated request used to cost 5 queries in 3 serial round
 * trips before the handler ran (session by token, user selectAll, then
 * TOTP + roles + passkey-count in parallel). Under load this was the
 * dominant per-request database cost — and on a remote database each
 * serial round trip additionally pays a network RTT.
 *
 * Coherence:
 * - Entries live for SESSION_AUTH_CACHE_TTL_MS (short — default 10s).
 * - Every session mutation in session.repository.ts evicts the affected
 *   entries, so logout, revocation, rotation and MFA verification take
 *   effect immediately IN THIS PROCESS regardless of which feature
 *   performed the write (the MFA feature writes via the repository, not
 *   the session service).
 * - Every write to the account itself in authentication.service.ts (profile
 *   and username, avatar, email and phone verification, deactivation)
 *   evicts the user's entries once it has committed, as removing a factor
 *   does in mfa.service.ts. The entry holds the user row that `/auth/me`
 *   answers from, so a write that skips this is served stale to its own
 *   author until the entry expires.
 * - Changes that bypass both (role grants, writes made by the CLI or from
 *   OTHER instances) become visible when the entry expires — bounded by the
 *   TTL. Set the TTL to 0 to disable caching entirely.
 */
const MAX_ENTRIES = 5_000;

interface CacheEntry {
  expiresAtMs: number;
  context: AuthenticatedRequestContext;
}

const entries = new Map<string, CacheEntry>();

export function getCachedAuthContext(
  tokenHash: string,
  ttlMs: number,
): AuthenticatedRequestContext | null {
  if (ttlMs <= 0) return null;
  const entry = entries.get(tokenHash);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    entries.delete(tokenHash);
    return null;
  }
  return entry.context;
}

export function setCachedAuthContext(
  tokenHash: string,
  context: AuthenticatedRequestContext,
  ttlMs: number,
): void {
  if (ttlMs <= 0) return;
  if (entries.size >= MAX_ENTRIES && !entries.has(tokenHash)) {
    // Drop the oldest entry (Map preserves insertion order).
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
  entries.set(tokenHash, {
    expiresAtMs: Date.now() + ttlMs,
    context,
  });
}

/** Evict by session id — e.g. one session revoked or MFA-verified. */
export function evictCachedSession(sessionId: string): void {
  for (const [key, entry] of entries) {
    if (entry.context.session.id === sessionId) entries.delete(key);
  }
}

/** Evict every cached session of a user — e.g. revoke-all, deactivation. */
export function evictCachedUserSessions(userId: string): void {
  for (const [key, entry] of entries) {
    if (entry.context.session.user_id === userId) entries.delete(key);
  }
}

/** Evict everything — bulk mutations (retention purge). */
export function clearSessionAuthCache(): void {
  entries.clear();
}
