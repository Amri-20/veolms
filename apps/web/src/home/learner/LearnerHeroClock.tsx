import { useEffect, useState } from "react";

const SECOND_MS = 1_000;

/** The time it is now, read again as each second begins. */
function useCurrentSecond() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const waitForNextSecond = () => {
      // A little past the second, so a timer that fires early still reads
      // the new one.
      timer = window.setTimeout(
        () => {
          setNow(new Date());
          waitForNextSecond();
        },
        SECOND_MS - (Date.now() % SECOND_MS) + 20,
      );
    };
    waitForNextSecond();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/**
 * The page is in English, so the day and the month are named in English
 * whatever the device's language. The time is always told in twelve hours
 * with AM or PM, and with its seconds, whatever the device's own setting.
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

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

/** "07", "20", "41" and "PM": the hour always has two figures. */
function timeParts(date: Date) {
  const parts = timeFormat.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return {
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
    period: part("dayPeriod").toUpperCase(),
  };
}

/**
 * Each pair of figures stands in a box of its own fixed width, so nothing
 * after it moves as the seconds change, whatever widths the face gives its
 * figures. The box is two figures and their letter spacing wide.
 */
const figurePairClasses = "inline-block w-[calc(2ch_+_0.32em)]";

/** The figures' boxes as markup, for the script that fills the line early. */
const FIGURE_PAIR_CLASSES_JS = JSON.stringify(figurePairClasses);

/**
 * Puts the reader's own date and time into the line before it is first
 * drawn. A page built ahead of time carries the hour it was built at; this
 * runs as the browser reads the line, long before the page's code does, and
 * writes the same words the component would (see `formatDay`, `formatTime`).
 */
const FILL_CLOCK_SCRIPT = `(()=>{try{var t=document.currentScript.previousElementSibling.firstElementChild,d=new Date(),p=new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long"}).formatToParts(d),g=function(k){for(var i=0;i<p.length;i++)if(p[i].type===k)return p[i].value;return""};t.firstChild.data=g("weekday")+", "+g("day")+" "+g("month");var q=new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!0}).formatToParts(d),v=function(k){for(var i=0;i<q.length;i++)if(q[i].type===k)return q[i].value;return""},b=function(x){return'<span class="'+${FIGURE_PAIR_CLASSES_JS}+'">'+x+"</span>"};t.lastChild.innerHTML=b(v("hour"))+":"+b(v("minute"))+":"+b(v("second"))+"<span> "+v("dayPeriod").toUpperCase()+"</span>";t.dateTime=d.toISOString()}catch(e){}})();`;

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
  const now = useCurrentSecond();
  const time = timeParts(now);
  return (
    <>
      <p className={className}>
        {/* Figures of one width, so the line keeps still as the seconds
            change. */}
        <time
          dateTime={now.toISOString()}
          suppressHydrationWarning
          className="tabular-nums"
        >
          {formatDay(now)}
          <span aria-hidden="true" className="mx-[0.6em]">
            ·
          </span>
          {/* Each figure box holds the time the page was built at until the
              page's code takes over (the early script has written the
              reader's own by then), so each is allowed to differ. The
              period is one text node, as the early script writes it. */}
          <span>
            <span className={figurePairClasses} suppressHydrationWarning>
              {time.hour}
            </span>
            :
            <span className={figurePairClasses} suppressHydrationWarning>
              {time.minute}
            </span>
            :
            <span className={figurePairClasses} suppressHydrationWarning>
              {time.second}
            </span>
            <span suppressHydrationWarning>{` ${time.period}`}</span>
          </span>
        </time>
      </p>
      {fillBeforePaint ? (
        <script dangerouslySetInnerHTML={{ __html: FILL_CLOCK_SCRIPT }} />
      ) : null}
    </>
  );
}
