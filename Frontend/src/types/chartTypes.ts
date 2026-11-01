import type { ChangeTone } from "./analysisTypes";

export type ChartRangeKey =
  | "1W"
  | "2W"
  | "3W"
  | "1M"
  | "2M"
  | "3M"
  | "6M"
  | "9M"
  | "1Y"
  | "2Y"
  | "3Y"
  | "5Y"
  | "10Y"
  | "MAX";

export type ChartRangeLookback = { unit: "days" | "months"; amount: number };

export type ChartRangeOption = {
  key: ChartRangeKey;
  label: string;
  spokenLabel: string;
  /** Null means "everything that was fetched". */
  lookback: ChartRangeLookback | null;
};

/** One bar whose colour follows its tone. */
export type ToneBarDatum = {
  label: string;
  value: number;
  tone: ChangeTone;
  /** Extra line shown in the tooltip. */
  detail?: string;
};

export type PriceChartPoint = {
  date: string;
  price: number;
  shortAverage?: number;
  longAverage?: number;
};

export type ShareSlice = {
  label: string;
  value: number;
  colorVariable: string;
};

export type LegendItem = {
  label: string;
  colorVariable: string;
  variant: "line" | "dashed" | "band";
};
