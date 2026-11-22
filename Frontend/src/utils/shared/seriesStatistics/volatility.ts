/** Rolling annualised volatility. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";

export function calculateSampleStandardDeviation(values: number[]): number {
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
