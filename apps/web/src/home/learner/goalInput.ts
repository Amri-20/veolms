/**
 * The daily goal as the learner types it on the home page: a number, in
 * minutes or in hours. The API keeps whole minutes between these bounds
 * (`learningGoalSettingsSchema`), so the two are checked here before a save
 * and the learner is told what is wrong in words.
 */
export type GoalUnit = "min" | "hr";

export const GOAL_MINUTES_MIN = 15;
export const GOAL_MINUTES_MAX = 720;

/** What the field shows when it opens: hours for whole or half hours. */
export function goalInputFromMinutes(minutes: number): {
  value: string;
  unit: GoalUnit;
} {
  if (minutes >= 60 && minutes % 30 === 0) {
    return { value: String(minutes / 60), unit: "hr" };
  }
  return { value: String(minutes), unit: "min" };
}

export type GoalInputCheck =
  { ok: true; minutes: number } | { ok: false; message: string };

/** The minutes the field stands for, or what is wrong with it. */
export function checkGoalInput(value: string, unit: GoalUnit): GoalInputCheck {
  const text = value.trim().replace(",", ".");
  if (!text) return { ok: false, message: "Enter your daily goal." };
  if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(text)) {
    return { ok: false, message: "Use numbers only, like 45 or 1.5." };
  }
  const amount = Number(text);
  const minutes = unit === "hr" ? amount * 60 : amount;
  // 0.1 hours is 6 minutes; 0.33 hours is not a whole number of them.
  if (Math.abs(minutes - Math.round(minutes)) > 1e-9) {
    return {
      ok: false,
      message:
        unit === "hr"
          ? "Use whole minutes, like 1.25 or 1.5 hours."
          : "Use whole minutes.",
    };
  }
  const whole = Math.round(minutes);
  if (whole < GOAL_MINUTES_MIN) {
    return { ok: false, message: "Set at least 15 minutes a day." };
  }
  if (whole > GOAL_MINUTES_MAX) {
    return { ok: false, message: "Set at most 12 hours a day." };
  }
  return { ok: true, minutes: whole };
}
