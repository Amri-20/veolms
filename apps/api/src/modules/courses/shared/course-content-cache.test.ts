import assert from "node:assert/strict";
import { test } from "node:test";
import { createVeoLMSApi } from "@veolms/api-core";

import { config } from "../../../config.ts";
import {
  clearCourseContentCache,
  evictCachedCourseContent,
  getCachedPublicCourseContent,
  type PublicCourseContent,
} from "./course-content-cache.ts";

const COURSE = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const OTHER = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const TTL = 30_000;

function content(courseId: string): PublicCourseContent {
  return {
    courseId,
    overview: { course: { id: courseId } },
    curriculum: { course: { id: courseId }, version: "v" },
  } as unknown as PublicCourseContent;
}

/** A loader that counts how often it ran. */
function counter(courseId: string) {
  const loader = async () => {
    loader.calls += 1;
    return content(courseId);
  };
  loader.calls = 0;
  return loader;
}

function read(key: string, load: () => Promise<PublicCourseContent>) {
  return getCachedPublicCourseContent(key, TTL, load, key === COURSE);
}

await test("a fresh entry is served without loading again, and concurrent misses share one load", async () => {
  clearCourseContentCache();
  const load = counter(COURSE);
  const [first, second] = await Promise.all([
    read(COURSE, load),
    read(COURSE, load),
  ]);
  await read(COURSE, load);
  assert.equal(load.calls, 1);
  assert.equal(first, second);
});

await test("a TTL of 0 never caches", async () => {
  clearCourseContentCache();
  const load = counter(COURSE);
  await getCachedPublicCourseContent(COURSE, 0, load, true);
  await getCachedPublicCourseContent(COURSE, 0, load, true);
  assert.equal(load.calls, 2);
});

await test("an expired entry is loaded again", async (t) => {
  clearCourseContentCache();
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const load = counter(COURSE);
  await read(COURSE, load);
  t.mock.timers.tick(TTL + 1);
  await read(COURSE, load);
  assert.equal(load.calls, 2);
});

await test("a failed load is not kept, so the next request tries again", async () => {
  clearCourseContentCache();
  let calls = 0;
  const failing = async (): Promise<PublicCourseContent> => {
    calls += 1;
    throw new Error("Course not found.");
  };
  await assert.rejects(read("no-such-slug", failing));
  await assert.rejects(read("no-such-slug", failing));
  assert.equal(calls, 2);
});

await test("evicting a course clears it by id and by every slug it was read by, and nothing else", async () => {
  clearCourseContentCache();
  const byId = counter(COURSE);
  const bySlug = counter(COURSE);
  const other = counter(OTHER);
  await read(COURSE, byId);
  await read("course-slug", bySlug);
  await read(OTHER, other);

  evictCachedCourseContent(COURSE.toUpperCase());

  await read(COURSE, byId);
  await read("course-slug", bySlug);
  await read(OTHER, other);
  assert.equal(byId.calls, 2);
  assert.equal(bySlug.calls, 2);
  assert.equal(other.calls, 1);
});

await test("a load still in flight when its course changes is not kept", async () => {
  clearCourseContentCache();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const slow = async () => {
    calls += 1;
    if (calls === 1) await gate;
    return content(COURSE);
  };

  const inFlight = read("course-slug", slow);
  // The slug's course is not known yet, so any course change clears it.
  evictCachedCourseContent(OTHER);
  release();
  await inFlight;
  await read("course-slug", slow);
  assert.equal(calls, 2);
});

/** An app with one route that answers `status`, at the given pattern. */
async function appWithRoute(
  method: "PATCH" | "POST" | "PUT",
  pattern: string,
  status = 200,
) {
  const app = await createVeoLMSApi({
    database: {} as never,
    logger: false,
    config,
    modulesDir: "",
  });
  app.route({
    method,
    url: pattern,
    handler: async (_request, reply) => reply.code(status).send({ ok: true }),
  });
  return app;
}

await test("a successful write to a course clears that course before its response is sent", async () => {
  clearCourseContentCache();
  const course = counter(COURSE);
  const other = counter(OTHER);
  await read(COURSE, course);
  await read(OTHER, other);

  const app = await appWithRoute("PATCH", "/v1/courses/:courseId/details");
  try {
    const response = await app.inject({
      method: "PATCH",
      url: `/v1/courses/${COURSE}/details`,
    });
    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }

  await read(COURSE, course);
  await read(OTHER, other);
  assert.equal(course.calls, 2);
  assert.equal(other.calls, 1);
});

await test("a failed write, or learner activity on a course, clears nothing", async () => {
  clearCourseContentCache();
  const course = counter(COURSE);
  await read(COURSE, course);

  const refused = await appWithRoute(
    "PATCH",
    "/v1/courses/:courseId/details",
    409,
  );
  const thread = await appWithRoute(
    "POST",
    "/v1/courses/:courseId/lessons/:lessonId/threads",
  );
  try {
    await refused.inject({
      method: "PATCH",
      url: `/v1/courses/${COURSE}/details`,
    });
    await thread.inject({
      method: "POST",
      url: `/v1/courses/${COURSE}/lessons/${OTHER}/threads`,
    });
  } finally {
    await refused.close();
    await thread.close();
  }

  await read(COURSE, course);
  assert.equal(course.calls, 1);
});

await test("a site-wide change clears every course", async () => {
  clearCourseContentCache();
  const course = counter(COURSE);
  const other = counter(OTHER);
  await read(COURSE, course);
  await read(OTHER, other);

  const app = await appWithRoute("PUT", "/v1/categories/:categoryId");
  try {
    await app.inject({ method: "PUT", url: `/v1/categories/${OTHER}` });
  } finally {
    await app.close();
  }

  await read(COURSE, course);
  await read(OTHER, other);
  assert.equal(course.calls, 2);
  assert.equal(other.calls, 2);
});
