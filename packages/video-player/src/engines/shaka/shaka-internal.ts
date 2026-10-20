import type {
  ExternalTextTrack,
  VideoAudioTrack,
  VideoNetworkRequest,
  VideoNetworkResponse,
  VideoQuality,
  VideoRequestKind,
  VideoSource,
  VideoTextTrack,
} from "../../core/types";
import {
  createHlsPlaylistDataUri,
  isInlinableHlsPlaylist,
  manifestIdentity,
  createDashManifestDataUri,
  isInlinableDashManifest,
  resolveInlinedDashManifest,
  resolveInlinedMasterManifest,
} from "./hls-inline-manifest";
import { notifyShakaRuntimeLoaded } from "./shaka-runtime-hooks";

export interface ShakaEventLike {
  detail?: unknown;
  buffering?: boolean;
  newStatus?: boolean;
}

export interface ShakaErrorLike {
  severity?: number;
  category?: number;
  code?: number | string;
  data?: readonly unknown[];
  message?: string;
}

export interface ShakaVariantTrackLike {
  id: number | string;
  active?: boolean;
  audioId?: number | string | null;
  language?: string;
  audioRoles?: readonly string[];
  channelsCount?: number | null;
  bandwidth?: number | null;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  hdr?: string | null;
}

export interface ShakaAudioTrackLike {
  id?: number | string;
  active?: boolean;
  label?: string | null;
  language?: string;
  roles?: readonly string[];
  channelsCount?: number | null;
  audioCodec?: string | null;
  codecs?: string | null;
  bandwidth?: number | null;
  spatialAudio?: boolean;
}

export interface ShakaTextTrackLike {
  id: number | string;
  active?: boolean;
  label?: string | null;
  language?: string;
  kind?: string | null;
  roles?: readonly string[];
  forced?: boolean;
}

export interface ShakaNetworkRequestLike {
  uris: string[];
  method: string;
  headers: Record<string, string>;
  body?: ArrayBuffer | ArrayBufferView | null;
  allowCrossSiteCredentials?: boolean;
}

export interface ShakaNetworkResponseLike {
  uri: string;
  originalUri?: string;
  headers?: Record<string, string>;
  data: ArrayBuffer;
  status?: number;
}

export type ShakaRequestFilterLike = (
  type: number,
  request: ShakaNetworkRequestLike,
) => void | Promise<void>;

export type ShakaResponseFilterLike = (
  type: number,
  response: ShakaNetworkResponseLike,
) => void | Promise<void>;

export interface ShakaNetworkingEngineLike {
  registerRequestFilter(filter: ShakaRequestFilterLike): void;
  unregisterRequestFilter(filter: ShakaRequestFilterLike): void;
  registerResponseFilter(filter: ShakaResponseFilterLike): void;
  unregisterResponseFilter(filter: ShakaResponseFilterLike): void;
}

export interface ShakaPreloadManagerLike {
  destroy(): Promise<unknown>;
}

export interface ShakaPlayerLike {
  addEventListener(
    type: string,
    listener: (event: ShakaEventLike) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: ShakaEventLike) => void,
  ): void;
  attach(
    media: HTMLMediaElement,
    initializeMediaSource?: boolean,
  ): Promise<void>;
  detach(): Promise<void>;
  load(
    uriOrPreloader: string | ShakaPreloadManagerLike | null,
    startTime?: number,
    mimeType?: string,
  ): Promise<unknown>;
  preload?(
    uri: string,
    startTime?: number | null,
    mimeType?: string | null,
  ): Promise<ShakaPreloadManagerLike | null>;
  unload(initializeMediaSource?: boolean): Promise<void>;
  destroy(): Promise<void>;
  configure(configuration: unknown): boolean;
  resetConfiguration?(): void;
  getNetworkingEngine(): ShakaNetworkingEngineLike | null;
  getStats?(): { estimatedBandwidth?: number };
  getVariantTracks(): ShakaVariantTrackLike[];
  selectVariantTrack(
    track: ShakaVariantTrackLike,
    clearBuffer?: boolean,
    safeMargin?: number,
  ): void;
  getAudioTracks(): ShakaAudioTrackLike[];
  selectAudioTrack(track: ShakaAudioTrackLike, safeMargin?: number): void;
  getTextTracks(): ShakaTextTrackLike[];
  selectTextTrack(track: ShakaTextTrackLike | null): void;
  isTextTrackVisible?(): boolean;
  setTextTrackVisibility?(visible: boolean): void;
  addTextTrackAsync?(
    uri: string,
    language: string,
    kind?: string,
    mimeType?: string,
    codec?: string,
    label?: string,
    forced?: boolean,
  ): Promise<unknown>;
}

