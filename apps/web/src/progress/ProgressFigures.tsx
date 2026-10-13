import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/BookOpen";
import { CalendarCheckIcon as CalendarCheck } from "@phosphor-icons/react/CalendarCheck";
import { ClockIcon as Clock } from "@phosphor-icons/react/Clock";
import { TargetIcon as Target } from "@phosphor-icons/react/Target";
import { StatCard } from "../components/analytics/StatTiles";
import { formatDuration, type MonthFigures } from "./progressFormat";

/**
 * The month in four figures. While the month is being fetched the tiles
 * stand with a dash in each, so nothing moves when the figures arrive.
 */
export function ProgressFigures({
  figures,
  monthLabel,
}: {
  figures: MonthFigures | undefined;
  monthLabel: string;
}) {
  const value = (read: (figures: MonthFigures) => string) =>
    figures ? read(figures) : "–";
  return (
    <section
      aria-label={`${monthLabel} in figures`}
      aria-busy={!figures}
      className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4"
    >
      <StatCard
        icon={<Target size={16} weight="bold" aria-hidden="true" />}
        label="Goals completed"
        value={value((month) => String(month.goalsCompleted))}
        detail={
          figures
            ? `of ${figures.daysSoFar} ${figures.daysSoFar === 1 ? "day" : "days"}`
            : undefined
        }
      />
      <StatCard
        icon={<CalendarCheck size={16} weight="bold" aria-hidden="true" />}
        label="Days studied"
        value={value((month) => String(month.daysStudied))}
      />
      <StatCard
        icon={<Clock size={16} weight="bold" aria-hidden="true" />}
        label="Time learned"
        value={value((month) => formatDuration(month.seconds))}
      />
      <StatCard
        icon={<BookOpen size={16} weight="bold" aria-hidden="true" />}
        label="Lessons finished"
        value={value((month) => String(month.completions))}
      />
    </section>
  );
}
