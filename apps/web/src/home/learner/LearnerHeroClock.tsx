import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/** The time it is now, read again as each minute begins. */
function useCurrentMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const waitForNextMinute = () => {
      // A little past the minute, so a timer that fires early still reads
      // the new one.
      timer = window.setTimeout(
        () => {
          setNow(new Date());
          waitForNextMinute();
        },
        MINUTE_MS - (Date.now() % MINUTE_MS) + 50,
      );
    };
    waitForNextMinute();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/**
 * The page is in English, so the day and the month are named in English
 * whatever the device's language. The clock keeps the device's own choice
 * of twelve or twenty-four hours.
 */
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function formatDay(date: Date) {
  const parts = dayFormat.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("day")} ${part("month")}`;
}

function formatTime(date: Date) {
  const { hour12 } = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).resolvedOptions();
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  }).format(date);
}

/**
 * The line over the learner's greeting: today's date and the time, which
 * keeps itself current. Only ever rendered in the browser, for a learner
 * who is signed in, so reading the clock while rendering is safe.
 */
export function LearnerHeroClock({ className }: { className: string }) {
  const now = useCurrentMinute();
  return (
    <p className={className}>
      <time dateTime={now.toISOString()}>
        {formatDay(now)}
        <span aria-hidden="true" className="mx-[0.6em]">
          ·
        </span>
        {formatTime(now)}
      </time>
    </p>
  );
}
