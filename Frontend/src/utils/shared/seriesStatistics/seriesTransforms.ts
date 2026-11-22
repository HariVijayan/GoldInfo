/** Basic series transforms: pick a series, moving average, day-to-day percent change, rebase to 100. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { PricePoint, PriceSeriesKey, SeriesPoint } from "../../../types/shared/priceSeriesTypes";

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
