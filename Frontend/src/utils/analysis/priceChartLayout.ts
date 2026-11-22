import {
  LONG_MOVING_AVERAGE_WINDOW,
  SHORT_MOVING_AVERAGE_WINDOW,
} from "../../config/analysis/analysisChartConfig";
import type { PriceSeriesOption } from "../../config/shared/priceSeriesConfig";
import type { LegendItem, PriceChartPoint } from "../../types/shared/chartTypes";

export const PRICE_NAME = "Price";
export const SHORT_AVERAGE_NAME = `${SHORT_MOVING_AVERAGE_WINDOW}-day average`;
export const LONG_AVERAGE_NAME = `${LONG_MOVING_AVERAGE_WINDOW}-day average`;

export type LabelSides = { high: "Left" | "Right"; low: "Left" | "Right" };

/**
 * Puts each label on the side away from where the extreme happened, so the
 * price line never runs through the text. The extremes are located among the
 * points actually drawn, because thinning can drop the exact high or low.
 */
export function chooseExtremeLabelSides(chartPoints: PriceChartPoint[]): LabelSides {
  let highIndex = 0;
  let lowIndex = 0;
  chartPoints.forEach((chartPoint, pointIndex) => {
    if (chartPoint.price > chartPoints[highIndex].price) highIndex = pointIndex;
    if (chartPoint.price < chartPoints[lowIndex].price) lowIndex = pointIndex;
  });
  const middleIndex = (chartPoints.length - 1) / 2;
  return {
    high: highIndex > middleIndex ? "Left" : "Right",
    low: lowIndex > middleIndex ? "Left" : "Right",
  };
}

export function buildPriceLegendItems(
  seriesOption: PriceSeriesOption,
  showShortAverage: boolean,
  showLongAverage: boolean
): LegendItem[] {
  return [
    { label: PRICE_NAME, colorVariable: seriesOption.colorVariable, variant: "line" },
    ...(showShortAverage
      ? [{ label: SHORT_AVERAGE_NAME, colorVariable: "var(--color-ink)", variant: "dashed" as const }]
      : []),
    ...(showLongAverage
      ? [{ label: LONG_AVERAGE_NAME, colorVariable: "var(--color-ink-muted)", variant: "dashed" as const }]
      : []),
  ];
}