export interface ShakaRuntimeLike {
  polyfill: { installAll(): void };
  Player: {
    new (): ShakaPlayerLike;
    isBrowserSupported(): boolean;
  };
  net?: {
    NetworkingEngine?: {
      RequestType?: Record<string, number>;
    };
  };
  util?: {
    Error?: {
      Category?: Record<string, number>;
      Severity?: Record<string, number>;
    };
  };
  drm?: {
    FairPlay?: {
      initDataTransform?(
        initData: Uint8Array,
        contentId: string,
        serverCertificate: Uint8Array,
      ): Uint8Array;
    };
  };
}

export type ShakaRuntimeLoader = () => Promise<unknown>;

/**
 * No segment prefetch during playback: segments go through Shaka's plain
 * fetch-and-retry path. With prefetch on and a deep buffer, a seek that
 * cancels an init segment mid-download (dragging the scrubber across DASH
 * periods does this every time) leaves it in Shaka's prefetch map as if it
 * were on its way; it is never requested again, the new period's media
 * cannot be appended without it, and playback waits forever. Segments run
 * 2-6s and download several times faster than they play, so the 60s buffer
 * fills just the same. A preload sets its own limit (it needs one to fetch
 * the first segment); see `PRELOAD_SEGMENT_PREFETCH_LIMIT` in the web app.
 */
export const SHAKA_SEGMENT_PREFETCH_LIMIT = 0;

/**
 * Streaming defaults for VOD lessons. Playback starts once 1.5s is buffered
 * (one 2s segment), then a 60s cushion is built so a phone that loses signal
 * for half a minute keeps playing; 30s is kept behind the playhead so a
 * short seek back needs no network. The buffer lives in MSE SourceBuffers,
 * which a page cannot read back.
 */
export const SHAKA_STREAMING_DEFAULTS = {
  rebufferingGoal: 1.5,
  bufferingGoal: 60,
  bufferBehind: 30,
} as const;

/**
 * Retries tuned for flaky mobile links: four tries, ~0.4s/0.6s/0.9s apart.
 * No limit on a request's total time: on 3G (~50KB/s) a 1080p segment
 * (~1.6MB) needs over 30s, and a retry starts again from its first byte, so
 * a total limit made it fail forever. A request is given up only when no
 * byte has arrived for 20s, which also leaves room for an extension that
 * hands the page the body only once it is complete.
 */
export const SHAKA_SEGMENT_RETRY_DEFAULTS = {
  maxAttempts: 4,
  baseDelay: 400,
  backoffFactor: 1.5,
  fuzzFactor: 0.3,
  timeout: 0,
  connectionTimeout: 20_000,
  stallTimeout: 20_000,
} as const;

/**
 * ABR defaults. With nothing measured yet the first segment is fetched from
 * a low tier (~360p) so the first frame comes quickly. Quality is
 * reconsidered every 4s rather than Shaka's 8s. Upgrading needs the
 * stream to use at most 85% of the measured bandwidth, downgrading starts
 * only above 95%: with one value for both, quality flipped back and forth
 * every few seconds, each switch fetching another tier's segments.
 *
 * The browser's own network guess (navigator.connection) is not used: it
 * reported 1.35 Mbps on a 0.4 Mbps 3G link, so playback began at 720p and
 * no segment finished. Only what this page measures moves quality up.
 */
