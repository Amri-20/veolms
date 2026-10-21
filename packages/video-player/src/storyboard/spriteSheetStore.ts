/**
 * Sprite sheets kept by the page itself, so a storyboard frame can be drawn
 * the moment it is chosen. The browser's own image cache was not reliable
 * for this: it drops the decoded picture of a large sheet whenever it likes
 * and decodes it again on the next paint, which showed as a black frame,
 * and a sheet requested again after its playback token expired did not
 * load at all.
 *
 * Each sheet is fetched once and kept as its compressed bytes (a few
 * hundred kilobytes). Decoded pictures are kept too, but only up to
 * `DECODED_BUDGET_BYTES` (a 2400x1350 detail sheet is about 13 MB once
 * decoded); the least recently drawn are let go first and decoded again
 * from their bytes when needed.
 */

const DECODED_BUDGET_BYTES = 64 * 1024 * 1024;

interface SheetEntry {
  blob: Blob;
  bitmap: ImageBitmap | null;
  decoding: Promise<ImageBitmap | null> | null;
  lastUsed: number;
}

const sheets = new Map<string, SheetEntry>();
let useCounter = 0;

/**
 * Pictures that are not cut from a kept sheet (a preview video's decoded
 * pictures), drawn the same way. A provider answers for every key that
 * starts with its prefix.
 */
export interface FrameProvider {
  getDecoded(key: string): ImageBitmap | null;
  /** A close picture already decoded, to show while `key` is decoded. */
  getNearestDecoded?(key: string): ImageBitmap | null;
  decode(key: string): Promise<ImageBitmap | null>;
}

const providers = new Map<string, FrameProvider>();

export function registerFrameProvider(
  prefix: string,
  provider: FrameProvider,
): () => void {
  providers.set(prefix, provider);
  return () => {
    if (providers.get(prefix) === provider) providers.delete(prefix);
  };
}

function providerFor(key: string): FrameProvider | undefined {
  for (const [prefix, provider] of providers) {
    if (key.startsWith(prefix)) return provider;
  }
  return undefined;
}

function decodedBytes(bitmap: ImageBitmap): number {
  return bitmap.width * bitmap.height * 4;
}

function enforceBudget(keep: string): void {
  let total = 0;
  for (const entry of sheets.values()) {
    if (entry.bitmap) total += decodedBytes(entry.bitmap);
  }
  if (total <= DECODED_BUDGET_BYTES) return;
  const decoded = [...sheets.entries()]
    .filter(([key, entry]) => entry.bitmap && key !== keep)
    .sort((left, right) => left[1].lastUsed - right[1].lastUsed);
  for (const [, entry] of decoded) {
    if (total <= DECODED_BUDGET_BYTES) break;
    total -= decodedBytes(entry.bitmap!);
    entry.bitmap!.close();
    entry.bitmap = null;
  }
}

/**
 * Keeps a fetched sheet; `bitmap` is its decoded picture when the caller
 * already has one. Returns the key frames refer to it by (an object URL).
 */
export function registerSpriteSheet(
  blob: Blob,
  bitmap: ImageBitmap | null,
): string {
  const key = URL.createObjectURL(blob);
  sheets.set(key, { blob, bitmap, decoding: null, lastUsed: ++useCounter });
  if (bitmap) enforceBudget(key);
  return key;
}

export function releaseSpriteSheet(key: string): void {
  const entry = sheets.get(key);
  if (!entry) return;
  entry.bitmap?.close();
  sheets.delete(key);
  URL.revokeObjectURL(key);
}

/** Whether `key` names a sheet kept here (and so can be drawn by key). */
export function isKeptSpriteSheet(key: string): boolean {
  return sheets.has(key) || providerFor(key) !== undefined;
}

/** The decoded sheet, when it is decoded now. */
export function getDecodedSpriteSheet(key: string): ImageBitmap | null {
  const provider = providerFor(key);
  if (provider) return provider.getDecoded(key);
  const entry = sheets.get(key);
  if (!entry?.bitmap) return null;
  entry.lastUsed = ++useCounter;
  return entry.bitmap;
}

/**
 * A stand-in close to `key`, already decoded (from a preview video), or
 * null. Sheets have none: their frames are all decoded together.
 */
export function getNearestDecodedFrame(key: string): ImageBitmap | null {
  return providerFor(key)?.getNearestDecoded?.(key) ?? null;
}

/** The decoded sheet, decoding it again from its bytes when it was let go. */
export function decodeSpriteSheet(key: string): Promise<ImageBitmap | null> {
  const provider = providerFor(key);
  if (provider) return provider.decode(key);
  const entry = sheets.get(key);
  if (!entry) return Promise.resolve(null);
  entry.lastUsed = ++useCounter;
  if (entry.bitmap) return Promise.resolve(entry.bitmap);
  entry.decoding ??= createImageBitmap(entry.blob)
    .then((bitmap) => {
      entry.decoding = null;
      if (sheets.get(key) !== entry) {
        bitmap.close();
        return null;
      }
      entry.bitmap = bitmap;
      enforceBudget(key);
      return bitmap;
    })
    .catch(() => {
      entry.decoding = null;
      return null;
    });
  return entry.decoding;
}
