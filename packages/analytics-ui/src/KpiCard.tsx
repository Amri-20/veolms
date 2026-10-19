import type { ReactNode } from "react";
import type { AnalyticsKpi } from "@veolms/contracts";
import { Sparkline } from "./charts/Sparkline";
import { formatWholeNumber } from "./format";
import { analyticsCardClasses } from "./surfaces";
import { KPI_TONE_CLASSES, KPI_TONE_COLORS, type KpiTone } from "./tones";

/**
 * One headline number: label, icon chip, value, the change against the
 * period before, and a small sparkline of the same series when one is
 * given. `invertTrend` for figures where down is good (refund rate).
 */
export function KpiCard({
  icon,
  label,
  kpi,
  format = formatWholeNumber,
  tone = "accent",
  trend,
  invertTrend = false,
  changeSuffix = "% vs previous",
}: {
  icon?: ReactNode;
  label: string;
  kpi: AnalyticsKpi;
  format?: (value: number) => string;
  tone?: KpiTone;
  /** Day values of the same figure, drawn as a sparkline under the number. */
  trend?: ReadonlyArray<number>;
  invertTrend?: boolean;
  changeSuffix?: string;
}) {
  const hasChange = kpi.changePercent !== null;
  const change = kpi.changePercent ?? 0;
  const isUp = change >= 0;
  const isGood = invertTrend ? !isUp || change === 0 : isUp;
  const showSparkline = trend !== undefined && trend.length > 1;
  return (
    <div
      data-fixed-radius
      className={`${analyticsCardClasses} flex flex-col p-2.5 sm:p-5 transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <p className="text-[0.7rem] sm:text-xs font-semibold leading-snug text-(--muted) tracking-wide">
          {label}
        </p>
        {icon ? (
          <span
            className={`flex size-6 sm:size-7 shrink-0 items-center justify-center rounded-lg ${KPI_TONE_CLASSES[tone]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 sm:mt-2.5 text-xl sm:text-[1.75rem] font-bold tracking-tight text-(--text) tabular-nums">
        {format(kpi.value)}
      </p>
      {hasChange ? (
        <p
          className={`mt-0.5 sm:mt-1 text-[0.68rem] sm:text-xs font-semibold ${
            isGood ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          <span aria-hidden="true">{isUp ? "↗" : "↘"}</span>{" "}
          {Math.abs(change).toFixed(1)}
          {changeSuffix}
        </p>
      ) : (
        // No change is given when the period before had nothing to compare
        // with. "New this period" said that of every tile, including ones
        // (an average, a total) that are not new at all.
        <p className="mt-0.5 sm:mt-1 text-[0.68rem] sm:text-xs text-(--muted)">
          No earlier period to compare
        </p>
      )}
      {showSparkline ? (
        <div className="mt-2 sm:mt-3 -mb-0.5">
          <Sparkline values={trend} color={KPI_TONE_COLORS[tone]} />
        </div>
      ) : null}
    </div>
  );
}