export const SHAKA_ABR_DEFAULTS = {
  defaultBandwidthEstimate: 650_000,
  useNetworkInformation: false,
  switchInterval: 4,
  bandwidthUpgradeTarget: 0.85,
  bandwidthDowngradeTarget: 0.95,
} as const;

const MIN_REMEMBERED_BANDWIDTH = 300_000;
const MAX_REMEMBERED_BANDWIDTH = 10_000_000;
const MAX_WARM_START_BANDWIDTH = 2_500_000;
const WARM_START_BANDWIDTH_FRACTION = 0.7;

let lastEstimatedBandwidth: number | null = null;

/**
 * Remembers what Shaka measured, so the next video in this page starts at a
 * tier the connection is known to sustain.
 */
export function rememberShakaBandwidthEstimate(
  player: Pick<ShakaPlayerLike, "getStats"> | null | undefined,
): void {
  let estimate: number | undefined;
  try {
    estimate = player?.getStats?.().estimatedBandwidth;
  } catch {
    return;
  }
  if (typeof estimate !== "number" || !Number.isFinite(estimate)) return;
  if (estimate <= 0) return;
  lastEstimatedBandwidth = Math.min(
    MAX_REMEMBERED_BANDWIDTH,
    Math.max(MIN_REMEMBERED_BANDWIDTH, estimate),
  );
}

/**
 * The bandwidth to assume before the first segment: a conservative share of
 * the last measurement, or the cold-start default.
 */
export function getShakaStartupBandwidthEstimate(): number {
  if (lastEstimatedBandwidth === null) {
    return SHAKA_ABR_DEFAULTS.defaultBandwidthEstimate;
  }
  return Math.round(
    Math.min(
      lastEstimatedBandwidth * WARM_START_BANDWIDTH_FRACTION,
      MAX_WARM_START_BANDWIDTH,
    ),
  );
}

export function resetShakaBandwidthEstimateForTests(): void {
  lastEstimatedBandwidth = null;
}

export async function defaultShakaRuntimeLoader(): Promise<unknown> {
  const runtimeModule = await import("shaka-player");
  // Extensions get the runtime before the caller creates a player from it.
  notifyShakaRuntimeLoaded(runtimeModule);
  return runtimeModule;
}

export function resolveShakaRuntime(module: unknown): ShakaRuntimeLike {
  const record = module as { default?: unknown } | null;
  const candidate = (record?.default ??
    module) as Partial<ShakaRuntimeLike> | null;

  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof candidate.Player !== "function" ||
    typeof candidate.polyfill?.installAll !== "function"
  ) {
    throw new TypeError("The loaded module is not a compatible Shaka runtime.");
  }

  return candidate as ShakaRuntimeLike;
}

export function normalizeShakaQuality(
  track: ShakaVariantTrackLike,
): VideoQuality {
  const heightLabel = track.height ? `${track.height}p` : "Audio only";
  const frameRateLabel =
    track.frameRate && track.frameRate > 30
      ? ` ${Math.round(track.frameRate)}fps`
      : "";

  return {
    id: `shaka-quality:${String(track.id)}`,
    label: `${heightLabel}${frameRateLabel}`,
    active: Boolean(track.active),
    bandwidth: track.bandwidth ?? undefined,
    width: track.width ?? undefined,
    height: track.height ?? undefined,
    frameRate: track.frameRate ?? undefined,
    videoCodec: track.videoCodec ?? undefined,
    audioCodec: track.audioCodec ?? undefined,
    hdr: track.hdr ?? undefined,
  };
}

