import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthenticatedRequestContext } from "./auth.types.ts";
import {
  clearSessionAuthCache,
  evictCachedUserSessions,
  getCachedAuthContext,
  setCachedAuthContext,
} from "./session-auth-cache.ts";

const TTL_MS = 10_000;

/** A cached sign-in: only the fields the cache itself reads are real. */
function context(
  userId: string,
  sessionId: string,
  displayName: string,
): AuthenticatedRequestContext {
  return {
    user: { id: userId, displayName },
    session: { id: sessionId, user_id: userId },
  } as unknown as AuthenticatedRequestContext;
}

await test("a saved account change drops every cached session of that account", () => {
  clearSessionAuthCache();
  setCachedAuthContext("token-a1", context("user-a", "s-a1", "Old"), TTL_MS);
  setCachedAuthContext("token-a2", context("user-a", "s-a2", "Old"), TTL_MS);
  setCachedAuthContext("token-b1", context("user-b", "s-b1", "Bee"), TTL_MS);

  // What authentication.service.ts does after a profile, avatar, email or
  // phone write commits.
  evictCachedUserSessions("user-a");

  // The session that made the change and the account's other session both
  // read the account again on their next request.
  assert.equal(getCachedAuthContext("token-a1", TTL_MS), null);
  assert.equal(getCachedAuthContext("token-a2", TTL_MS), null);
});

await test("another account's cached session is left alone", () => {
  clearSessionAuthCache();
  setCachedAuthContext("token-a1", context("user-a", "s-a1", "Old"), TTL_MS);
  setCachedAuthContext("token-b1", context("user-b", "s-b1", "Bee"), TTL_MS);

  evictCachedUserSessions("user-a");

  assert.equal(
    getCachedAuthContext("token-b1", TTL_MS)?.user.displayName,
    "Bee",
  );
});

await test("a TTL of 0 caches nothing", () => {
  clearSessionAuthCache();
  setCachedAuthContext("token-a1", context("user-a", "s-a1", "Old"), 0);
  assert.equal(getCachedAuthContext("token-a1", TTL_MS), null);
});
