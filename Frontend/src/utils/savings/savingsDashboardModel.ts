/** Turns one savings response into the series and figures the charts need. */
import { SAVINGS_CHART_MAXIMUM_POINTS } from "../../config/savingsShared/savingsSharedConfig";

import type { SeriesPoint } from "../../types/shared/priceSeriesTypes";

import type { CalendarYearRow, SavingsTimelinePoint } from "../../types/savings/savingsTypes";

import { downsampleEvenly } from "../shared/downsample";

import { calculateDrawdown, type DrawdownResult } from "../shared/seriesStatistics";


export type GrowthChartPoint = { date: string; goldValue: number; savingsValue: number };

export function buildGrowthChartPoints(timelinePoints: SavingsTimelinePoint[]): GrowthChartPoint[] {
  return downsampleEvenly(timelinePoints, SAVINGS_CHART_MAXIMUM_POINTS).map((point) => ({
    date: point.date,
    goldValue: point.gold_value,
    savingsValue: point.inr_value,
  }));
}

/**
 * How many times larger gold's growth multiple is than the savings multiple.
 * Above 1 gold is ahead. Using multiples keeps it fair when the two start
 * from different amounts.
 */
export function buildLeadRatioSeries(timelinePoints: SavingsTimelinePoint[]): SeriesPoint[] {
  const firstPoint = timelinePoints[0];
  const ratioSeries = timelinePoints.map((point) => ({
    date: point.date,
    value: point.gold_value / firstPoint.gold_value / (point.inr_value / firstPoint.inr_value),
  }));
  return downsampleEvenly(ratioSeries, SAVINGS_CHART_MAXIMUM_POINTS);
}

/** The drawdown is found on every day, then thinned for drawing. */
export function buildGoldDrawdown(timelinePoints: SavingsTimelinePoint[]): DrawdownResult {
  const drawdown = calculateDrawdown(
    timelinePoints.map((point) => ({ date: point.date, value: point.gold_value }))
  );
  return {
    ...drawdown,
    series: downsampleEvenly(drawdown.series, SAVINGS_CHART_MAXIMUM_POINTS),
  };
}

export type YearlyBarDatum = {
  label: string;
  goldChangePct: number;
  savingsChangePct: number;
};

export function buildYearlyBars(calendarYears: CalendarYearRow[]): YearlyBarDatum[] {
  return calendarYears.flatMap((yearRow) =>
    yearRow.gold_change_pct === null || yearRow.inr_savings_change_pct === null
      ? []
      : [
          {
            // An asterisk marks a year that is only partly covered.
            label: `${yearRow.year}${yearRow.is_partial_year ? "*" : ""}`,
            goldChangePct: yearRow.gold_change_pct,
            savingsChangePct: yearRow.inr_savings_change_pct,
          },
        ]
  );
}
