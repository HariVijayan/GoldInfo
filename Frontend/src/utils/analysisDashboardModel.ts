import {
  LONG_MOVING_AVERAGE_WINDOW,
  MINIMUM_CHANGES_FOR_HISTOGRAM,
  MINIMUM_YEARS_FOR_SEASONALITY,
  RETURN_HISTOGRAM_BIN_COUNT,
  ROLLING_VOLATILITY_WINDOW,
  SHORT_MOVING_AVERAGE_WINDOW,
  TRADING_PERIODS_PER_YEAR,
} from "../config/analysisChartConfig";
import { MAXIMUM_RENDERED_CHART_POINTS } from "../config/chartRangeConfig";
import type { ChartRangeOption, PriceChartPoint, ToneBarDatum } from "../types/chartTypes";
import type { PricePoint, PriceSeriesKey, SeriesPoint } from "../types/priceSeriesTypes";
import { calculateSpanInDays } from "./chartDates";
import { calculateRangeStartDate } from "./chartRange";
import { downsampleEvenly } from "./downsample";
import {
  type DirectionCounts,
  type PeriodGranularity,
  type WindowStatistics,
  buildReturnHistogram,
  calculateDrawdown,
  calculateMonthOfYearAverages,
  calculatePercentChanges,
  calculatePeriodReturns,
  calculateRollingVolatility,
  calculateSimpleMovingAverage,
  calculateWindowStatistics,
  chooseReturnGranularity,
  countDirections,
  extractSeries,
  rebasePricePoints,
} from "./seriesStatistics";

export type AnalysisDashboardModel = {
  observationCount: number;
  firstDate: string;
  lastDate: string;
  spanInDays: number;
  priceChartPoints: PriceChartPoint[];
  windowHigh: number;
  windowLow: number;
  hasShortAverage: boolean;
  hasLongAverage: boolean;
  indexedPoints: PricePoint[];
  drawdownPoints: SeriesPoint[];
  volatilityPoints: SeriesPoint[];
  returnGranularity: PeriodGranularity;
  periodReturnBars: ToneBarDatum[];
  histogramBars: ToneBarDatum[];
  directionCounts: DirectionCounts;
  seasonalityBars: ToneBarDatum[];
  isSeasonalityAvailable: boolean;
  statistics: WindowStatistics;
};

function findFirstIndexOnOrAfter(series: SeriesPoint[], startDate: string | null): number {
  if (startDate === null) return 0;
  const startIndex = series.findIndex((point) => point.date >= startDate);
  return startIndex === -1 ? series.length : startIndex;
}

/**
 * Everything the historical dashboard draws for one series and one range.
 *
 * Moving averages and rolling volatility are calculated on the full fetched
 * history and then cropped, so a short range still starts with valid values.
 * Everything else is calculated on the cropped window only.
 */
export function buildAnalysisDashboardModel(
  allPricePoints: PricePoint[],
  seriesKey: PriceSeriesKey,
  rangeOption: ChartRangeOption
): AnalysisDashboardModel | null {
  if (allPricePoints.length === 0) return null;

  const fullSeries = extractSeries(allPricePoints, seriesKey);
  const latestDate = fullSeries[fullSeries.length - 1].date;
  const startIndex = findFirstIndexOnOrAfter(
    fullSeries,
    calculateRangeStartDate(latestDate, rangeOption)
  );

  const windowSeries = fullSeries.slice(startIndex);
  const windowPricePoints = allPricePoints.slice(startIndex);
  if (windowSeries.length === 0) return null;

  const fullValues = fullSeries.map((point) => point.value);
  const shortAverages = calculateSimpleMovingAverage(fullValues, SHORT_MOVING_AVERAGE_WINDOW);
  const longAverages = calculateSimpleMovingAverage(fullValues, LONG_MOVING_AVERAGE_WINDOW);

  const priceChartPoints: PriceChartPoint[] = windowSeries.map((point, windowIndex) => ({
    date: point.date,
    price: point.value,
    shortAverage: shortAverages[startIndex + windowIndex],
    longAverage: longAverages[startIndex + windowIndex],
  }));

  const windowValues = windowSeries.map((point) => point.value);
  const windowChanges = calculatePercentChanges(windowSeries);
  const drawdown = calculateDrawdown(windowSeries);

  const fullVolatility = calculateRollingVolatility(
    calculatePercentChanges(fullSeries),
    ROLLING_VOLATILITY_WINDOW,
    TRADING_PERIODS_PER_YEAR
  );
  const firstWindowDate = windowSeries[0].date;
  const volatilityPoints = fullVolatility.filter((point) => point.date >= firstWindowDate);

  const spanInDays = calculateSpanInDays(firstWindowDate, latestDate);
  const returnGranularity = chooseReturnGranularity(spanInDays);
  const isSeasonalityAvailable = spanInDays >= MINIMUM_YEARS_FOR_SEASONALITY * 365;

  return {
    observationCount: windowSeries.length,
    firstDate: firstWindowDate,
    lastDate: latestDate,
    spanInDays,
    priceChartPoints: downsampleEvenly(priceChartPoints, MAXIMUM_RENDERED_CHART_POINTS),
    windowHigh: Math.max(...windowValues),
    windowLow: Math.min(...windowValues),
    hasShortAverage: priceChartPoints.some((point) => point.shortAverage !== undefined),
    hasLongAverage: priceChartPoints.some((point) => point.longAverage !== undefined),
    indexedPoints: downsampleEvenly(
      rebasePricePoints(windowPricePoints),
      MAXIMUM_RENDERED_CHART_POINTS
    ),
    drawdownPoints: downsampleEvenly(drawdown.series, MAXIMUM_RENDERED_CHART_POINTS),
    volatilityPoints: downsampleEvenly(volatilityPoints, MAXIMUM_RENDERED_CHART_POINTS),
    returnGranularity,
    periodReturnBars: calculatePeriodReturns(windowSeries, returnGranularity),
    histogramBars: buildReturnHistogram(
      windowChanges,
      RETURN_HISTOGRAM_BIN_COUNT,
      MINIMUM_CHANGES_FOR_HISTOGRAM
    ),
    directionCounts: countDirections(windowChanges),
    seasonalityBars: isSeasonalityAvailable ? calculateMonthOfYearAverages(windowSeries) : [],
    isSeasonalityAvailable,
    statistics: calculateWindowStatistics(
      windowSeries,
      windowChanges,
      drawdown,
      TRADING_PERIODS_PER_YEAR
    ),
  };
}
