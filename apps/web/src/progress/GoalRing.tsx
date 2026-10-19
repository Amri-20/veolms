import type { ReactNode } from "react";

export type GoalRingTone = "accent" | "beyond";

const arcClasses: Record<GoalRingTone, string> = {
  accent: "stroke-(--accent)",
  beyond: "stroke-emerald-500",
};

/**
 * A share of a goal as a ring: a faint track all the way round, and over
 * it an arc as long as the share. Drawn large for today and small for
 * each day of the calendar; whatever is given as children sits in its
 * centre. The arc is measured with `pathLength`, so the share is a
 * percentage and no circumference arithmetic is needed.
 */
export function GoalRing({
  share,
  stroke = 3,
  tone = "accent",
  animate = true,
  className = "",
  children,
}: {
  /** 0 to 1. */
  share: number;
  /** In the ring's own units: the ring is 40 across. */
  stroke?: number;
  tone?: GoalRingTone;
  /** The arc grows into place when it first appears. */
  animate?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  // A few seconds of a long goal would draw only the arc's round cap, a
  // dot at the top that reads as more than it is; below half a percent
  // the track stands alone.
  const clamped = share < 0.005 ? 0 : Math.min(1, share);
  return (
    <span className={`relative grid place-items-center ${className}`}>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="20"
          cy="20"
          r={20 - stroke / 2}
          fill="none"
          strokeWidth={stroke}
          className="stroke-(--text)/10"
        />
        {clamped > 0 ? (
          <circle
            cx="20"
            cy="20"
            r={20 - stroke / 2}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - clamped * 100}
            className={`${arcClasses[tone]} ${
              animate
                ? "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                : ""
            }`}
          />
        ) : null}
      </svg>
      {children}
    </span>
  );
}
