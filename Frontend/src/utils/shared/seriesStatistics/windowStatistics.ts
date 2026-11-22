/** Summary statistics for the visible chart window. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";
import { calculateSampleStandardDeviation } from "./volatility";
import { type DrawdownResult } from "./drawdown";
import { countDirections } from "./distribution";

export type WindowStatistics = {
  changePct: number | null;
  annualisedVolatilityPct: number | null;
  maximumDrawdownPct: number;
  maximumDrawdownDate: string | null;
  bestDay: SeriesPoint | null;
  worstDay: SeriesPoint | null;
  upDayShare: number | null;
};

export function calculateWindowStatistics(
  series: SeriesPoint[],
  changes: SeriesPoint[],
  drawdown: DrawdownResult,
  periodsPerYear: number
): WindowStatistics {
  const firstValue = series[0]?.value;
  const lastValue = series[series.length - 1]?.value;
  const directionCounts = countDirections(changes);

  const bestDay = changes.reduce<SeriesPoint | null>(
    (best, change) => (best === null || change.value > best.value ? change : best),
    null
  );
  const worstDay = changes.reduce<SeriesPoint | null>(
    (worst, change) => (worst === null || change.value < worst.value ? change : worst),
    null
  );

  return {
    changePct:
      firstValue !== undefined && lastValue !== undefined && firstValue > 0
        ? (lastValue / firstValue - 1) * 100
        : null,
    annualisedVolatilityPct:
      changes.length >= 2
        ? calculateSampleStandardDeviation(changes.map((change) => change.value)) *
          Math.sqrt(periodsPerYear)
        : null,
    maximumDrawdownPct: drawdown.maximumDrawdownPct,
    maximumDrawdownDate: drawdown.maximumDrawdownDate,
    bestDay,
    worstDay,
    upDayShare: changes.length > 0 ? (directionCounts.up / changes.length) * 100 : null,
  };
}

/** Rebases every series so the first observation equals 100. */
