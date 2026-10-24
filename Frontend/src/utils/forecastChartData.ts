import type {
  ChartPoint,
  ForecastSeriesKey,
  HistoryPoint,
  ForecastPoint,
} from "../types/forecastTypes";

export type ForecastChartModel = {
  chartPoints: ChartPoint[];
  lastHistoryDate: string;
};

/**
 * History and forecast share one array. The last history point also starts
 * the forecast line and band, so the two lines join without a gap.
 */
export function buildForecastChartModel(
  seriesKey: ForecastSeriesKey,
  historyPoints: HistoryPoint[],
  forecastPoints: ForecastPoint[],
  historyStepsShown: number
): ForecastChartModel {
  const visibleHistory = historyPoints.slice(-historyStepsShown);
  const chartPoints: ChartPoint[] = visibleHistory.map((historyPoint) => ({
    date: historyPoint.date,
    historyValue: historyPoint[seriesKey],
  }));

  const anchorPoint = chartPoints[chartPoints.length - 1];
  if (anchorPoint && anchorPoint.historyValue !== undefined) {
    anchorPoint.forecastValue = anchorPoint.historyValue;
    anchorPoint.band = [anchorPoint.historyValue, anchorPoint.historyValue];
  }

  for (const forecastPoint of forecastPoints) {
    chartPoints.push({
      date: forecastPoint.date,
      forecastValue: forecastPoint[seriesKey],
      band: [forecastPoint.bounds[seriesKey].lower, forecastPoint.bounds[seriesKey].upper],
    });
  }

  return { chartPoints, lastHistoryDate: anchorPoint?.date ?? "" };
}

export function calculateYAxisDomain(chartPoints: ChartPoint[]): [number, number] {
  const allValues = chartPoints.flatMap((chartPoint) => [
    chartPoint.historyValue,
    ...(chartPoint.band ?? []),
  ]).filter((value): value is number => value !== undefined && Number.isFinite(value));

  if (allValues.length === 0) return [0, 1];

  const minimumValue = Math.min(...allValues);
  const maximumValue = Math.max(...allValues);
  const padding = (maximumValue - minimumValue) * 0.06 || maximumValue * 0.01;

  return [minimumValue - padding, maximumValue + padding];
}

export function formatChartDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export function formatLongDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
