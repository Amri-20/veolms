import { useLayoutEffect, useRef, type CanvasHTMLAttributes } from "react";
import {
  decodeSpriteSheet,
  getDecodedSpriteSheet,
} from "../storyboard/spriteSheetStore";
import type { StoryboardFrame } from "../storyboard/storyboardTypes";

/** The drawing's own width; every frame is scaled into it. */
const CANVAS_WIDTH = 480;

/**
 * Draws one storyboard frame from a sheet kept in `spriteSheetStore`.
 *
 * The canvas keeps its last picture until the next one is drawn, so moving
 * between frames never flashes black, even when a sheet has to be decoded
 * again first. It stays invisible until its first picture (normally drawn
 * before the first paint, from the decoded sheet).
 */
export function SpriteFrameCanvas({
  className,
  frame,
  onDrawn,
  ...canvasProps
}: Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children"> & {
  frame: StoryboardFrame;
  /** Called after each picture is drawn. */
  onDrawn?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDrawnRef = useRef(onDrawn);
  useLayoutEffect(() => {
    onDrawnRef.current = onDrawn;
  });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const width = frame.width ?? 1;
    const height = frame.height ?? 1;
    const canvasHeight = Math.max(
      1,
      Math.round((CANVAS_WIDTH * height) / width),
    );
    if (canvas.width !== CANVAS_WIDTH || canvas.height !== canvasHeight) {
      // Resizing clears the drawing; only a frame of another shape does it.
      canvas.width = CANVAS_WIDTH;
      canvas.height = canvasHeight;
    }

    const draw = (sheet: ImageBitmap) => {
      const context = canvas.getContext("2d");
      if (!context) return;
      try {
        context.imageSmoothingQuality = "high";
        context.drawImage(
          sheet,
          frame.x ?? 0,
          frame.y ?? 0,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        canvas.style.opacity = "1";
        onDrawnRef.current?.();
      } catch {
        // The sheet was let go between decoding and drawing; the next
        // frame draws again.
      }
    };

    const decoded = getDecodedSpriteSheet(frame.imageUrl);
    if (decoded) {
      draw(decoded);
      return undefined;
    }
    let current = true;
    void decodeSpriteSheet(frame.imageUrl).then((sheet) => {
      if (current && sheet) draw(sheet);
    });
    return () => {
      current = false;
    };
  }, [frame]);

  return (
    <canvas
      {...canvasProps}
      ref={canvasRef}
      aria-hidden="true"
      className={`opacity-0 ${className ?? ""}`}
    />
  );
}