export function normalizeShakaAudioTrack(
  track: ShakaAudioTrackLike,
  index = 0,
): VideoAudioTrack {
  const language = track.language || "und";
  const fingerprint = [
    track.id ?? index,
    language,
    track.label ?? "",
    ...(track.roles ?? []),
    track.codecs ?? track.audioCodec ?? "",
    track.channelsCount ?? "",
  ].join("|");
  return {
    id: `shaka-audio:${encodeURIComponent(fingerprint)}`,
    label: track.label || language || "Audio",
    language,
    active: Boolean(track.active),
    roles: [...(track.roles ?? [])],
    channelsCount: track.channelsCount ?? undefined,
    codec: track.codecs ?? track.audioCodec ?? undefined,
    bandwidth: track.bandwidth ?? undefined,
    spatialAudio: track.spatialAudio,
  };
}

export function normalizeShakaTextTrack(
  track: ShakaTextTrackLike,
): VideoTextTrack {
  const language = track.language || "und";
  return {
    id: `shaka-text:${String(track.id)}`,
    label: track.label || language || "Text",
    language,
    active: Boolean(track.active),
    kind: track.kind ?? undefined,
    roles: [...(track.roles ?? [])],
    forced: track.forced,
  };
}

export function mapRequestKind(
  type: number,
  requestTypes: Record<string, number> | undefined,
): VideoRequestKind {
  const entries: Array<[string, VideoRequestKind]> = [
    ["MANIFEST", "manifest"],
    ["SEGMENT", "segment"],
    ["LICENSE", "license"],
    ["KEY", "key"],
    ["TIMING", "manifest"],
    ["APP", "other"],
  ];

  for (const [shakaName, normalized] of entries) {
    if (requestTypes?.[shakaName] === type) {
      return normalized;
    }
  }
  return "other";
}

export function toVideoNetworkRequest(
  type: VideoRequestKind,
  request: ShakaNetworkRequestLike,
): VideoNetworkRequest {
  return {
    type,
    uris: [...request.uris],
    method: request.method,
    headers: { ...request.headers },
    body: request.body ?? null,
    allowCrossSiteCredentials: Boolean(request.allowCrossSiteCredentials),
  };
}

export function applyVideoNetworkRequest(
  normalized: VideoNetworkRequest,
  request: ShakaNetworkRequestLike,
): void {
  request.uris = [...normalized.uris];
  request.method = normalized.method;
  request.headers = { ...normalized.headers };
  request.body = normalized.body;
  request.allowCrossSiteCredentials = normalized.allowCrossSiteCredentials;
}

export function toVideoNetworkResponse(
  type: VideoRequestKind,
  response: ShakaNetworkResponseLike,
): VideoNetworkResponse {
  return {
    type,
    uri: response.uri,
    originalUri: response.originalUri,
    headers: { ...(response.headers ?? {}) },
    data: response.data,
    status: response.status,
  };
}

export function applyVideoNetworkResponse(
  normalized: VideoNetworkResponse,
  response: ShakaNetworkResponseLike,
): void {
  response.uri = normalized.uri;
  response.originalUri = normalized.originalUri;
  response.headers = { ...normalized.headers };
  response.data = normalized.data;
  response.status = normalized.status;
}

function retryConfiguration(
  retry: import("../../core/types").RetryParameters | undefined,
): Record<string, number> | undefined {
  if (!retry) {
    return undefined;
  }

  const mapped: Record<string, number> = {};
  if (retry.maxAttempts !== undefined) mapped.maxAttempts = retry.maxAttempts;
  if (retry.baseDelayMs !== undefined) mapped.baseDelay = retry.baseDelayMs;
  if (retry.backoffFactor !== undefined)
    mapped.backoffFactor = retry.backoffFactor;
  if (retry.fuzzFactor !== undefined) mapped.fuzzFactor = retry.fuzzFactor;
  if (retry.timeoutMs !== undefined) mapped.timeout = retry.timeoutMs;
  if (retry.stallTimeoutMs !== undefined)
    mapped.stallTimeout = retry.stallTimeoutMs;
  if (retry.connectionTimeoutMs !== undefined) {
    mapped.connectionTimeout = retry.connectionTimeoutMs;
  }
  return mapped;
}

