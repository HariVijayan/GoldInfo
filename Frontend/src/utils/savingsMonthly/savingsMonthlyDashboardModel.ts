/** Turns one monthly-savings response into the series and sentences the dashboard needs. */
import { SAVINGS_CHART_MAXIMUM_POINTS } from "../../config/savingsShared/savingsSharedConfig";

import type { SeriesPoint } from "../../types/shared/priceSeriesTypes";

import type { MonthlyTimelinePoint } from "../../types/savingsMonthly/savingsMonthlyTypes";

import { downsampleEvenly } from "../shared/downsample";


export type MonthlyGrowthPoint = {
  date: string;
  investedInr: number;
  rdValue: number;
  goldValue: number;
};

export type CostComparisonPoint = {
  date: string;
  marketPrice: number;
  averageCost: number | null;
};

function thin<Point>(points: Point[]): Point[] {
  return downsampleEvenly(points, SAVINGS_CHART_MAXIMUM_POINTS);
}

export function buildMonthlyGrowthPoints(timelinePoints: MonthlyTimelinePoint[]): MonthlyGrowthPoint[] {
  return thin(timelinePoints).map((point) => ({
    date: point.date,
    investedInr: point.invested_inr,
    rdValue: point.rd_value,
    goldValue: point.gold_value,
  }));
}

/** Gold's value minus the RD's, in rupees. Both sides received the same installments. */
export function buildGoldLeadSeries(timelinePoints: MonthlyTimelinePoint[]): SeriesPoint[] {
  return thin(timelinePoints).map((point) => ({ date: point.date, value: point.gold_value - point.rd_value }));
}

export function buildCostComparisonPoints(timelinePoints: MonthlyTimelinePoint[]): CostComparisonPoint[] {
  return thin(timelinePoints).map((point) => ({
    date: point.date,
    marketPrice: point.gold_price_per_gram,
    averageCost: point.average_cost_per_gram,
  }));
}
