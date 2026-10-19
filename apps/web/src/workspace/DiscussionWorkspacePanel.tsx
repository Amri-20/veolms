import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { SlideOverFrame } from "../components/SlideOverPanel";
import {
  SplitFrameGutter,
  SplitFramePane,
  useSplitFrameWidth,
} from "../components/SplitFramePane";
import {
  Drawer,
  DrawerContent,
  type DrawerDismissThen,
} from "../components/ui/drawer";
import {
  getRightPanelShortcutLabel,
  RIGHT_PANEL_SHORTCUT_ARIA,
} from "../keyboardShortcuts";
import { useBackDismiss } from "../navigation/useBackDismiss";
import { useShortcutPlatform } from "../useShortcutPlatform";
import type { NavigateTo } from "../routing/navigation";
import {
  DiscussionPanelEmpty,
  DiscussionPanelContent,
  type DiscussionPanelStep,
  type DiscussionPanelVariant,
} from "./DiscussionWorkspacePanelContent";
import type { DiscussionWorkspaceCard } from "./discussions-workspace.adapter";

// Desktop is Tailwind's `lg`; a phone is the Discussions list's own phone
// width (see DiscussionWorkspaceVirtualFeed).
const DESKTOP_QUERY = "(min-width: 64rem)";
const PHONE_QUERY = "(max-width: 780px)";

const subscribeToPanelVariant = (listener: () => void) => {
  const queries = [DESKTOP_QUERY, PHONE_QUERY].map((query) =>
    window.matchMedia(query),
  );
  queries.forEach((media) => media.addEventListener("change", listener));
  return () =>
    queries.forEach((media) => media.removeEventListener("change", listener));
};

const getPanelVariant = (): DiscussionPanelVariant =>
  window.matchMedia(DESKTOP_QUERY).matches
    ? "desktop"
    : window.matchMedia(PHONE_QUERY).matches
      ? "phone"
      : "tablet";

function usePanelVariant(): DiscussionPanelVariant {
  return useSyncExternalStore(
    subscribeToPanelVariant,
    getPanelVariant,
    () => "desktop",
  );
}

interface DiscussionWorkspacePanelProps {
  /** The discussion shown; none while the list has nothing to show. */
  card: DiscussionWorkspaceCard | null;
  /** What the open panel says when there is no discussion to show. */
  emptyMessage: string;
  /** Whether a discussion is open. A closed panel shows only on a desktop,
   * as its gutter at the frame's edge. */
  open: boolean;
  /** The gutter was dragged or double-clicked open. */
  onReopen: () => void;
  destination: string | null;
  /** Whether the card's own text is being edited. */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onClose: () => void;
  onNavigatePage?: NavigateTo;
  onReport?: (card: DiscussionWorkspaceCard) => void;
  setNotice?: (message: string) => void;
  /** Stepping to the discussion above or below this one in the list. */
  step?: DiscussionPanelStep;
}

/**
 * The discussion opened from the Discussions page: beside the list on a
 * desktop, over the page from the right on a tablet, and a sheet from the
 * bottom on a phone, where a sideways swipe moves through the list.
 */
export function DiscussionWorkspacePanel(props: DiscussionWorkspacePanelProps) {
  const variant = usePanelVariant();
  if (variant === "desktop") return <DesktopPanel {...props} />;
  if (!props.open) return null;
  if (variant === "tablet") return <TabletPanel {...props} />;
  return <PhonePanel {...props} />;
}

function DesktopPanel({
  card,
  emptyMessage,
  open,
  onReopen,
  onClose,
  onNavigatePage,
  ...props
}: DiscussionWorkspacePanelProps) {
  const shortcutLabel = getRightPanelShortcutLabel(useShortcutPlatform());
  // The page says whether the panel is open; the gutter can change it too.
  // Following the page must not report back to it as a change of the user's.
  const followingPageRef = useRef(false);
  const {
    paneRef,
    contentRef,
    paneWidth,
    collapsed,
    setCollapsed,
    gutterProps,
  } = useSplitFrameWidth({
    storageKey: "veolms-discussions-panel-width",
    closedLabel: "Discussion panel closed",
    defaultCollapsed: !open,
    onCollapsedChange: (nowCollapsed) => {
      if (followingPageRef.current) return;
      if (nowCollapsed) onClose();
      else onReopen();
    },
  });
  useEffect(() => {
    if (collapsed === !open) return;
    followingPageRef.current = true;
    setCollapsed(!open);
    followingPageRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows `open` only
  }, [open]);

  return (
    <SplitFramePane
      aria-label="Discussion details"
      paneRef={paneRef}
      width={paneWidth}
      slide
      className="flex flex-col"
    >
      <SplitFrameGutter
        aria-label="Resize discussion panel"
        aria-keyshortcuts={RIGHT_PANEL_SHORTCUT_ARIA}
        title={
          collapsed
            ? `Open discussion panel · drag, double-click or ${shortcutLabel}`
            : `Resize discussion panel · double-click or ${shortcutLabel} to close`
        }
        {...gutterProps}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[inherit]">
        {/* Never narrower than the pane's minimum: while the pane slides
              to a width after a drag, its contents keep their layout and
              the edge clips them, as on the lesson page. */}
        <div
          ref={contentRef}
          className="flex min-h-0 w-full min-w-75 shrink-0 flex-col"
        >
          {/* Closed, the panel is only its gutter: nothing is fetched for a
              discussion nobody opened. A drag brings the content in with
              the first movement. */}
          {!collapsed &&
            (card ? (
              <DiscussionPanelContent
                {...props}
                card={card}
                variant="desktop"
                onClose={onClose}
                onEscape={onClose}
                onOpenInCourse={(path) =>
                  onNavigatePage?.(path, { exact: true })
                }
              />
            ) : (
              <DiscussionPanelEmpty message={emptyMessage} onClose={onClose} />
            ))}
        </div>
      </div>
    </SplitFramePane>
  );
}