function robustnessConfiguration(
  config: import("../../core/types").DrmSystemConfiguration,
): Record<string, unknown> {
  return {
    ...(config.headers ? { headers: { ...config.headers } } : {}),
    ...(config.audioRobustness
      ? { audioRobustness: [...config.audioRobustness] }
      : {}),
    ...(config.videoRobustness
      ? { videoRobustness: [...config.videoRobustness] }
      : {}),
  };
}

function bytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function decodeFairPlaySkdUri(data: Uint8Array): string {
  const pairs = Math.floor(data.byteLength / 2);
  let zeroHighBytes = 0;
  for (let index = 1; index < data.byteLength; index += 2) {
    if (data[index] === 0) zeroHighBytes += 1;
  }
  const encoding =
    pairs > 0 && zeroHighBytes / pairs > 0.4 ? "utf-16le" : "utf-8";
  return new TextDecoder(encoding).decode(data).replace(/\0+$/u, "").trim();
}

export function createShakaConfiguration(
  source: VideoSource,
  runtime: ShakaRuntimeLike,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const streaming = source.streaming;
  const networking = source.networking;

  result.streaming = {
    segmentPrefetchLimit:
      streaming?.segmentPrefetchLimit ?? SHAKA_SEGMENT_PREFETCH_LIMIT,
    bufferingGoal:
      streaming?.bufferingGoal ?? SHAKA_STREAMING_DEFAULTS.bufferingGoal,
    rebufferingGoal:
      streaming?.rebufferingGoal ?? SHAKA_STREAMING_DEFAULTS.rebufferingGoal,
    bufferBehind:
      streaming?.bufferBehind ?? SHAKA_STREAMING_DEFAULTS.bufferBehind,
    retryParameters: networking?.segmentRetry
      ? retryConfiguration(networking.segmentRetry)
      : { ...SHAKA_SEGMENT_RETRY_DEFAULTS },
    ...(streaming?.lowLatencyMode !== undefined
      ? { lowLatencyMode: streaming.lowLatencyMode }
      : {}),
    ...(streaming?.preferNativeHls !== undefined
      ? { preferNativeHls: streaming.preferNativeHls }
      : {}),
    ...(streaming?.useNativeHlsForFairPlay !== undefined
      ? { useNativeHlsForFairPlay: streaming.useNativeHlsForFairPlay }
      : {}),
  };

  result.abr = {
    enabled: streaming?.abrEnabled ?? true,
    useNetworkInformation: SHAKA_ABR_DEFAULTS.useNetworkInformation,
    defaultBandwidthEstimate:
      streaming?.abrDefaultBandwidthEstimate ??
      getShakaStartupBandwidthEstimate(),
    switchInterval:
      streaming?.abrSwitchInterval ?? SHAKA_ABR_DEFAULTS.switchInterval,
    bandwidthUpgradeTarget:
      streaming?.abrBandwidthUpgradeTarget ??
      SHAKA_ABR_DEFAULTS.bandwidthUpgradeTarget,
    bandwidthDowngradeTarget:
      streaming?.abrBandwidthDowngradeTarget ??
      SHAKA_ABR_DEFAULTS.bandwidthDowngradeTarget,
    ...(streaming?.abrRestrictions
      ? { restrictions: { ...streaming.abrRestrictions } }
      : {}),
  };

  if (networking?.manifestRetry) {
    result.manifest = {
      retryParameters: retryConfiguration(networking.manifestRetry),
    };
  }

  if (streaming?.transmuxWorkerUrl) {
    result.mediaSource = {
      transmuxWorkerUrl: streaming.transmuxWorkerUrl,
    };
  }

  const drm = source.drm;
  if (drm) {
    const servers: Record<string, string> = {};
    const advanced: Record<string, Record<string, unknown>> = {};

    if (drm.widevine) {
      servers["com.widevine.alpha"] = drm.widevine.licenseUrl;
      advanced["com.widevine.alpha"] = robustnessConfiguration(drm.widevine);
    }
    if (drm.playready) {
      servers["com.microsoft.playready"] = drm.playready.licenseUrl;
      advanced["com.microsoft.playready"] = robustnessConfiguration(
        drm.playready,
      );
    }
    if (drm.fairplay) {
      const fairPlayAdvanced = {
        ...robustnessConfiguration(drm.fairplay),
        ...(drm.fairplay.certificateUrl
          ? { serverCertificateUri: drm.fairplay.certificateUrl }
          : {}),
        ...(drm.fairplay.certificate
          ? { serverCertificate: drm.fairplay.certificate }
          : {}),
      };
      servers["com.apple.fps"] = drm.fairplay.licenseUrl;
      servers["com.apple.fps.1_0"] = drm.fairplay.licenseUrl;
      advanced["com.apple.fps"] = fairPlayAdvanced;
      advanced["com.apple.fps.1_0"] = fairPlayAdvanced;
    }

    const drmConfiguration: Record<string, unknown> = {
      servers,
      advanced,
      ...(drm.clearKeys ? { clearKeys: { ...drm.clearKeys } } : {}),
    };

    if (drm.preferredSystems) {
      const keySystems = drm.preferredSystems.flatMap((system) => {
        if (system === "widevine") return ["com.widevine.alpha"];
        if (system === "playready") return ["com.microsoft.playready"];
        return ["com.apple.fps", "com.apple.fps.1_0"];
      });
      drmConfiguration.preferredKeySystems = keySystems;
    }

    if (networking?.licenseRetry) {
      drmConfiguration.retryParameters = retryConfiguration(
        networking.licenseRetry,
      );
    }

    const fairPlay = drm.fairplay;
    if (fairPlay?.transformInitData || fairPlay?.getContentId) {
      drmConfiguration.initDataTransform = (
        initData: ArrayBuffer | ArrayBufferView,
        initDataType: string,
        drmInfo?: { serverCertificate?: Uint8Array },
      ): Uint8Array => {
        const data = bytes(initData);
        const certificate = drmInfo?.serverCertificate ?? fairPlay.certificate;

        if (fairPlay.transformInitData) {
          return fairPlay.transformInitData(data, initDataType, certificate);
        }

        if (initDataType.toLowerCase() !== "skd") {
          return data;
        }

        const transform = runtime.drm?.FairPlay?.initDataTransform;
        if (!transform || !certificate || !fairPlay.getContentId) {
          return data;
        }

        const skdUri = decodeFairPlaySkdUri(data);
        return transform(data, fairPlay.getContentId(skdUri), certificate);
      };
    }

    result.drm = drmConfiguration;
  }

  return result;
}

