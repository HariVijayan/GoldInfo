/** Change per week, month, or year. Percentages are numbers such as 1.25 meaning 1.25%. */
import {
  MONTHLY_RETURN_MINIMUM_SPAN_DAYS,
  YEARLY_RETURN_MINIMUM_SPAN_DAYS,
} from "../../../config/analysis/analysisChartConfig";
import type { ToneBarDatum } from "../../../types/shared/chartTypes";
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";
import { formatDayAndMonth, formatLongDate, formatMonthAndYear, parseIsoDate, toIsoDate } from "../chartDates";
import { getChangeTone } from "../formatters";

export type PeriodGranularity = "week" | "month" | "year";

export function chooseReturnGranularity(spanInDays: number): PeriodGranularity {
  if (spanInDays >= YEARLY_RETURN_MINIMUM_SPAN_DAYS) return "year";
  if (spanInDays >= MONTHLY_RETURN_MINIMUM_SPAN_DAYS) return "month";
  return "week";
}

/** Weeks start on Monday, matching how traders read a week. */
function findMondayOfWeek(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return toIsoDate(date);
}

function buildPeriodKey(isoDate: string, granularity: PeriodGranularity): string {
  if (granularity === "year") return isoDate.slice(0, 4);
  if (granularity === "month") return isoDate.slice(0, 7);
  return findMondayOfWeek(isoDate);
}

function formatPeriodLabel(periodKey: string, granularity: PeriodGranularity): string {
  if (granularity === "year") return periodKey;
  if (granularity === "month") return formatMonthAndYear(`${periodKey}-01`);
  return formatDayAndMonth(periodKey);
}

type PeriodClose = { periodKey: string; lastDate: string; closingValue: number };

/** Last value of each period, in date order. */
export function collectPeriodCloses(points: SeriesPoint[], granularity: PeriodGranularity): PeriodClose[] {
  const periodCloses: PeriodClose[] = [];

  for (const point of points) {
    const periodKey = buildPeriodKey(point.date, granularity);
    const latestClose = periodCloses[periodCloses.length - 1];

    if (latestClose && latestClose.periodKey === periodKey) {
      latestClose.lastDate = point.date;
      latestClose.closingValue = point.value;
    } else {
      periodCloses.push({ periodKey, lastDate: point.date, closingValue: point.value });
    }
  }

  return periodCloses;
}

/**
 * Change over each week, month, or year. The first bar is measured from the
 * first point of the series, so it may cover a partial period.
 */
export function calculatePeriodReturns(
  series: SeriesPoint[],
  granularity: PeriodGranularity
): ToneBarDatum[] {
  if (series.length < 2) return [];

  const returnBars: ToneBarDatum[] = [];
  let previousClose = series[0].value;

  for (const periodClose of collectPeriodCloses(series.slice(1), granularity)) {
    if (previousClose > 0) {
      const returnPct = (periodClose.closingValue / previousClose - 1) * 100;
      returnBars.push({
        label: formatPeriodLabel(periodClose.periodKey, granularity),
        value: returnPct,
        tone: getChangeTone(returnPct),
        detail: `Up to ${formatLongDate(periodClose.lastDate)}`,
      });
    }
    previousClose = periodClose.closingValue;
  }

  return returnBars;
}
