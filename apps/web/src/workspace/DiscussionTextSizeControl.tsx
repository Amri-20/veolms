import { useState } from "react";
import { TextAaIcon as TextAa } from "@phosphor-icons/react/TextAa";
import { AppSlider } from "../AppSlider";
import {
  DISCUSSION_TEXT_SCALE_MAX,
  DISCUSSION_TEXT_SCALE_MIN,
  DISCUSSION_TEXT_SCALE_STEP,
  useDiscussionTextScale,
} from "./discussionTextScale";

/**
 * The text size of the discussion in the panel, as a reading lesson has it:
 * an "Aa" circle that opens into a slider while the pointer is over it (or
 * it has the keyboard), and when it is pressed, which a touch screen needs.
 */
export function DiscussionTextSizeControl() {
  const [scale, setScale] = useDiscussionTextScale();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expanded = open || hovered || focused;

  return (
    <div
      className={`flex h-8 shrink-0 items-center overflow-hidden rounded-full transition-[width,background-color] duration-200 ease-out ${
        expanded
          ? "w-32 bg-[color-mix(in_srgb,var(--text)_7%,transparent)]"
          : "w-8"
      }`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
          setFocused(false);
        }
      }}
    >
      <button
        type="button"
        aria-label="Text size"
        title="Text size"
        aria-expanded={expanded}
        onClick={() => setOpen((value) => !value)}
        className={`grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-(--accent) ${
          expanded
            ? "text-(--text)"
            : "text-(--muted) hover:bg-(--hover) hover:text-(--text)"
        }`}
      >
        <TextAa size={17} weight="bold" aria-hidden="true" />
      </button>
      <AppSlider
        min={DISCUSSION_TEXT_SCALE_MIN}
        max={DISCUSSION_TEXT_SCALE_MAX}
        step={DISCUSSION_TEXT_SCALE_STEP}
        value={scale}
        aria-label="Text size"
        aria-valuetext={`${Math.round(scale * 100)} percent`}
        tabIndex={expanded ? 0 : -1}
        className={`min-w-0 transition-[width,opacity,margin] duration-200 ease-out ${
          expanded ? "mr-3 ml-1 w-full opacity-100" : "w-0 opacity-0"
        }`}
        onChange={(event) => setScale(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
