import type { PreviewVideoInfo } from "./spriteStoryboardIndex.ts";
import { notifyFramesDecoded, type FrameProvider } from "./spriteSheetStore.ts";
import type { StoryboardFrame } from "./storyboardTypes.ts";

/** Fetches `[start, end)` of the preview stream. */
export type PreviewRangeFetcher = (
  start: number,
  end: number,
  priority: "high" | "low",
) => Promise<Uint8Array>;

/** Decoded pictures kept ready to draw (480x270 is about 0.5 MB each). */
const MAX_KEPT_PICTURES = 60;
/**
 * Chunk decodes waiting their turn: only the newest. Measured on lecture 13
 * in Chrome at 120 Hz, a full-length sweep in 3 s showed the exact picture
 * 68% of the time with two waiting and 99% with one plus `prepareAhead`.
 */
const MAX_WAITING_DECODES = 1;
/** How far back `getNearestDecoded` looks for a stand-in picture. */
const NEAREST_PICTURE_RANGE = 40;
/** Chunk downloads asked for by the pointer, at once. */
const MAX_ON_DEMAND_FETCHES = 4;
/**
 * Requests for another chunk this soon after the last are a fast sweep:
 * only the chunk's first picture is decoded for them (one picture comes
 * through at once; the exact one follows when the pointer slows down).
 */
const FAST_SWEEP_CHUNK_MS = 120;
/** A pointer resting this close to a chunk's edge readies the next one. */
const NEIGHBOUR_PREPARE_SECONDS = 3;
/** Bytes per background request (several chunks at once). */
const BACKGROUND_BATCH_BYTES = 768 * 1024;

let instances = 0;

/** Splits an Annex B stream into its pictures, at each access unit delimiter. */
function splitPictures(data: Uint8Array): Uint8Array[] {
  const starts: number[] = [];
  for (let at = 0; at + 3 < data.length; at += 1) {
    if (data[at] !== 0 || data[at + 1] !== 0 || data[at + 2] !== 1) continue;
    if ((data[at + 3]! & 0x1f) === 9) {
      starts.push(at > 0 && data[at - 1] === 0 ? at - 1 : at);
    }
    at += 2;
  }
  return starts.map((start, index) =>
    data.subarray(start, starts[index + 1] ?? data.length),
  );
}

async function toBitmap(frame: VideoFrame): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(frame);
  } catch {
    // Browsers that cannot make a bitmap from a VideoFrame directly.
    const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
    canvas.getContext("2d")!.drawImage(frame, 0, 0);
    return canvas.transferToImageBitmap();
  }
}

/**
 * The pictures of a seek-preview video (see `PreviewVideoInfo`), decoded on
 * the page with WebCodecs.
 *
 * Each 10 s chunk is fetched by byte range the first time a moment in it is
 * wanted, or ahead of time by `fillInBackground`, and kept (compressed, a
 * few tens of kilobytes). Decoding a chunk gives all of its pictures; the
 * most recently drawn `MAX_KEPT_PICTURES` stay decoded. Decodes run one at
 * a time, the newest request first, so a fast sweep is not held up by the
 * places it has already left.
 */
