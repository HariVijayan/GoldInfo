import { CHART_RANGE_OPTIONS, RANGE_COVERAGE_TOLERANCE_DAYS } from "../config/chartRangeConfig";
import type { ChartRangeKey, ChartRangeOption } from "../types/chartTypes";
import { shiftIsoDateByDays, shiftIsoDateByMonths } from "./chartDates";

export function getChartRangeOption(rangeKey: ChartRangeKey): ChartRangeOption {
  return (
    CHART_RANGE_OPTIONS.find((option) => option.key === rangeKey) ??
    CHART_RANGE_OPTIONS[CHART_RANGE_OPTIONS.length - 1]
  );
}

/** First date inside the range, or null when the range is unbounded. */
export function calculateRangeStartDate(
  latestIsoDate: string,
  rangeOption: ChartRangeOption
): string | null {
  const { lookback } = rangeOption;
  if (lookback === null) return null;

  return lookback.unit === "days"
    ? shiftIsoDateByDays(latestIsoDate, -lookback.amount)
    : shiftIsoDateByMonths(latestIsoDate, -lookback.amount);
}

/** True when the downloaded data reaches back far enough to fill the range. */
export function isRangeCoveredByData(
  firstIsoDate: string,
  latestIsoDate: string,
  rangeOption: ChartRangeOption
): boolean {
  const rangeStartDate = calculateRangeStartDate(latestIsoDate, rangeOption);
  if (rangeStartDate === null) return true;

  return firstIsoDate <= shiftIsoDateByDays(rangeStartDate, RANGE_COVERAGE_TOLERANCE_DAYS);
}

/** Wording for headings, for example "the last 3 months" or "all fetched data". */
export function describeChartRange(rangeOption: ChartRangeOption): string {
  return rangeOption.lookback === null
    ? rangeOption.spokenLabel
    : `the last ${rangeOption.spokenLabel}`;
}
