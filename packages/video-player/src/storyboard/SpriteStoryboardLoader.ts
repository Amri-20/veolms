import {
  framesPerSheet,
  parseSpriteStoryboardIndex,
  sheetIndexAtTime,
  spriteSheetFrames,
  type SpriteStoryboardIndex,
  type SpriteStoryboardLevel,
} from "./spriteStoryboardIndex.ts";
import type { StoryboardFrame } from "./storyboardTypes.ts";

export interface SpriteStoryboardLoaderOptions {
  indexUrl: string;
  /**
   * Turns a storyboard URL into the one to request (adds the playback
   * token, for one). Applied to the index and to every sheet.
   */
  prepareUrl?: (url: string) => Promise<string> | string;
  /** Called whenever the set of frames that can be shown changes. */
  onFrames: (frames: readonly StoryboardFrame[]) => void;
  onError?: (error: unknown) => void;
}

/** A detail sheet this close to the pointer's sheet edge brings its neighbour. */
const NEIGHBOUR_PREFETCH_SECONDS = 5;
const MAX_DETAIL_REQUESTS_IN_FLIGHT = 2;

/**
 * Loads a two-level sprite storyboard on demand: nothing until the viewer
 * first points at the timeline, then every coarse sheet (the whole video in
 * a few small images), then single detail sheets where the viewer slows
 * down. Only sheets that have finished decoding are handed out, so a frame
 * can always be drawn the moment it is chosen.
 */
export class SpriteStoryboardLoader {
  readonly #options: SpriteStoryboardLoaderOptions;
  readonly #abort = new AbortController();
  #index: SpriteStoryboardIndex | null = null;
  #indexPromise: Promise<SpriteStoryboardIndex | null> | null = null;
  #coarseFrames: StoryboardFrame[] = [];
  readonly #detailFrames = new Map<number, StoryboardFrame[]>();
  readonly #detailRequested = new Set<number>();
  #detailQueue: number[] = [];
  #detailInFlight = 0;
  #failed = false;

  constructor(options: SpriteStoryboardLoaderOptions) {
    this.#options = options;
  }

  get destroyed(): boolean {
    return this.#abort.signal.aborted;
  }

  destroy(): void {
    this.#abort.abort();
    this.#detailQueue = [];
  }

  /** Starts loading the index and the coarse level (once). */
  start(): Promise<SpriteStoryboardIndex | null> {
    this.#indexPromise ??= this.#loadIndexAndCoarse();
    return this.#indexPromise;
  }

  /** Asks for the detail sheet covering `time` (and a close neighbour). */
  requestDetail(time: number): void {
    if (this.#failed || this.destroyed || !Number.isFinite(time)) return;
    void this.start().then((index) => {
      const level = index?.detail;
      if (!index || !level || this.destroyed) return;
      const sheet = sheetIndexAtTime(level, time);
      const sheetSeconds = framesPerSheet(level) * level.interval;
      const intoSheet = time - sheet * sheetSeconds;
      const wanted = [sheet];
      if (intoSheet < NEIGHBOUR_PREFETCH_SECONDS && sheet > 0) {
        wanted.push(sheet - 1);
      } else if (
        sheetSeconds - intoSheet < NEIGHBOUR_PREFETCH_SECONDS &&
        sheet + 1 < level.sheets.length
      ) {
        wanted.push(sheet + 1);
      }
      // The newest request goes first: it is where the viewer is now.
      const fresh = wanted.filter((entry) => !this.#detailRequested.has(entry));
      if (fresh.length === 0) return;
      this.#detailQueue = [
        ...fresh,
        ...this.#detailQueue.filter((entry) => !fresh.includes(entry)),
      ];
      this.#pumpDetail(index, level);
    });
  }

  async #loadIndexAndCoarse(): Promise<SpriteStoryboardIndex | null> {
    try {
      const indexUrl = await this.#prepare(this.#options.indexUrl);
      const response = await fetch(indexUrl, {
        signal: this.#abort.signal,
        credentials: "omit",
      });
      if (!response.ok) {
        throw new Error(
          `Storyboard index request failed with ${response.status}.`,
        );
      }
      const index = parseSpriteStoryboardIndex(await response.json());
      if (!index) throw new Error("The storyboard index is not valid.");
      if (this.destroyed) return null;
      this.#index = index;

      // Sheets are shown as each one decodes, the first part of the video
      // first.
      await Promise.all(
        index.coarse.sheets.map(async (_, sheet) => {
          const url = await this.#loadSheet(index.coarse, sheet);
          if (this.destroyed) return;
          this.#coarseFrames = [
            ...this.#coarseFrames,
            ...spriteSheetFrames(
              index.coarse,
              sheet,
              url,
              index.duration,
              "sprite-coarse",
            ),
          ];
          this.#publish();
        }),
      );
      return index;
    } catch (error) {
      if (!this.destroyed) {
        this.#failed = true;
        this.#options.onError?.(error);
      }
      return null;
    }
  }

  #pumpDetail(index: SpriteStoryboardIndex, level: SpriteStoryboardLevel) {
    while (
      this.#detailInFlight < MAX_DETAIL_REQUESTS_IN_FLIGHT &&
      this.#detailQueue.length > 0 &&
      !this.destroyed
    ) {
      const sheet = this.#detailQueue.shift()!;
      if (this.#detailRequested.has(sheet)) continue;
      this.#detailRequested.add(sheet);
      this.#detailInFlight += 1;
      void this.#loadSheet(level, sheet)
        .then((url) => {
          if (this.destroyed) return;
          this.#detailFrames.set(
            sheet,
            spriteSheetFrames(
              level,
              sheet,
              url,
              index.duration,
              "sprite-detail",
            ),
          );
          this.#publish();
        })
        .catch((error: unknown) => {
          // Allow a later linger over the same part to try again.
          this.#detailRequested.delete(sheet);
          if (!this.destroyed) this.#options.onError?.(error);
        })
        .finally(() => {
          this.#detailInFlight -= 1;
          this.#pumpDetail(index, level);
        });
    }
  }

  async #loadSheet(
    level: SpriteStoryboardLevel,
    sheet: number,
  ): Promise<string> {
    const relative = level.sheets[sheet];
    if (!relative) throw new Error(`Storyboard sheet ${sheet} is missing.`);
    const url = await this.#prepare(
      new URL(relative, this.#options.indexUrl).href,
    );
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return url;
  }

  async #prepare(url: string): Promise<string> {
    return (await this.#options.prepareUrl?.(url)) ?? url;
  }

  #publish(): void {
    if (this.destroyed) return;
    const detail = [...this.#detailFrames.values()].flat();
    // Where both levels cover a moment, the detail frame starts later and
    // so wins in `getThumbnailAtTime`.
    this.#options.onFrames([...this.#coarseFrames, ...detail]);
  }

  /** The index, once loaded. */
  get index(): SpriteStoryboardIndex | null {
    return this.#index;
  }
}
