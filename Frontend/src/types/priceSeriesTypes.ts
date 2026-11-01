export type PriceSeriesKey = "gold_usd_per_ounce" | "inr_per_usd" | "gold_inr_per_gram";

export type PriceSeriesValues = Record<PriceSeriesKey, number>;

/** One dated observation of all three prices. */
export type PricePoint = PriceSeriesValues & { date: string };

/** One dated value of a single series. */
export type SeriesPoint = { date: string; value: number };
