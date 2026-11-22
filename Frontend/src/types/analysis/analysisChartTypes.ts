import type { PriceSeriesOption } from "../../config/shared/priceSeriesConfig";

/** What the analysis charts are currently showing, in words, for titles and labels. */
export type AnalysisChartScope = {
  seriesOption: PriceSeriesOption;
  /** For example "the last 3 years". */
  rangePhrase: string;
  /** For example "Gold in INR, the last 3 years". */
  seriesAndRange: string;
};
