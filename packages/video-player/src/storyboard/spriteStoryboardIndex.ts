import type { StoryboardFrame } from "./storyboardTypes.ts";

/**
 * One level of a sprite storyboard: frames taken every `interval` seconds,
 * each `width` x `height`, laid out row by row in sheets of
 * `columns` x `rows` frames. Frame `n` shows the moment `n * interval`.
 */
export interface SpriteStoryboardLevel {
  interval: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  frameCount: number;
  /** Sheet image URLs, relative to the index document. */
  sheets: readonly string[];
}

/**
 * The `index.json` written next to a video's sprite sheets. `coarse` is
 * small and covers the whole video in a few sheets; `detail` is larger and
 * is fetched one sheet at a time, only where the viewer lingers.
 */
export interface SpriteStoryboardIndex {
  version: 1;
  duration: number;
  coarse: SpriteStoryboardLevel;
  detail?: SpriteStoryboardLevel;
}

function positiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function positiveInteger(value: unknown): value is number {
  return positiveNumber(value) && Number.isInteger(value);
}

function parseLevel(value: unknown): SpriteStoryboardLevel | null {
  if (!value || typeof value !== "object") return null;
  const level = value as Record<string, unknown>;
  const sheets = level.sheets;
  if (
    !positiveNumber(level.interval) ||
    !positiveInteger(level.width) ||
    !positiveInteger(level.height) ||
    !positiveInteger(level.columns) ||
    !positiveInteger(level.rows) ||
    !positiveInteger(level.frameCount) ||
    !Array.isArray(sheets) ||
    sheets.length === 0 ||
    !sheets.every((sheet) => typeof sheet === "string" && sheet.length > 0) ||
    sheets.length * level.columns * level.rows < level.frameCount
  ) {
    return null;
  }
  return {
    interval: level.interval,
    width: level.width,
    height: level.height,
    columns: level.columns,
    rows: level.rows,
    frameCount: level.frameCount,
    sheets: sheets as string[],
  };
}

/** Validates a storyboard index document; null when it is not one. */
export function parseSpriteStoryboardIndex(
  value: unknown,
): SpriteStoryboardIndex | null {
  if (!value || typeof value !== "object") return null;
  const document = value as Record<string, unknown>;
  if (document.version !== 1 || !positiveNumber(document.duration)) {
    return null;
  }
  const coarse = parseLevel(document.coarse);
  if (!coarse) return null;
  const detail =
    document.detail === undefined ? undefined : parseLevel(document.detail);
  if (detail === null) return null;
  return {
    version: 1,
    duration: document.duration,
    coarse,
    ...(detail ? { detail } : {}),
  };
}

export function framesPerSheet(level: SpriteStoryboardLevel): number {
  return level.columns * level.rows;
}

/** The sheet holding the frame shown at `time`. */
export function sheetIndexAtTime(
  level: SpriteStoryboardLevel,
  time: number,
): number {
  const frame = Math.min(
    level.frameCount - 1,
    Math.max(0, Math.floor(time / level.interval)),
  );
  return Math.floor(frame / framesPerSheet(level));
}

/**
 * The frames of one sheet, cropped from `imageUrl` (the sheet as the page
 * loaded it, token and all). The last frame of the video runs to `duration`.
 */
export function spriteSheetFrames(
  level: SpriteStoryboardLevel,
  sheetIndex: number,
  imageUrl: string,
  duration: number,
  idPrefix: string,
): StoryboardFrame[] {
  const perSheet = framesPerSheet(level);
  const first = sheetIndex * perSheet;
  const last = Math.min(level.frameCount, first + perSheet);
  const frames: StoryboardFrame[] = [];
  for (let frame = first; frame < last; frame += 1) {
    const cell = frame - first;
    const startTime = frame * level.interval;
    const endTime =
      frame === level.frameCount - 1
        ? Math.max(duration, startTime + level.interval)
        : startTime + level.interval;
    frames.push({
      id: `${idPrefix}-${frame}`,
      startTime,
      endTime,
      imageUrl,
      x: (cell % level.columns) * level.width,
      y: Math.floor(cell / level.columns) * level.height,
      width: level.width,
      height: level.height,
      sheetWidth: level.columns * level.width,
      sheetHeight: level.rows * level.height,
    });
  }
  return frames;
}
