/** How daily changes are spread, and how many days rose or fell. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { ChangeTone } from "../../../types/shared/chartTypes";
import type { ToneBarDatum } from "../../../types/shared/chartTypes";
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";

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
