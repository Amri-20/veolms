import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { DeviceRotateIcon as DeviceRotate } from "@phosphor-icons/react/DeviceRotate";
import { PlayerIconButton } from "@veolms/video-player";
import {
  getDocumentFullscreenElement,
  isInstalledAppDisplay,
  unlockScreenOrientation,
} from "../../fullscreen";

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
}

type ReadingOrientation = "portrait" | "landscape";

interface LockableOrientation {
  lock?: (orientation: ReadingOrientation) => Promise<void> | void;
}

const currentOrientation = (): ReadingOrientation =>
  window.matchMedia("(orientation: landscape)").matches
    ? "landscape"
    : "portrait";

/** Turns the screen to `orientation`; false where the browser cannot. */
async function lockOrientation(orientation: ReadingOrientation) {
  const target = window.screen?.orientation as LockableOrientation | undefined;
  if (!target?.lock) return false;
  try {
    await Promise.resolve(target.lock(orientation));
    return true;
  } catch {
    return false;
  }
}

/**
 * A reading lesson's full screen: the reading area alone fills the screen,
 * the way it is held (upright on a phone, sideways on a laptop or a tablet
 * held sideways). While it is full screen, a touch device can also turn it
 * the other way.
 */
export function useLessonReadingFullscreen(
  surfaceRef: RefObject<HTMLElement | null>,
  /** A reading is on the stage (the surface is mounted). */
  enabled: boolean,
) {
  const [fullscreen, setFullscreen] = useState(false);
  const [available, setAvailable] = useState(false);
  // Turning the screen needs a touch device whose browser can lock it,
  // which is only known by trying; it is offered until a try fails.
  const [canRotate, setCanRotate] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const surface = surfaceRef.current as WebkitFullscreenElement | null;
    setAvailable(
      Boolean(surface?.requestFullscreen || surface?.webkitRequestFullscreen) &&
        !isInstalledAppDisplay(),
    );
    setCanRotate(
      window.matchMedia("(pointer: coarse)").matches &&
        typeof (window.screen?.orientation as LockableOrientation | undefined)
          ?.lock === "function",
    );
    const sync = () => {
      const active =
        surface !== null && getDocumentFullscreenElement() === surface;
      setFullscreen(active);
      if (!active) unlockScreenOrientation();
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [enabled, surfaceRef]);

  const exit = useCallback(async () => {
    if (!getDocumentFullscreenElement()) return;
    const target = document as WebkitFullscreenDocument;
    try {
      await Promise.resolve(
        document.exitFullscreen?.() ?? target.webkitExitFullscreen?.(),
      );
    } catch {
      // Already left (the back gesture, the Escape key).
    }
  }, []);

  const enter = useCallback(async () => {
    const surface = surfaceRef.current as WebkitFullscreenElement | null;
    if (!surface) return;
    try {
      await Promise.resolve(
        surface.requestFullscreen?.() ?? surface.webkitRequestFullscreen?.(),
      );
    } catch {
      return;
    }
    // A phone's browser may turn sideways on its own in full screen; the
    // reading keeps the way the device is held.
    if (window.matchMedia("(pointer: coarse)").matches) {
      void lockOrientation(currentOrientation());
    }
  }, [surfaceRef]);

  const rotate = useCallback(async () => {
    const next = currentOrientation() === "portrait" ? "landscape" : "portrait";
    if (!(await lockOrientation(next))) setCanRotate(false);
  }, []);

  return {
    available,
    canRotate: canRotate && fullscreen,
    enter,
    exit,
    fullscreen,
    rotate,
  };
}

/**
 * The reading's full screen button in the bottom corner, with the button
 * that turns the screen beside it while full screen.
 */
export function LessonReadingFullscreenControls({
  enterIcon,
  exitIcon,
  readingFullscreen,
}: {
  enterIcon: ReactNode;
  exitIcon: ReactNode;
  readingFullscreen: ReturnType<typeof useLessonReadingFullscreen>;
}) {
  const { available, canRotate, enter, exit, fullscreen, rotate } =
    readingFullscreen;
  if (!available) return null;
  const buttonClass =
    "!size-9 !rounded-full !bg-[color-mix(in_srgb,var(--canvas)_55%,transparent)] !shadow-none backdrop-blur-sm";
  return (
    <div
      className="pointer-events-auto absolute right-2 bottom-2 z-30 flex items-center gap-1"
      data-player-fullscreen-swipe-ignore=""
    >
      {canRotate ? (
        <PlayerIconButton
          label="Rotate screen"
          title="Rotate screen"
          className={buttonClass}
          icon={<DeviceRotate size={20} weight="bold" />}
          onClick={() => void rotate()}
        />
      ) : null}
      <PlayerIconButton
        label={fullscreen ? "Exit full screen" : "Full screen"}
        title={fullscreen ? "Exit full screen" : "Full screen"}
        className={buttonClass}
        icon={fullscreen ? exitIcon : enterIcon}
        onClick={() => void (fullscreen ? exit() : enter())}
      />
    </div>
  );
}
