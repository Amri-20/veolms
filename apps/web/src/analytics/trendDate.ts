/**
 * The label for one day of an analytics trend. The API buckets a trend by
 * UTC calendar day ("2026-10-12"), so the label is that UTC day: formatted
 * in the viewer's own time zone, a day read as the one before it anywhere
 * west of UTC. The dashboard revenue chart labels its days the same way.
 */
export function formatTrendDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
