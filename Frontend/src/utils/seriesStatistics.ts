/**
 * Pure statistics for the dashboard charts. Every function takes plain
 * arrays and returns plain arrays, so each one can be read and checked on
 * its own. Percentages are returned as numbers such as 1.25 meaning 1.25%.
 */
import {
  MONTHLY_RETURN_MINIMUM_SPAN_DAYS,
  YEARLY_RETURN_MINIMUM_SPAN_DAYS,
} from "../config/analysisChartConfig";
import type { ChangeTone } from "../types/analysisTypes";
import type { ToneBarDatum } from "../types/chartTypes";
import type { PricePoint, PriceSeriesKey, SeriesPoint } from "../types/priceSeriesTypes";
import { formatDayAndMonth, formatLongDate, formatMonthAndYear, parseIsoDate, toIsoDate } from "./chartDates";
import { getChangeTone } from "./formatters";

export function extractSeries(pricePoints: PricePoint[], seriesKey: PriceSeriesKey): SeriesPoint[] {
  return pricePoints.map((pricePoint) => ({
    date: pricePoint.date,
    value: pricePoint[seriesKey],
  }));
}

/** Aligned with the input: positions before the window is full are undefined. */
export function calculateSimpleMovingAverage(
  values: number[],
  windowSize: number
): (number | undefined)[] {
  const averages: (number | undefined)[] = new Array(values.length).fill(undefined);
  let runningSum = 0;

  for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
    runningSum += values[valueIndex];
    if (valueIndex >= windowSize) runningSum -= values[valueIndex - windowSize];
    if (valueIndex >= windowSize - 1) averages[valueIndex] = runningSum / windowSize;
  }

  return averages;
}

/** Percentage change from each observation to the next. The first has none. */
export function calculatePercentChanges(series: SeriesPoint[]): SeriesPoint[] {
  const changes: SeriesPoint[] = [];

  for (let pointIndex = 1; pointIndex < series.length; pointIndex += 1) {
    const previousValue = series[pointIndex - 1].value;
    if (previousValue <= 0) continue;
    changes.push({
      date: series[pointIndex].date,
      value: (series[pointIndex].value / previousValue - 1) * 100,
    });
  }

  return changes;
}

function calculateSampleStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumOfSquares = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return Math.sqrt(sumOfSquares / (values.length - 1));
}

/** Annualised volatility, in percent, of the trailing window of changes. */
export function calculateRollingVolatility(
  changes: SeriesPoint[],
  windowSize: number,
  periodsPerYear: number
): SeriesPoint[] {
  const volatilityPoints: SeriesPoint[] = [];
  const annualisationFactor = Math.sqrt(periodsPerYear);

  for (let endIndex = windowSize - 1; endIndex < changes.length; endIndex += 1) {
    const windowValues = changes
      .slice(endIndex - windowSize + 1, endIndex + 1)
      .map((change) => change.value);
    volatilityPoints.push({
      date: changes[endIndex].date,
      value: calculateSampleStandardDeviation(windowValues) * annualisationFactor,
    });
  }

  return volatilityPoints;
}

export type DrawdownResult = {
  series: SeriesPoint[];
  maximumDrawdownPct: number;
  maximumDrawdownDate: string | null;
};

