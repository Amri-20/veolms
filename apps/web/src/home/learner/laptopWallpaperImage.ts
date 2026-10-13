/**
 * Turns a picture the learner picked into the laptop's wallpaper: cut to
 * the screen's shape from its middle, no larger than the screen is drawn on
 * a dense display, and small enough to keep in the browser (see
 * `laptopWallpaper.ts`). The picture never leaves the browser.
 */

/** Twice the laptop screen's layout size (see `HeroLaptopScreen`). */
const WALLPAPER_WIDTH = 1600;
const WALLPAPER_HEIGHT = 1060;

/** What is read at all; a phone's photograph is well under this. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
/**
 * The most the kept picture may take, as the text it is stored as. Browsers
 * give a site about five million characters in all, shared with everything
 * else the app keeps.
 */
const MAX_STORED_CHARACTERS = 700_000;
/** Tried in turn until the picture is small enough. */
const QUALITIES = [0.82, 0.72, 0.6, 0.48] as const;

export class LaptopWallpaperImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const address = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(address);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(address);
      reject(new LaptopWallpaperImageError("That picture could not be read."));
    };
    image.src = address;
  });
}

/** The picture as a data URL, ready for `saveOwnLaptopWallpaper`. */
export async function prepareLaptopWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new LaptopWallpaperImageError("Choose a picture (JPG, PNG or WebP).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new LaptopWallpaperImageError(
      "That picture is too large. Choose one under 25 MB.",
    );
  }

  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new LaptopWallpaperImageError("That picture could not be read.");
  }

  // Fill the screen's shape from the middle of the picture; a picture
  // smaller than the screen is not enlarged past its own pixels.
  const shape = WALLPAPER_WIDTH / WALLPAPER_HEIGHT;
  const cropWidth = Math.min(image.naturalWidth, image.naturalHeight * shape);
  const cropHeight = cropWidth / shape;
  const width = Math.round(Math.min(WALLPAPER_WIDTH, cropWidth));
  const height = Math.round(width / shape);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new LaptopWallpaperImageError(
      "This browser could not prepare the picture.",
    );
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (image.naturalWidth - cropWidth) / 2,
    (image.naturalHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height,
  );

  for (const quality of QUALITIES) {
    // A browser that cannot write WebP answers with a PNG, which is far
    // too large for a photograph; JPEG is asked for instead.
    const webp = canvas.toDataURL("image/webp", quality);
    const dataUrl = webp.startsWith("data:image/webp")
      ? webp
      : canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_STORED_CHARACTERS) return dataUrl;
  }
  throw new LaptopWallpaperImageError(
    "That picture is too detailed to keep here. Try a simpler one.",
  );
}
