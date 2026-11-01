import { PRICE_SERIES_OPTIONS } from "../config/priceSeriesConfig";
import type { ToneBarDatum } from "../types/chartTypes";
import type {
  EndOfHorizonSummary,
  ForecastPoint,
  ForecastSeriesKey,
} from "../types/forecastTypes";
import type { PricePoint, SeriesPoint } from "../types/priceSeriesTypes";
import { calculateSpanInDays } from "./chartDates";
import { calculatePeriodReturns, chooseReturnGranularity } from "./seriesStatistics";
import { calculatePercentChange, getChangeTone } from "./formatters";
import type { PeriodGranularity } from "./seriesStatistics";

/** The last actual observation, then every forecast step, all rebased to 100. */
export function buildIndexedForecastPath(
  endOfHorizon: Record<ForecastSeriesKey, EndOfHorizonSummary>,
  anchorDate: string,
  forecastPoints: ForecastPoint[]
): PricePoint[] {
  const latest = {
    gold_inr_per_gram: endOfHorizon.gold_inr_per_gram.latest,
    gold_usd_per_ounce: endOfHorizon.gold_usd_per_ounce.latest,
    inr_per_usd: endOfHorizon.inr_per_usd.latest,
  };

  const anchorPoint: PricePoint = {
    date: anchorDate,
    gold_inr_per_gram: 100,
    gold_usd_per_ounce: 100,
    inr_per_usd: 100,
  };

  return [
    anchorPoint,
    ...forecastPoints.map((forecastPoint) => ({
      date: forecastPoint.date,
      gold_inr_per_gram: (forecastPoint.gold_inr_per_gram / latest.gold_inr_per_gram) * 100,
      gold_usd_per_ounce: (forecastPoint.gold_usd_per_ounce / latest.gold_usd_per_ounce) * 100,
      inr_per_usd: (forecastPoint.inr_per_usd / latest.inr_per_usd) * 100,
    })),
  ];
}

/** Width of the forecast range at each step, as a percentage of the forecast. */
export function buildRangeWidthSeries(
  forecastPoints: ForecastPoint[],
  seriesKey: ForecastSeriesKey
): SeriesPoint[] {
  return forecastPoints.map((forecastPoint) => {
    const { lower, upper } = forecastPoint.bounds[seriesKey];
    return {
      date: forecastPoint.date,
      value: ((upper - lower) / forecastPoint[seriesKey]) * 100,
    };
  });
}

export function buildEndOfHorizonChangeBars(
  endOfHorizon: Record<ForecastSeriesKey, EndOfHorizonSummary>
): ToneBarDatum[] {
  return PRICE_SERIES_OPTIONS.map((seriesOption) => {
    const changePct = endOfHorizon[seriesOption.key].change_pct;
    return {
      label: seriesOption.shortLabel,
      value: changePct,
      tone: getChangeTone(changePct),
    };
  });
}

export type ForecastPeriodChanges = {
  granularity: PeriodGranularity;
  bars: ToneBarDatum[];
};

/** Expected change over each week, month, or year of the forecast. */
export function buildForecastPeriodChanges(
  latestValue: number,
  anchorDate: string,
  forecastPoints: ForecastPoint[],
  seriesKey: ForecastSeriesKey
): ForecastPeriodChanges {
  const series: SeriesPoint[] = [
    { date: anchorDate, value: latestValue },
    ...forecastPoints.map((forecastPoint) => ({
      date: forecastPoint.date,
      value: forecastPoint[seriesKey],
    })),
  ];

  const spanInDays = calculateSpanInDays(anchorDate, forecastPoints[forecastPoints.length - 1]?.date ?? anchorDate);
  const granularity = chooseReturnGranularity(spanInDays);

  return { granularity, bars: calculatePeriodReturns(series, granularity) };
}

export type ForecastRangeBarModel = {
  seriesKey: ForecastSeriesKey;
  latest: number;
  forecast: number;
  lower: number;
  upper: number;
  forecastChangePct: number;
  lowerChangePct: number;
  upperChangePct: number;
};

export function buildForecastRangeBarModels(
  endOfHorizon: Record<ForecastSeriesKey, EndOfHorizonSummary>
): ForecastRangeBarModel[] {
  return PRICE_SERIES_OPTIONS.map((seriesOption) => {
    const summary = endOfHorizon[seriesOption.key];
    return {
      seriesKey: seriesOption.key,
      latest: summary.latest,
      forecast: summary.forecast,
      lower: summary.lower,
      upper: summary.upper,
      forecastChangePct: calculatePercentChange(summary.forecast, summary.latest) ?? 0,
      lowerChangePct: calculatePercentChange(summary.lower, summary.latest) ?? 0,
      upperChangePct: calculatePercentChange(summary.upper, summary.latest) ?? 0,
    };
  });
}

export type ForecastExtremes = {
  highest: { date: string; value: number };
  lowest: { date: string; value: number };
};

export function findForecastExtremes(
  forecastPoints: ForecastPoint[],
  seriesKey: ForecastSeriesKey
): ForecastExtremes | null {
  if (forecastPoints.length === 0) return null;

  let highest = forecastPoints[0];
  let lowest = forecastPoints[0];
  for (const forecastPoint of forecastPoints) {
    if (forecastPoint[seriesKey] > highest[seriesKey]) highest = forecastPoint;
    if (forecastPoint[seriesKey] < lowest[seriesKey]) lowest = forecastPoint;
  }

  return {
    highest: { date: highest.date, value: highest[seriesKey] },
    lowest: { date: lowest.date, value: lowest[seriesKey] },
  };
}
