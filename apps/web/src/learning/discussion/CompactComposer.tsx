import { createPortal } from "react-dom";
import { DiscussionAvatar } from "../DiscussionAvatar";
import { DESCRIPTION_SURFACE_BASE } from "../LessonDescription";
import {
  createEmptyDiscussionDraft,
  type DiscussionDraft,
} from "../discussion-editor/types";

const EMPTY_MOBILE_COMPOSER_DRAFT = createEmptyDiscussionDraft();

interface CompactComposerProps {
  draft: DiscussionDraft;
  attachmentCount: number;
  promptText?: string;
  avatar?: string | null;
  disabled?: boolean;
  onOpen: () => void;
}

// Rounded like the description card it sits under.
const COMPACT_COMPOSER_SURFACE = `${DESCRIPTION_SURFACE_BASE} rounded-xl transition-[background-color,box-shadow] hover:bg-[color-mix(in_srgb,var(--surface)_96%,var(--hover))]`;

const MOBILE_COMPOSER_SURFACE_BASE =
  "border-t border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-transparent backdrop-blur-xl px-3 pt-2 pb-[max(8px,var(--app-safe-area-bottom))]";
const MOBILE_BOTTOM_ACTION_OFFSET_CLASS =
  "bottom-[calc(58px+var(--app-viewport-safe-area-bottom))]";

interface MobileCompactComposerPortalProps {
  draft: DiscussionDraft;
  attachmentCount: number;
  promptText?: string;
  avatar?: string | null;
  mobileBottomNavigation: boolean;
  scrollHidden: boolean;
  onOpen: () => void;
}

export function MobileCompactComposerPortal({
  draft,
  attachmentCount,
  promptText,
  avatar,
  mobileBottomNavigation,
  scrollHidden,
  onOpen,
}: MobileCompactComposerPortalProps) {
  const layerTarget = document.querySelector<HTMLElement>(
    "[data-learning-motion-stage]",
  );

  return createPortal(
    <div
      data-learning-mobile-composer-layer
      className={`pointer-events-none fixed inset-x-0 z-130 box-border min-w-0 max-w-full overflow-x-clip transition-[transform,opacity] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        mobileBottomNavigation ? MOBILE_BOTTOM_ACTION_OFFSET_CLASS : "bottom-0"
      }`}
      style={{
        opacity: "var(--learning-player-content-opacity, 1)",
        transform:
          "translate3d(0, var(--learning-player-content-offset-y, 0px), 0)",
        transitionDuration:
          "var(--learning-player-content-motion-duration, 0ms)",
      }}
    >
      <div
        data-learning-mobile-composer-surface
        data-testid="mobile-discussion-composer"
        data-scroll-hidden={scrollHidden}
        aria-hidden={scrollHidden}
        className={`pointer-events-auto relative box-border min-w-0 max-w-full overflow-x-clip ${MOBILE_COMPOSER_SURFACE_BASE} transition-[transform,opacity,visibility] will-change-transform motion-reduce:transition-none ${scrollHidden ? "pointer-events-none invisible translate-y-[calc(100%+58px+var(--app-viewport-safe-area-bottom)+4px)] opacity-0 duration-180 ease-[cubic-bezier(0.4,0,1,1)]" : "visible translate-y-0 opacity-100 duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"}`}
      >
        <CompactComposer
          draft={draft}
          attachmentCount={attachmentCount}
          promptText={promptText}
          avatar={avatar}
          onOpen={onOpen}
        />
      </div>
    </div>,
    layerTarget ?? document.body,
  );
}

export function PrerenderedMobileCommentComposer() {
  return (
    <div
      data-learning-mobile-composer-prerender
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(58px+var(--app-viewport-safe-area-bottom))] z-130 box-border hidden min-w-0 max-w-full overflow-x-clip [[data-navigation-layout=compact]_&]:block [[data-learning-mobile-composer-ready=true]_&]:hidden!"
    >
      <div
        className={`relative box-border min-w-0 max-w-full overflow-x-clip ${MOBILE_COMPOSER_SURFACE_BASE}`}
      >
        <CompactComposer
          draft={EMPTY_MOBILE_COMPOSER_DRAFT}
          attachmentCount={0}
          avatar={null}
          disabled
          onOpen={() => undefined}
        />
      </div>
    </div>
  );
}

export function CompactComposer({
  draft,
  attachmentCount,
  promptText = "Write something…",
  avatar,
  disabled = false,
  onOpen,
}: CompactComposerProps) {
  const preview =
    draft.plainText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? "";
  const attachmentPreview = `${attachmentCount} ${attachmentCount === 1 ? "attachment" : "attachments"}`;

  return (
    <div
      role="button"
      data-compact-comment-composer
      aria-label="Open discussion composer"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onOpen}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`flex w-full cursor-pointer items-center gap-2 p-2 text-left ${COMPACT_COMPOSER_SURFACE} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)${disabled ? " pointer-events-none opacity-60" : ""}`}
    >
      <DiscussionAvatar src={avatar} className="pointer-events-none size-10" />
      <span className="learning-discussion__composer-prompt min-w-0 flex-1 truncate px-2 py-1.5 text-(--muted)">
        {preview || (attachmentCount > 0 ? attachmentPreview : promptText)}
      </span>
    </div>
  );
}
