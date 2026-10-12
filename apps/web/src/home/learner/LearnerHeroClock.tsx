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
 * Puts the reader's own date and time into the line before it is first
 * drawn. A page built ahead of time carries the hour it was built at; this
 * runs as the browser reads the line, long before the page's code does, and
 * writes the same words the component would (see `formatDay`, `formatTime`).
 */
const FILL_CLOCK_SCRIPT = `(()=>{try{var t=document.currentScript.previousElementSibling.firstElementChild,d=new Date(),p=new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long"}).formatToParts(d),g=function(k){for(var i=0;i<p.length;i++)if(p[i].type===k)return p[i].value;return""},h=new Intl.DateTimeFormat(void 0,{hour:"numeric"}).resolvedOptions().hour12;t.firstChild.data=g("weekday")+", "+g("day")+" "+g("month");t.lastChild.data=new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:h}).format(d);t.dateTime=d.toISOString()}catch(e){}})();`;

/**
 * The line over the learner's greeting: today's date and the time, which
 * keeps itself current.
 *
 * It reads the clock while rendering, which is right in the browser. Where
 * it may also be rendered ahead of time (the home's shell), `fillBeforePaint`
 * adds a script that corrects the words as the browser reads them; the page's
 * code then leaves them as it finds them and carries on from there.
 */
export function LearnerHeroClock({
  className,
  fillBeforePaint = false,
}: {
  className: string;
  fillBeforePaint?: boolean;
}) {
  const now = useCurrentMinute();
  return (
    <>
      <p className={className}>
        <time dateTime={now.toISOString()} suppressHydrationWarning>
          {formatDay(now)}
          <span aria-hidden="true" className="mx-[0.6em]">
            ·
          </span>
          {formatTime(now)}
        </time>
      </p>
      {fillBeforePaint ? (
        <script dangerouslySetInnerHTML={{ __html: FILL_CLOCK_SCRIPT }} />
      ) : null}
    </>
  );
}
