import fs from "node:fs";
import { fileURLToPath } from "node:url";

import fastifyAutoload from "@fastify/autoload";
import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import type { Database } from "@veolms/database";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import { createCorsMatcher } from "./cors.ts";
import { AppError, registerErrorHandler } from "./errors.ts";
import { registerOpenApi } from "./openapi.ts";
import type {
  CoreAppServices,
  CreateVeoLMSApiOptions,
  PendingCourseStaticRefresh,
} from "./types.ts";

export const API_ROUTE_PREFIX = "/v1";

/**
 * Must stay above the longest path parameter any contract accepts (currently
 * `courseSlugSchema`, at 160). Fastify's default of 100 rejects longer values
 * in the router with a 414 that no route can document.
 */
const MAX_PARAM_LENGTH = 512;

/**
 * Course-scoped routes whose mutations do NOT change the course's public
 * static page and so must not dispatch a page rebuild. Without this, every
 * learner discussion post, moderation action, quiz interaction or progress
 * write under `/courses/<uuid>/...` triggered a GitHub Actions workflow run
 * (each up to ~13 minutes, serialized per process) — CI traffic driven by
 * ordinary learner activity.
 */
const STATIC_REFRESH_EXCLUDED_SEGMENTS =
  /\/(threads|replies|discussions|notes|notes-overview|moderation|reports|quiz-assignment|quiz-assignments|quiz-pricing|quiz-analytics|attempts)(\/|\?|$)/iu;

function getCourseMutation(
  request: FastifyRequest,
): PendingCourseStaticRefresh | null {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return null;
  if (request.routeOptions.url?.includes("static-page-refresh")) return null;
  if (STATIC_REFRESH_EXCLUDED_SEGMENTS.test(request.url)) return null;
  const courseId = request.url.match(
    /\/(?:bin\/)?courses\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|\?|$)/iu,
  )?.[1];
  return courseId ? { courseId } : null;
}

