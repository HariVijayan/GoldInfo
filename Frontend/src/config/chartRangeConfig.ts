import type { ChartRangeKey, ChartRangeOption } from "../types/chartTypes";

/** Ranges are measured back from the latest observation, not from today. */
export const CHART_RANGE_OPTIONS: ChartRangeOption[] = [
  { key: "1W", label: "1W", spokenLabel: "1 week", lookback: { unit: "days", amount: 7 } },
  { key: "2W", label: "2W", spokenLabel: "2 weeks", lookback: { unit: "days", amount: 14 } },
  { key: "3W", label: "3W", spokenLabel: "3 weeks", lookback: { unit: "days", amount: 21 } },
  { key: "1M", label: "1M", spokenLabel: "1 month", lookback: { unit: "months", amount: 1 } },
  { key: "2M", label: "2M", spokenLabel: "2 months", lookback: { unit: "months", amount: 2 } },
  { key: "3M", label: "3M", spokenLabel: "3 months", lookback: { unit: "months", amount: 3 } },
  { key: "6M", label: "6M", spokenLabel: "6 months", lookback: { unit: "months", amount: 6 } },
  { key: "9M", label: "9M", spokenLabel: "9 months", lookback: { unit: "months", amount: 9 } },
  { key: "1Y", label: "1Y", spokenLabel: "1 year", lookback: { unit: "months", amount: 12 } },
  { key: "2Y", label: "2Y", spokenLabel: "2 years", lookback: { unit: "months", amount: 24 } },
  { key: "3Y", label: "3Y", spokenLabel: "3 years", lookback: { unit: "months", amount: 36 } },
  { key: "5Y", label: "5Y", spokenLabel: "5 years", lookback: { unit: "months", amount: 60 } },
  { key: "10Y", label: "10Y", spokenLabel: "10 years", lookback: { unit: "months", amount: 120 } },
  { key: "MAX", label: "MAX", spokenLabel: "all fetched data", lookback: null },
];

export const DEFAULT_CHART_RANGE_KEY: ChartRangeKey = "MAX";

/**
 * A range counts as covered when the fetched data starts no more than this
 * many days after the range would begin. Absorbs weekends and holidays at the
 * edge of the downloaded period.
 */
export const RANGE_COVERAGE_TOLERANCE_DAYS = 7;

/** Longer series are thinned before drawing so the browser stays responsive. */
export const MAXIMUM_RENDERED_CHART_POINTS = 1000;
