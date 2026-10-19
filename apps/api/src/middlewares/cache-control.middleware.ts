import type { FastifyInstance } from "fastify";

/**
 * What an API response says about caching when its route says nothing.
 *
 * Most answers depend on who asks: a course overview lists unpublished
 * lessons to the course's admin and only published ones to a learner, and
 * lesson numbers are positions in that list. With no `Cache-Control`, a CDN
 * in front of the API (Cloudflare, for procodrr.dev) kept the first answer
 * it saw for up to two hours and gave it to everyone, signed in or not. A
 * learner then got an admin's curriculum, and every lesson after an
 * unpublished one played the next lesson's video. Routes that really are
 * the same for everyone set their own header and keep it.
 *
 * Call it before the routes are registered.
 */
export function preventSharedCaching(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply, payload) => {
    if (!reply.hasHeader("cache-control")) {
      reply.header("Cache-Control", "private, no-store");
    }
    return payload;
  });
}
