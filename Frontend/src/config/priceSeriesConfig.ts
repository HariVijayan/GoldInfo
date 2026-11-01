import type { PriceSeriesKey } from "../types/priceSeriesTypes";
import { GOLD_LABEL, INR_LABEL, RUPEE_SYMBOL } from "./displayLabels";

export type PriceSeriesOption = {
  key: PriceSeriesKey;
  /** Used for headings and accessible chart descriptions. */
  label: string;
  /** Used for legends, tooltips, and compact buttons. */
  shortLabel: string;
  /** Appended after a formatted value, for example "per gram". */
  unitDescription: string;
  /** Placed in front of a formatted value, for example the rupee symbol. */
  valuePrefix: string;
  /** CSS custom property that colours this series in every chart. */
  colorVariable: string;
};

export const PRICE_SERIES_OPTIONS: PriceSeriesOption[] = [
  {
    key: "gold_inr_per_gram",
    label: `${GOLD_LABEL} in ${INR_LABEL} per gram`,
    shortLabel: `${GOLD_LABEL}, ${RUPEE_SYMBOL}/gram`,
    unitDescription: "per gram",
    valuePrefix: RUPEE_SYMBOL,
    colorVariable: "var(--color-gold)",
  },
  {
    key: "gold_usd_per_ounce",
    label: `${GOLD_LABEL} in USD per ounce`,
    shortLabel: `${GOLD_LABEL}, USD/oz`,
    unitDescription: "USD per ounce",
    valuePrefix: "",
    colorVariable: "var(--color-series-usd)",
  },
  {
    key: "inr_per_usd",
    label: `USD/INR (${RUPEE_SYMBOL}) exchange rate`,
    shortLabel: `USD/INR (${RUPEE_SYMBOL})`,
    unitDescription: "per US dollar",
    valuePrefix: RUPEE_SYMBOL,
    colorVariable: "var(--color-series-fx)",
  },
];

export const DEFAULT_PRICE_SERIES_KEY: PriceSeriesKey = "gold_inr_per_gram";

export function getPriceSeriesOption(seriesKey: PriceSeriesKey): PriceSeriesOption {
  return (
    PRICE_SERIES_OPTIONS.find((option) => option.key === seriesKey) ?? PRICE_SERIES_OPTIONS[0]
  );
}