export function configureShakaPlayer(
  player: ShakaPlayerLike,
  source: VideoSource,
  runtime: ShakaRuntimeLike,
  options: { reset?: boolean } = {},
): boolean {
  if (options.reset !== false) {
    player.resetConfiguration?.();
  }
  return player.configure(createShakaConfiguration(source, runtime));
}

export interface ShakaNetworkingFilters {
  requestFilter: ShakaRequestFilterLike | null;
  responseFilter: ShakaResponseFilterLike | null;
}

export function createShakaNetworkingFilters(
  source: VideoSource,
  runtime: ShakaRuntimeLike,
): ShakaNetworkingFilters {
  const userRequestFilter = source.networking?.requestFilter;
  const userResponseFilter = source.networking?.responseFilter;
  const requestTypes = runtime.net?.NetworkingEngine?.RequestType;
  const answerFromInlinedManifest = createInlinedManifestRequestRewrite(source);
  const filters: ShakaNetworkingFilters = {
    requestFilter: null,
    responseFilter: null,
  };

  if (userRequestFilter || answerFromInlinedManifest) {
    filters.requestFilter = async (
      type: number,
      request: ShakaNetworkRequestLike,
    ): Promise<void> => {
      const kind = mapRequestKind(type, requestTypes);
      // Served from memory: no token, cache query or refresh applies.
      if (kind === "manifest" && answerFromInlinedManifest?.(request)) return;
      if (!userRequestFilter) return;
      const normalized = toVideoNetworkRequest(kind, request);
      await userRequestFilter(normalized);
      applyVideoNetworkRequest(normalized, request);
    };
  }

  if (userResponseFilter) {
    filters.responseFilter = async (
      type: number,
      response: ShakaNetworkResponseLike,
    ): Promise<void> => {
      const kind = mapRequestKind(type, requestTypes);
      const normalized = toVideoNetworkResponse(kind, response);
      await userResponseFilter(normalized);
      applyVideoNetworkResponse(normalized, response);
    };
  }

  return filters;
}

