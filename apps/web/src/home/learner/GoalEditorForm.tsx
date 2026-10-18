import { CheckIcon as Check } from "@phosphor-icons/react/Check";
import { useEffect, useId, useRef } from "react";
import type { GoalUnit } from "./goalInput";
import type { GoalEditor } from "./useGoalEditor";

/**
 * The daily goal's figures while they are being edited: today's amount as
 * it was, then the goal as a field with its unit (minutes or hours) and the
 * check button that saves it. The check stays on screen the whole time the
 * editor is open. What is wrong with the value is said under it.
 *
 * The laptop's screen is laid out in its own large pixels (see
 * `LearnerGoalScreen`), the phone's card in the page's; each has its sizes.
 */
const sizes = {
  laptop: {
    row: "mt-4 flex items-center gap-5 leading-none whitespace-nowrap @[50rem]/home:mt-3 @[50rem]/home:gap-4",
    done: "text-[128px] font-extrabold tracking-[-0.03em] @[50rem]/home:text-[104px]",
    slash:
      "text-[66px] font-semibold text-(--goal-ink)/90 @[50rem]/home:text-[56px]",
    input:
      "h-28 w-[3.6ch] rounded-3xl bg-white/14 px-5 text-[66px] font-semibold text-white outline-none ring-4 ring-white/20 focus:ring-(--goal-accent) aria-invalid:ring-rose-400 @[50rem]/home:h-24 @[50rem]/home:text-[56px]",
    units: "flex rounded-full bg-white/12 p-2",
    unit: "h-18 rounded-full px-6 text-[36px] font-semibold text-white/75 aria-pressed:bg-white aria-pressed:text-black @[50rem]/home:h-15 @[50rem]/home:text-[30px]",
    save: "grid size-24 shrink-0 place-items-center rounded-full bg-white text-black hover:bg-white/85 disabled:opacity-45 @[50rem]/home:size-20",
    saveIcon: "size-12 @[50rem]/home:size-10",
    message:
      "mt-4 text-[30px] leading-tight font-medium text-rose-300 @[50rem]/home:text-[26px]",
  },
  card: {
    row: "mt-2 flex items-center gap-2 leading-none whitespace-nowrap",
    done: "text-[2.75rem] font-extrabold tracking-[-0.03em]",
    slash: "text-2xl font-semibold text-(--muted)",
    input:
      "h-11 w-[3.6ch] rounded-xl bg-current/8 px-2 text-2xl font-semibold text-(--text) outline-none ring-1 ring-current/15 focus:ring-2 focus:ring-(--accent) aria-invalid:ring-2 aria-invalid:ring-rose-500",
    units: "flex rounded-full bg-current/8 p-0.5",
    unit: "h-8 rounded-full px-2.5 text-sm font-semibold text-(--muted) aria-pressed:bg-(--accent) aria-pressed:text-(--on-accent,white)",
    save: "grid size-11 shrink-0 place-items-center rounded-xl bg-(--accent) text-(--on-accent,white) hover:brightness-110 disabled:opacity-45",
    saveIcon: "size-5",
    message:
      "mt-2 text-sm font-medium text-rose-500 [:root:not([data-theme=light])_&]:text-rose-300",
  },
} as const;

const UNITS: Array<[GoalUnit, string, string]> = [
  ["min", "min", "Minutes"],
  ["hr", "hr", "Hours"],
];

export function GoalEditorForm({
  editor,
  done,
  variant,
}: {
  editor: GoalEditor;
  /** Today's amount, as the figures show it. */
  done: string;
  variant: keyof typeof sizes;
}) {
  const size = sizes[variant];
  const inputRef = useRef<HTMLInputElement>(null);
  const messageId = useId();

  // The field takes the keyboard as the editor opens, with its number
  // selected so it can be typed over. Held where it is: the laptop is a
  // picture drawn in perspective, and scrolling to it would move the page.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }, []);

  return (
    <>
      <form
        ref={editor.editorRef}
        aria-label="Edit your daily goal"
        className={size.row}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          editor.save();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          editor.close();
        }}
      >
        <strong className={size.done}>{done}</strong>
        <span aria-hidden="true" className={size.slash}>
          /
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          aria-label={`Daily goal in ${editor.unit === "hr" ? "hours" : "minutes"}`}
          aria-invalid={editor.message ? true : undefined}
          aria-describedby={editor.message ? messageId : undefined}
          value={editor.value}
          onChange={(event) => editor.setValue(event.target.value)}
          maxLength={6}
          className={size.input}
        />
        <span role="group" aria-label="Unit" className={size.units}>
          {UNITS.map(([unit, label, name]) => (
            <button
              key={unit}
              type="button"
              aria-pressed={editor.unit === unit}
              aria-label={name}
              onClick={() => editor.setUnit(unit)}
              className={`cursor-pointer transition-colors ${size.unit}`}
            >
              {label}
            </button>
          ))}
        </span>
        <button
          type="submit"
          disabled={!editor.canSave}
          aria-label="Save your daily goal"
          title="Save"
          className={`cursor-pointer transition-[background-color,opacity] disabled:cursor-default ${size.save}`}
        >
          <Check weight="bold" aria-hidden="true" className={size.saveIcon} />
        </button>
      </form>
      {editor.message ? (
        <p id={messageId} role="alert" className={size.message}>
          {editor.message}
        </p>
      ) : null}
    </>
  );
}