function getCourseSlugFromResponse(payload: unknown): string | undefined {
  if (typeof payload !== "string" && !Buffer.isBuffer(payload))
    return undefined;
  try {
    const serialized = Buffer.isBuffer(payload)
      ? payload.toString("utf8")
      : payload;
    const parsed: unknown = JSON.parse(serialized);
    const envelope =
      parsed && typeof parsed === "object" && "data" in parsed
        ? parsed.data
        : parsed;
    if (!envelope || typeof envelope !== "object") return undefined;
    if (
      "course" in envelope &&
      envelope.course &&
      typeof envelope.course === "object" &&
      "slug" in envelope.course &&
      typeof envelope.course.slug === "string"
    )
      return envelope.course.slug;
    return "slug" in envelope && typeof envelope.slug === "string"
      ? envelope.slug
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Core Fastify application factory.
 *
 * Assembles a fully-configured Fastify instance: middleware, OpenAPI, rate
 * limiting, CORS, cookie support, autoloaded route plugins, background jobs,
 * and any caller-supplied ApiPlugins (for cloud extensions).
 *
 * The calling app (`apps/api/src/app.ts`) owns its own `modules/` directory,
 * services, and background job registration — it passes all of these in via
 * options so api-core has no hard dependency on app-internal paths.
 *
 * Generic over `TDatabase` (default: `Database`) so cloud apps can supply a
 * `Kysely<CloudDatabase>` where `CloudDatabase extends Database`, giving their
 * ApiPlugins full type access to cloud-only tables without widening to `unknown`.
 */
export async function createVeoLMSApi<
  TServices extends CoreAppServices,
  TDatabase extends Database = Database,
  TPaymentEventQueue = unknown,
>(
  options: CreateVeoLMSApiOptions<TServices, TDatabase, TPaymentEventQueue>,
): Promise<FastifyInstance> {
  const {
    database,
    logger = true,
    services: rawServices,
    modulesDir,
    config,
    registerJobs,
    routePluginOptions,
    excludeModules = [],
    plugins = [],
  } = options;

  const app: FastifyInstance = Fastify({
    logger,
    trustProxy: config.TRUST_PROXY,
    routerOptions: { maxParamLength: MAX_PARAM_LENGTH },
  });

  const appServices =
    typeof rawServices === "function"
      ? (rawServices as (app: FastifyInstance) => TServices)(app)
      : (rawServices ??
        ({ email: { close: async () => {} } } as unknown as TServices));

  const pendingCourseRefreshes = new WeakMap<
    FastifyRequest,
    PendingCourseStaticRefresh
  >();

  app.addHook("onSend", async (request, _reply, payload) => {
    const pending = getCourseMutation(request);
    if (pending) {
      const courseSlug = getCourseSlugFromResponse(payload);
      pendingCourseRefreshes.set(request, {
        ...pending,
        ...(courseSlug ? { courseSlug } : {}),
      });
    }
    return payload;
  });

  app.addHook("onResponse", async (request, reply) => {
    if (reply.statusCode < 200 || reply.statusCode >= 300) return;
    const pending = pendingCourseRefreshes.get(request);
    if (!pending || !appServices?.courseStaticPages) return;
    const status = appServices.courseStaticPages.requestRefresh(pending);
    request.log.info(
      { courseId: pending.courseId, refreshStatus: status.status },
      "Queued public course page refresh",
    );
  });

  // Baseline browser protections on every response. A header a route has set
  // for itself (the download routes do) is left as it is.
  const isProduction = config.NODE_ENV === "production";
  app.addHook("onSend", async (_request, reply, payload) => {
    // The declared content type is the one to use: a response is never
    // re-interpreted as a page or a script.
    if (!reply.hasHeader("x-content-type-options")) {
      reply.header("X-Content-Type-Options", "nosniff");
    }
    // API addresses can carry ids and short-lived tokens; they are not
    // passed on to other sites.
    if (!reply.hasHeader("referrer-policy")) {
      reply.header("Referrer-Policy", "no-referrer");
    }
    // Nothing the API serves (its documentation page, an invoice) uses
    // these device features.
    if (!reply.hasHeader("permissions-policy")) {
      reply.header(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
    }
    // Most answers depend on who asks: a course overview lists unpublished
    // lessons to the course's admin and only published ones to a learner,
    // and lesson numbers are positions in that list. With no Cache-Control,
    // the CDN in front of the API (Cloudflare, for procodrr.dev) kept the
    // first answer it saw for up to two hours and gave it to everyone, so
    // learners got an admin's curriculum and every lesson after an
    // unpublished one played the next lesson's video. Routes that are the
    // same for everyone set their own header and keep it.
    if (!reply.hasHeader("cache-control")) {
      reply.header("Cache-Control", "private, no-store");
    }
    if (isProduction && !reply.hasHeader("strict-transport-security")) {
      reply.header("Strict-Transport-Security", "max-age=15552000");
    }
    return payload;
  });

  const responseDelayMs =
    config.NODE_ENV === "production" ? 0 : config.API_RESPONSE_DELAY_MS;
  if (responseDelayMs > 0) {
    app.log.warn(
      { responseDelayMs },
      "API_RESPONSE_DELAY_MS is set: every API call is delayed",
    );
    app.addHook("onRequest", async (request) => {
      // Preflight checks and the docs pages are not API calls.
      if (request.method === "OPTIONS" || request.url.startsWith("/docs")) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, responseDelayMs));
    });
  }

  // Await this: installs Zod compilers and the route-discovery hook that
  // everything registered below depends on.
  await registerOpenApi(app, config);
  registerErrorHandler(app);

  app.addHook("preSerialization", async (request, reply, payload) => {
    if (
      request.url.startsWith("/docs") ||
      request.routeOptions?.config?.rawResponse ||
      reply.getHeader("x-veolms-raw-response") === "true" ||
      Buffer.isBuffer(payload)
    ) {
      return payload;
    }

    if (payload instanceof AppError) {
      return payload.toJSON();
    }

    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      "statusCode" in payload
    ) {
      return payload;
    }

    return {
      success: true,
      statusCode: reply.statusCode,
      data: payload,
    };
  });

  // Response compression (brotli/gzip negotiated from Accept-Encoding).
  // Responses were previously served uncompressed — e.g. the course
  // overview is ~57KB of JSON per request. mime-db gates compressibility,
  // so media/HLS byte streams are left alone, and SSE responses bypass
  // onSend entirely via reply.hijack(). Payloads under the threshold are
  // not worth the CPU.
  await app.register(fastifyCompress, {
    threshold: 1024,
  });

  await app.register(fastifyCookie, {
    secret: config.SESSION_SECRET,
  });

  await app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new AppError(
        429,
        "RATE_LIMIT_EXCEEDED",
        `Too many requests. Please try again in ${context.after}.`,
      ),
  });

  const corsMatcher = createCorsMatcher(config);

  await app.register(fastifyCors, {
    origin: (origin, callback) =>
      callback(null, corsMatcher.isAllowedOrigin(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Bootstrap background jobs and get the payment event queue reference.
  const paymentEventQueue = registerJobs
    ? registerJobs(app, {
        database,
        services: appServices,
      })
    : undefined;

  // Auto-load every *.routes.ts file from the caller's modules directory (or default core modules).
  const resolvedModulesDir =
    modulesDir ??
    fileURLToPath(new URL("../../../apps/api/src/modules", import.meta.url));

  if (fs.existsSync(resolvedModulesDir)) {
    const excludeSet = new Set(excludeModules);

    // When excludeModules is provided, filter by the folder name that directly
    // contains each *.routes.ts file (e.g. "payments" for payments/payments.routes.ts).
    const routeMatchFilter: (path: string) => boolean =
      excludeSet.size === 0
        ? (path) => path.endsWith(".routes.ts")
        : (path) => {
            if (!path.endsWith(".routes.ts")) return false;
            const moduleFolder =
              path.replaceAll("\\", "/").split("/").at(-2) ?? "";
            return !excludeSet.has(moduleFolder);
          };

    await app.register(fastifyAutoload, {
      dir: resolvedModulesDir,
      matchFilter: routeMatchFilter,
      // Disable index-file special-casing so barrel index.ts files next to
      // *.routes.ts files don't silently suppress route registration.
      indexPattern: /^$/,
      dirNameRoutePrefix: false,
      ignorePattern: /(?:^|[\\/])_/u,
      options: routePluginOptions
        ? routePluginOptions(
            paymentEventQueue as TPaymentEventQueue,
            appServices,
          )
        : { prefix: "/v1", database, services: appServices },
    });
  }

  // Release pooled SMTP connections when the server shuts down.

  if (appServices?.email?.close) {
    app.addHook("onClose", async () => {
      await appServices.email.close();
    });
  }

  // The analytics event bus is also reachable from the app, so a plugin
  // can listen without knowing the services container's shape.
  const analyticsEvents = (appServices as { analyticsEvents?: unknown })
    ?.analyticsEvents;
  if (analyticsEvents && !app.hasDecorator("analyticsEvents")) {
    app.decorate("analyticsEvents", analyticsEvents);
  }

  // Register cloud plugins after all core setup is complete.
  for (const plugin of plugins) {
    await plugin.register(app, {
      database,
      services: appServices,
    });
  }

  return app;
}