/** How far each observation sits below the highest value seen so far. */
export function calculateDrawdown(series: SeriesPoint[]): DrawdownResult {
  const drawdownSeries: SeriesPoint[] = [];
  let runningPeak = -Infinity;
  let maximumDrawdownPct = 0;
  let maximumDrawdownDate: string | null = null;

  for (const point of series) {
    runningPeak = Math.max(runningPeak, point.value);
    const drawdownPct = (point.value / runningPeak - 1) * 100;
    drawdownSeries.push({ date: point.date, value: drawdownPct });

    if (drawdownPct < maximumDrawdownPct) {
      maximumDrawdownPct = drawdownPct;
      maximumDrawdownDate = point.date;
    }
  }

  return { series: drawdownSeries, maximumDrawdownPct, maximumDrawdownDate };
}

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
function collectPeriodCloses(points: SeriesPoint[], granularity: PeriodGranularity): PeriodClose[] {
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Average month-end to month-end change for each calendar month. The first
 * month has no earlier month-end to compare with, so it only serves as the
 * baseline for the second.
 */
export function calculateMonthOfYearAverages(series: SeriesPoint[]): ToneBarDatum[] {
  const monthlyCloses = collectPeriodCloses(series, "month");
  const returnsByMonth: number[][] = MONTH_NAMES.map(() => []);

  for (let closeIndex = 1; closeIndex < monthlyCloses.length; closeIndex += 1) {
    const previousClose = monthlyCloses[closeIndex - 1].closingValue;
    if (previousClose <= 0) continue;

    const monthIndex = Number(monthlyCloses[closeIndex].periodKey.slice(5, 7)) - 1;
    returnsByMonth[monthIndex].push(
      (monthlyCloses[closeIndex].closingValue / previousClose - 1) * 100
    );
  }

  return MONTH_NAMES.flatMap((monthName, monthIndex) => {
    const monthReturns = returnsByMonth[monthIndex];
    if (monthReturns.length === 0) return [];

    const averageReturn = monthReturns.reduce((sum, value) => sum + value, 0) / monthReturns.length;
    const upCount = monthReturns.filter((value) => value > 0).length;
    return [
      {
        label: monthName,
        value: averageReturn,
        tone: getChangeTone(averageReturn),
        detail: `Rose in ${upCount} of ${monthReturns.length} years`,
      },
    ];
  });
}

function findQuantile(sortedValues: number[], quantile: number): number {
  const position = (sortedValues.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

/**
 * Counts changes into evenly sized bins centred on zero. The outer bins also
 * absorb the rare extreme days so a single spike cannot flatten the chart.
 */
export function buildReturnHistogram(
  changes: SeriesPoint[],
  binCount: number,
  minimumChanges: number
): ToneBarDatum[] {
  if (changes.length < minimumChanges) return [];

  const sortedValues = changes.map((change) => change.value).sort((first, second) => first - second);
  const limit = Math.max(
    Math.abs(findQuantile(sortedValues, 0.01)),
    Math.abs(findQuantile(sortedValues, 0.99))
  );
  if (limit === 0) return [];

  const binWidth = (2 * limit) / binCount;
  const counts: number[] = new Array(binCount).fill(0);

  for (const value of sortedValues) {
    const rawIndex = Math.floor((value + limit) / binWidth);
    counts[Math.min(binCount - 1, Math.max(0, rawIndex))] += 1;
  }

  const labelDigits = limit < 1 ? 2 : 1;

  return counts.map((count, binIndex) => {
    const binStart = -limit + binIndex * binWidth;
    const binCentre = binStart + binWidth / 2;
    const tone: ChangeTone =
      Math.abs(binCentre) < binWidth / 2 ? "neutral" : binCentre > 0 ? "positive" : "negative";

    return {
      label: `${binCentre.toFixed(labelDigits)}%`,
      value: count,
      tone,
      detail: `${binStart.toFixed(labelDigits)}% to ${(binStart + binWidth).toFixed(labelDigits)}%`,
    };
  });
}

export type DirectionCounts = { up: number; down: number; flat: number };

export function countDirections(changes: SeriesPoint[]): DirectionCounts {
  const counts: DirectionCounts = { up: 0, down: 0, flat: 0 };

  for (const change of changes) {
    if (change.value > 0) counts.up += 1;
    else if (change.value < 0) counts.down += 1;
    else counts.flat += 1;
  }

  return counts;
}

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
export function rebasePricePoints(pricePoints: PricePoint[]): PricePoint[] {
  const firstPoint = pricePoints[0];
  if (!firstPoint) return [];

  return pricePoints.map((pricePoint) => ({
    date: pricePoint.date,
    gold_inr_per_gram: (pricePoint.gold_inr_per_gram / firstPoint.gold_inr_per_gram) * 100,
    gold_usd_per_ounce: (pricePoint.gold_usd_per_ounce / firstPoint.gold_usd_per_ounce) * 100,
    inr_per_usd: (pricePoint.inr_per_usd / firstPoint.inr_per_usd) * 100,
  }));
}