export class PreviewVideoFrames implements FrameProvider {
  readonly prefix = `veo-preview:${(instances += 1)}/`;
  readonly #info: PreviewVideoInfo;
  readonly #fetchRange: PreviewRangeFetcher;
  readonly #chunks = new Map<number, Uint8Array>();
  readonly #chunkLoads = new Map<number, Promise<Uint8Array>>();
  readonly #pictures = new Map<number, ImageBitmap>();
  // Decodes running or waiting, by chunk, with the last picture each goes to.
  readonly #chunkDecodes = new Map<
    number,
    { upTo: number; job: Promise<void> }
  >();
  // Callers waiting for one picture, told as soon as it is decoded rather
  // than when its whole chunk is.
  readonly #pictureWaiters = new Map<number, Array<() => void>>();
  #waitingDecodes: Array<{
    chunk: number;
    run: () => Promise<void>;
    drop: () => void;
  }> = [];
  #decoding = false;
  #onDemandFetches = 0;
  #waitingFetches: Array<() => void> = [];
  #decoder: VideoDecoder | null = null;
  #decoderOutput: ((frame: VideoFrame) => void) | null = null;
  #backgroundStarted = false;
  #lastRequest: { chunk: number; at: number } | null = null;
  #destroyed = false;

  readonly #acceleration: HardwareAcceleration;

  constructor(
    info: PreviewVideoInfo,
    acceleration: HardwareAcceleration,
    fetchRange: PreviewRangeFetcher,
  ) {
    this.#info = info;
    this.#acceleration = acceleration;
    this.#fetchRange = fetchRange;
  }

  /** Whether this browser can decode the preview video. */
  /**
   * How this browser can decode the preview video: in software when it can
   * (see `#ensureDecoder`), else however it likes; null when it cannot.
   */
  static async decoderAcceleration(
    info: PreviewVideoInfo,
  ): Promise<HardwareAcceleration | null> {
    if (
      typeof VideoDecoder === "undefined" ||
      typeof EncodedVideoChunk === "undefined"
    ) {
      return null;
    }
    for (const acceleration of ["prefer-software", "no-preference"] as const) {
      try {
        const support = await VideoDecoder.isConfigSupported({
          codec: info.codec,
          codedWidth: info.width,
          codedHeight: info.height,
          hardwareAcceleration: acceleration,
        });
        if (support.supported === true) return acceleration;
      } catch {
        // Try the next.
      }
    }
    return null;
  }

  get chunkCount(): number {
    return this.#info.gopOffsets.length;
  }

  /** One storyboard frame per picture, drawn through this provider. */
  frames(duration: number): StoryboardFrame[] {
    const { frameCount, interval, width, height } = this.#info;
    return Array.from({ length: frameCount }, (_, picture) => {
      const startTime = picture * interval;
      return {
        id: `preview-${picture}`,
        startTime,
        endTime:
          picture === frameCount - 1
            ? Math.max(duration, startTime + interval)
            : startTime + interval,
        imageUrl: `${this.prefix}${picture}`,
        x: 0,
        y: 0,
        width,
        height,
        sheetWidth: width,
        sheetHeight: height,
      };
    });
  }

  destroy(): void {
    this.#destroyed = true;
    for (const bitmap of this.#pictures.values()) bitmap.close();
    this.#pictures.clear();
    this.#chunks.clear();
    this.#waitingDecodes.splice(0).forEach((waiting) => waiting.drop());
    this.#waitingFetches.splice(0).forEach((resume) => resume());
    if (this.#decoder && this.#decoder.state !== "closed")
      this.#decoder.close();
    this.#decoder = null;
  }

  /**
   * The closest decoded picture at or before the one `key` names (within
   * 20 s), to show while that one is decoded.
   */
  getNearestDecoded(key: string): ImageBitmap | null {
    const picture = this.#pictureOf(key);
    for (
      let candidate = picture;
      candidate >= 0 && candidate > picture - NEAREST_PICTURE_RANGE;
      candidate -= 1
    ) {
      const bitmap = this.#pictures.get(candidate);
      if (bitmap) return bitmap;
    }
    return null;
  }

  /**
   * Readies the first picture of the chunk after (or before) the one
   * holding `time`, in the direction the pointer is moving: one picture
   * decodes at once, and stands in until the one asked for is decoded.
   */
  prepareAhead(time: number, direction: 1 | -1): void {
    const { frameCount, gopFrames, interval } = this.#info;
    const picture = Math.min(
      frameCount - 1,
      Math.max(0, Math.floor(time / interval)),
    );
    const next = Math.floor(picture / gopFrames) + direction;
    if (next < 0 || next >= this.chunkCount) return;
    if (this.#pictures.has(next * gopFrames)) return;
    void this.prepareChunk(next, 0);
  }

  getDecoded(key: string): ImageBitmap | null {
    const picture = this.#pictureOf(key);
    const bitmap = this.#pictures.get(picture);
    if (!bitmap) return null;
    // Most recently drawn last: the first entries are let go first.
    this.#pictures.delete(picture);
    this.#pictures.set(picture, bitmap);
    return bitmap;
  }

  async decode(key: string): Promise<ImageBitmap | null> {
    const picture = this.#pictureOf(key);
    if (!this.#pictures.has(picture)) {
      let notify!: () => void;
      const decoded = new Promise<void>((resolve) => {
        notify = resolve;
      });
      const waiters = this.#pictureWaiters.get(picture) ?? [];
      waiters.push(notify);
      this.#pictureWaiters.set(picture, waiters);
      // Whichever comes first: the picture, or the end of its chunk (which
      // may not have produced it, if the chunk gave way to a newer one).
      const chunk = Math.floor(picture / this.#info.gopFrames);
      const now = performance.now();
      const fastSweep =
        this.#lastRequest !== null &&
        this.#lastRequest.chunk !== chunk &&
        now - this.#lastRequest.at < FAST_SWEEP_CHUNK_MS;
      this.#lastRequest = { chunk, at: now };
      await Promise.race([
        decoded,
        // Only as far as this picture (the first one, in a fast sweep):
        // the rest of the chunk is decoded when the pointer rests there
        // (`prepareAt`).
        this.prepareChunk(
          chunk,
          fastSweep ? 0 : picture - chunk * this.#info.gopFrames,
        ),
      ]);
      const left = this.#pictureWaiters
        .get(picture)
        ?.filter((waiter) => waiter !== notify);
      if (left?.length) this.#pictureWaiters.set(picture, left);
      else this.#pictureWaiters.delete(picture);
    }
    return this.getDecoded(key);
  }

  /**
   * Fetches and decodes the chunk holding `time` (for a pointer at rest),
   * and the next or previous one when `time` is near its edge, so moving on
   * from a rest finds the pictures ready.
   */
  prepareAt(time: number): void {
    const { frameCount, gopFrames, interval } = this.#info;
    const picture = Math.min(
      frameCount - 1,
      Math.max(0, Math.floor(time / interval)),
    );
    const chunk = Math.floor(picture / gopFrames);
    void this.prepareChunk(chunk);
    const intoChunk = picture - chunk * gopFrames;
    const edge = Math.max(1, Math.round(NEIGHBOUR_PREPARE_SECONDS / interval));
    if (intoChunk >= gopFrames - edge) void this.prepareChunk(chunk + 1);
    else if (intoChunk < edge) void this.prepareChunk(chunk - 1);
  }

  /**
   * Decodes one chunk (fetching it first if needed), from its first
   * picture to picture `upTo` within it (all of it by default). Each
   * decoded picture reaches the page as a task of its own, so on a busy
   * page (a drag redraws it every frame) a whole chunk took some 300 ms to
   * come through; decoding only as far as needed keeps up. Never rejects.
   */
  prepareChunk(
    chunk: number,
    upTo: number = this.#info.gopFrames - 1,
  ): Promise<void> {
    if (this.#destroyed || chunk < 0 || chunk >= this.chunkCount) {
      return Promise.resolve();
    }
    const existing = this.#chunkDecodes.get(chunk);
    if (existing && existing.upTo >= upTo) return existing.job;
    const job = this.#loadChunk(chunk, "high")
      .then((data) => this.#queueDecode(chunk, data, upTo))
      .catch(() => undefined)
      .finally(() => {
        if (this.#chunkDecodes.get(chunk)?.job === job) {
          this.#chunkDecodes.delete(chunk);
        }
      });
    this.#chunkDecodes.set(chunk, { upTo, job });
    return job;
  }

  /**
   * Fetches every chunk not fetched yet, a few at a time and at low
   * priority, starting at `fromTime` and wrapping round. Once.
   */
  fillInBackground(fromTime: number): void {
    if (this.#backgroundStarted || this.#destroyed) return;
    this.#backgroundStarted = true;
    const first = Math.min(
      this.chunkCount - 1,
      Math.max(
        0,
        Math.floor(fromTime / this.#info.interval / this.#info.gopFrames),
      ),
    );
    const order = [
      ...Array.from({ length: this.chunkCount - first }, (_, i) => first + i),
      ...Array.from({ length: first }, (_, i) => i),
    ];
    void (async () => {
      let index = 0;
      while (index < order.length && !this.#destroyed) {
        const chunk = order[index]!;
        if (this.#chunks.has(chunk) || this.#chunkLoads.has(chunk)) {
          index += 1;
          continue;
        }
        // A run of consecutive chunks not fetched yet, up to the batch size.
        let last = chunk;
        while (
          last + 1 < this.chunkCount &&
          order[index + (last + 1 - chunk)] === last + 1 &&
          !this.#chunks.has(last + 1) &&
          !this.#chunkLoads.has(last + 1) &&
          this.#chunkEnd(last + 1) - this.#chunkStart(chunk) <=
            BACKGROUND_BATCH_BYTES
        ) {
          last += 1;
        }
        try {
          await this.#loadChunks(chunk, last, "low");
        } catch {
          // The pointer fetches what it needs; leave the rest.
          return;
        }
        index += last - chunk + 1;
      }
    })();
  }

  #pictureOf(key: string): number {
    return Number(key.slice(this.prefix.length));
  }

  #chunkStart(chunk: number): number {
    return this.#info.gopOffsets[chunk]!;
  }

  #chunkEnd(chunk: number): number {
    return this.#info.gopOffsets[chunk + 1] ?? this.#info.bytes;
  }

  #loadChunk(chunk: number, priority: "high" | "low"): Promise<Uint8Array> {
    const kept = this.#chunks.get(chunk);
    if (kept) return Promise.resolve(kept);
    const loading = this.#chunkLoads.get(chunk);
    if (loading) return loading;
    return this.#loadChunks(chunk, chunk, priority).then(() =>
      this.#chunks.get(chunk)!,
    );
  }

  /** Fetches chunks `first..last` in one request and keeps each. */
  #loadChunks(
    first: number,
    last: number,
    priority: "high" | "low",
  ): Promise<void> {
    const start = this.#chunkStart(first);
    const end = this.#chunkEnd(last);
    const request = (async () => {
      if (priority === "high") await this.#takeFetchSlot();
      try {
        const data = await this.#fetchRange(start, end, priority);
        if (data.length < end - start) {
          throw new Error("The preview video answered short.");
        }
        for (let chunk = first; chunk <= last; chunk += 1) {
          this.#chunks.set(
            chunk,
            data.slice(
              this.#chunkStart(chunk) - start,
              this.#chunkEnd(chunk) - start,
            ),
          );
        }
      } finally {
        if (priority === "high") this.#releaseFetchSlot();
      }
    })();
    for (let chunk = first; chunk <= last; chunk += 1) {
      const load = request.then(() => this.#chunks.get(chunk)!);
      this.#chunkLoads.set(chunk, load);
      void load
        .catch(() => undefined)
        .finally(() => this.#chunkLoads.delete(chunk));
    }
    return request;
  }

  async #takeFetchSlot(): Promise<void> {
    if (this.#onDemandFetches < MAX_ON_DEMAND_FETCHES) {
      this.#onDemandFetches += 1;
      return;
    }
    // The newest waits least: it is where the pointer is now.
    await new Promise<void>((resume) => this.#waitingFetches.unshift(resume));
    this.#onDemandFetches += 1;
  }

  #releaseFetchSlot(): void {
    this.#onDemandFetches -= 1;
    this.#waitingFetches.shift()?.();
  }

  #queueDecode(chunk: number, data: Uint8Array, upTo: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.#waitingDecodes.push({
        chunk,
        run: () => this.#decodeChunk(chunk, data, upTo).finally(resolve),
        drop: resolve,
      });
      // Older requests give way; their pictures are decoded when asked for
      // again.
      while (this.#waitingDecodes.length > MAX_WAITING_DECODES) {
        this.#waitingDecodes.shift()!.drop();
      }
      void this.#pumpDecodes();
    });
  }

  async #pumpDecodes(): Promise<void> {
    if (this.#decoding) return;
    this.#decoding = true;
    try {
      while (this.#waitingDecodes.length > 0 && !this.#destroyed) {
        const next = this.#waitingDecodes.pop()!;
        await next.run();
      }
    } finally {
      this.#decoding = false;
    }
  }

  #ensureDecoder(): VideoDecoder {
    if (this.#decoder && this.#decoder.state === "configured") {
      return this.#decoder;
    }
    const decoder = new VideoDecoder({
      output: (frame) => {
        if (this.#decoderOutput) this.#decoderOutput(frame);
        else frame.close();
      },
      error: () => {
        // Recreated on the next chunk.
        this.#decoder = null;
      },
    });
    decoder.configure({
      codec: this.#info.codec,
      codedWidth: this.#info.width,
      codedHeight: this.#info.height,
      optimizeForLatency: true,
      // Measured on desktop Chrome: a 10 s chunk (20 pictures at 480x270)
      // decodes in 15-19 ms in software, first picture after 3-5 ms; the
      // hardware decoder took 24 ms to its first picture. Software also
      // leaves the hardware decoder to the lesson itself on phones.
      hardwareAcceleration: this.#acceleration,
    });
    this.#decoder = decoder;
    return decoder;
  }

  async #decodeChunk(
    chunk: number,
    data: Uint8Array,
    upTo: number,
  ): Promise<void> {
    const { gopFrames, interval, frameCount } = this.#info;
    const first = chunk * gopFrames;
    const count = Math.min(gopFrames, frameCount - first, upTo + 1);
    let allKept = true;
    for (let picture = first; picture < first + count; picture += 1) {
      if (!this.#pictures.has(picture)) allKept = false;
    }
    if (allKept || this.#destroyed) return;

    const pictures = splitPictures(data).slice(0, count);
    const conversions: Array<Promise<void>> = [];
    const step = interval * 1_000_000;
    this.#decoderOutput = (frame) => {
      const picture = Math.round(frame.timestamp / step);
      conversions.push(
        toBitmap(frame)
          .then((bitmap) => {
            if (this.#destroyed) {
              bitmap.close();
              return;
            }
            this.#pictures.get(picture)?.close();
            this.#pictures.delete(picture);
            this.#pictures.set(picture, bitmap);
            this.#pictureWaiters.get(picture)?.forEach((notify) => notify());
          })
          .catch(() => undefined)
          .finally(() => frame.close()),
      );
    };
    try {
      const decoder = this.#ensureDecoder();
      pictures.forEach((bytes, index) => {
        decoder.decode(
          new EncodedVideoChunk({
            type: index === 0 ? "key" : "delta",
            timestamp: Math.round((first + index) * step),
            data: bytes,
          }),
        );
      });
      await decoder.flush();
    } catch {
      // A failed chunk leaves its pictures undecoded; the next request
      // tries again with a new decoder.
      if (this.#decoder && this.#decoder.state !== "closed") {
        this.#decoder.close();
      }
      this.#decoder = null;
    } finally {
      this.#decoderOutput = null;
    }
    await Promise.all(conversions);
    this.#trimPictures(first, first + count);
    notifyFramesDecoded();
  }

  /** Lets go of the least recently drawn pictures beyond the budget. */
  #trimPictures(keepFrom: number, keepTo: number): void {
    for (const [picture, bitmap] of this.#pictures) {
      if (this.#pictures.size <= MAX_KEPT_PICTURES) break;
      if (picture >= keepFrom && picture < keepTo) continue;
      bitmap.close();
      this.#pictures.delete(picture);
    }
  }
}