/**
 * With an inlined manifest (HLS master playlist or DASH MPD), returns a
 * rewrite that points the request for `source.src` at a `data:` URI holding
 * it, with its URIs made absolute. Returns null when there is nothing usable
 * to inline; playback then fetches the manifest as before.
 */
export function createInlinedManifestRequestRewrite(
  source: VideoSource,
): ((request: ShakaNetworkRequestLike) => boolean) | null {
  const inlined = source.inlinedManifest;
  const isHls = isInlinableHlsPlaylist(inlined);
  if (!inlined || (!isHls && !isInlinableDashManifest(inlined))) return null;
  const masterIdentity = manifestIdentity(source.src);
  if (!masterIdentity) return null;

  let dataUri: string | null = null;
  return (request) => {
    const uri = request.uris[0];
    if (!uri || manifestIdentity(uri) !== masterIdentity) return false;
    try {
      dataUri ??= isHls
        ? createHlsPlaylistDataUri(
            resolveInlinedMasterManifest(inlined, source.src),
          )
        : createDashManifestDataUri(
            resolveInlinedDashManifest(inlined, source.src),
          );
    } catch {
      return false;
    }
    request.uris = [dataUri];
    return true;
  };
}

export function registerShakaNetworkingFilters(
  player: ShakaPlayerLike,
  filters: ShakaNetworkingFilters,
): void {
  const networkingEngine = player.getNetworkingEngine();
  if (!networkingEngine) {
    return;
  }
  if (filters.requestFilter) {
    networkingEngine.registerRequestFilter(filters.requestFilter);
  }
  if (filters.responseFilter) {
    networkingEngine.registerResponseFilter(filters.responseFilter);
  }
}

export function unregisterShakaNetworkingFilters(
  player: ShakaPlayerLike | null | undefined,
  filters: ShakaNetworkingFilters,
): void {
  const networkingEngine = player?.getNetworkingEngine();
  if (!networkingEngine) {
    return;
  }
  if (filters.requestFilter) {
    networkingEngine.unregisterRequestFilter(filters.requestFilter);
  }
  if (filters.responseFilter) {
    networkingEngine.unregisterResponseFilter(filters.responseFilter);
  }
}

export function resolveShakaLoadMimeType(
  source: VideoSource,
  options: import("../../core/types").VideoLoadOptions = {},
): string | undefined {
  const manifestMimeTypes: Partial<
    Record<import("../../core/types").VideoSourceKind, string>
  > = {
    dash: "application/dash+xml",
    hls: "application/x-mpegurl",
  };
  return (
    options.mimeType ??
    source.type ??
    (source.kind ? manifestMimeTypes[source.kind] : undefined)
  );
}

export async function addExternalTextTrack(
  player: ShakaPlayerLike,
  track: ExternalTextTrack,
): Promise<void> {
  if (!player.addTextTrackAsync) {
    throw new Error("This Shaka runtime cannot add external text tracks.");
  }

  await player.addTextTrackAsync(
    track.src,
    track.language,
    track.kind ?? "subtitles",
    track.mimeType,
    track.codec,
    track.label,
    track.forced,
  );
}