function TabletPanel({
  card,
  emptyMessage,
  onClose,
  onNavigatePage,
  open: _open,
  onReopen: _onReopen,
  ...props
}: DiscussionWorkspacePanelProps) {
  // The panel covers the page, so Back closes it rather than leaving the
  // Discussions page.
  const dismissThroughHistory = useBackDismiss({
    open: true,
    onDismiss: onClose,
  });
  return (
    <SlideOverFrame
      label="Discussion details"
      onClose={onClose}
      className="max-w-[460px]"
      // A light dim, no blur: the list stays readable behind the panel.
      backdropClassName="bg-black/35"
    >
      {card ? (
        <DiscussionPanelContent
          {...props}
          card={card}
          variant="tablet"
          onEscape={onClose}
          onOpenInCourse={(path) =>
            // The panel's Back entry is taken off first, so Back from the
            // lesson returns to the list and not to a closed panel.
            dismissThroughHistory(() => onNavigatePage?.(path, { exact: true }))
          }
        />
      ) : (
        <DiscussionPanelEmpty message={emptyMessage} />
      )}
    </SlideOverFrame>
  );
}

/** How far a finger has to travel sideways to move to the next discussion. */
const STEP_SWIPE_DISTANCE = 72;

/**
 * A sideways swipe on the phone sheet moves to the discussion before or
 * after this one. The sheet follows the finger, and the new discussion
 * slides in from the side it was swiped towards. A swipe that starts in the
 * reply box, a code block or a menu is left to them.
 */
function usePhoneStepSwipe(step: DiscussionPanelStep | undefined) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    axis: "x" | "y" | null;
    dx: number;
  } | null>(null);
  const [enterFrom, setEnterFrom] = useState<"left" | "right" | null>(null);

  const setOffset = (dx: number, animate: boolean) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.transition = animate ? "transform 160ms ease-out" : "none";
    surface.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!step || event.pointerType !== "touch") return;
    const target = event.target as Element;
    if (
      target.closest(
        "[data-thread-reply-composer], pre, .cm-editor, [role=menu], input, textarea",
      )
    )
      return;
    gestureRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      axis: null,
      dx: 0,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !step) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    }
    if (gesture.axis !== "x") return;
    gesture.dx = dx;
    const canGo = dx < 0 ? step.index < step.count - 1 : step.index > 0;
    // At either end of the list the sheet only gives a little.
    setOffset(canGo ? dx : dx * 0.25, false);
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.axis !== "x" || !step) return;
    setOffset(0, false);
    if (gesture.dx <= -STEP_SWIPE_DISTANCE && step.index < step.count - 1) {
      setEnterFrom("right");
      step.onNext();
    } else if (gesture.dx >= STEP_SWIPE_DISTANCE && step.index > 0) {
      setEnterFrom("left");
      step.onPrev();
    } else {
      setOffset(0, true);
    }
  };

  return {
    surfaceRef,
    enterFrom,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}

function PhonePanel({
  onClose,
  onNavigatePage,
  card,
  emptyMessage,
  step,
  open: _open,
  onReopen: _onReopen,
  ...props
}: DiscussionWorkspacePanelProps) {
  const [open, setOpen] = useState(true);
  const dismissThenRef = useRef<DrawerDismissThen | null>(null);
  const swipe = usePhoneStepSwipe(step);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      showSwipeHandle
      dismissThenRef={dismissThenRef}
    >
      <DrawerContent
        aria-label="Discussion details"
        finalFocus={false}
        // The drawer sizes a bottom sheet under this same variant.
        className="bg-(--surface) data-[swipe-axis=y]:[--drawer-content-height:calc(100dvh-2.5rem)] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-2.5rem)]"
      >
        <div
          ref={swipe.surfaceRef}
          {...swipe.handlers}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            key={card?.id ?? "empty"}
            className={`flex min-h-0 flex-1 flex-col ${
              swipe.enterFrom === "right"
                ? "animate-in fade-in slide-in-from-right-10 duration-200"
                : swipe.enterFrom === "left"
                  ? "animate-in fade-in slide-in-from-left-10 duration-200"
                  : ""
            }`}
          >
            {card ? (
              <DiscussionPanelContent
                {...props}
                card={card}
                step={step}
                variant="phone"
                onOpenInCourse={(path) => {
                  const navigate = () =>
                    onNavigatePage?.(path, { exact: true });
                  const dismissThen = dismissThenRef.current;
                  if (dismissThen) dismissThen(navigate);
                  else navigate();
                }}
              />
            ) : (
              <DiscussionPanelEmpty message={emptyMessage} />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
