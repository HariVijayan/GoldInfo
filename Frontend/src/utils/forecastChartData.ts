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

export type NiceAxis = {
  domain: [number, number];
  ticks: number[];
  tickStep: number;
};

/**
 * Round-numbered axis bounds and tick marks that enclose the given values.
 * Rounding outwards also leaves a little headroom above and below the line.
 */
export function calculateNiceAxis(values: number[], targetTickCount = 5): NiceAxis {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return { domain: [0, 1], ticks: [0, 1], tickStep: 1 };

  const lowest = Math.min(...finiteValues);
  const highest = Math.max(...finiteValues);
  const span = highest - lowest || Math.abs(highest) * 0.02 || 1;

  const roughStep = span / Math.max(1, targetTickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  const tickStep = niceResidual * magnitude;

  const axisStart = Math.floor(lowest / tickStep) * tickStep;
  const axisEnd = Math.ceil(highest / tickStep) * tickStep;
  const stepDecimals = Math.max(0, -Math.floor(Math.log10(tickStep)) + 1);

  const ticks: number[] = [];
  for (let tick = axisStart; tick <= axisEnd + tickStep / 2 && ticks.length < 12; tick += tickStep) {
    ticks.push(Number(tick.toFixed(stepDecimals)));
  }

  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, tickStep };
}

export function calculateForecastChartAxis(chartPoints: ChartPoint[]): NiceAxis {
  return calculateNiceAxis(
    chartPoints
      .flatMap((chartPoint) => [chartPoint.historyValue, ...(chartPoint.band ?? [])])
      .filter((value): value is number => value !== undefined)
  );
}
