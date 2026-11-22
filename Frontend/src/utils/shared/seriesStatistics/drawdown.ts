/** Fall from the running peak. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";

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
