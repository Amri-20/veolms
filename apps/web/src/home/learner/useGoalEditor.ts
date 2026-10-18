import { useQueryClient } from "@tanstack/react-query";
import type { LearningSummaryResponse } from "@veolms/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  learningGoalKeys,
  useLearningGoalSettings,
  useUpdateLearningGoalSettings,
} from "../../services/learning-goals";
import {
  checkGoalInput,
  goalInputFromMinutes,
  type GoalUnit,
} from "./goalInput";

/**
 * The daily goal edited where it is shown (the laptop's screen, the phone's
 * card): a number and its unit, checked as it is typed, saved with the
 * check button or Enter. Esc, or a press outside the editor, leaves it as it
 * was. The goal is the same one Settings → Learning sets, so a save here is
 * what that page shows, and the other way round.
 *
 * A save sends the learner's whole goal settings (reminders included), so
 * they are read when the editor opens and the save waits for them.
 */
export function useGoalEditor(goalMinutes: number) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<GoalUnit>("min");
  const [saveFailed, setSaveFailed] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
  const settings = useLearningGoalSettings({ enabled: editing });
  const update = useUpdateLearningGoalSettings();
  const queryClient = useQueryClient();

  const check = checkGoalInput(value, unit);
  const ready = Boolean(settings.data) && !update.isPending;

  const open = useCallback(() => {
    const initial = goalInputFromMinutes(goalMinutes);
    setValue(initial.value);
    setUnit(initial.unit);
    setSaveFailed(false);
    setEditing(true);
  }, [goalMinutes]);

  const close = useCallback(() => {
    setEditing(false);
    setSaveFailed(false);
  }, []);

  const save = () => {
    if (!check.ok || !settings.data || update.isPending) return;
    if (check.minutes === goalMinutes) {
      close();
      return;
    }
    setSaveFailed(false);
    update.mutate(
      { ...settings.data.settings, dailyGoalMinutes: check.minutes },
      {
        onSuccess: () => {
          // Shown at once; the summary the save refreshes agrees with it.
          queryClient.setQueryData<LearningSummaryResponse>(
            learningGoalKeys.summary(),
            (summary) =>
              summary
                ? { ...summary, dailyGoalMinutes: check.minutes }
                : summary,
          );
          close();
        },
        onError: () => setSaveFailed(true),
      },
    );
  };

  // A press anywhere outside the editor leaves the goal as it was.
  useEffect(() => {
    if (!editing) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        editorRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [close, editing]);

  const message = !check.ok
    ? check.message
    : saveFailed
      ? "Couldn't save your goal. Try again."
      : settings.isError
        ? "Couldn't load your goal settings. Try again later."
        : null;

  return {
    editing,
    open,
    close,
    save,
    value,
    setValue,
    unit,
    setUnit,
    canSave: check.ok && ready,
    saving: update.isPending,
    message,
    editorRef,
  };
}

export type GoalEditor = ReturnType<typeof useGoalEditor>;
