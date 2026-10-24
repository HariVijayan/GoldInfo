import type { ForecastFrequency, ForecastSeriesKey } from "../types/forecastTypes";

export const FORECAST_URL = "http://127.0.0.1:8000/api/forecast";

export const FORECAST_HORIZON_OPTIONS = [
  { label: "3 months", value: 13 },
  { label: "6 months", value: 26 },
  { label: "1 year", value: 52 },
  { label: "2 years", value: 104 },
] as const;

export const DEFAULT_FORECAST_HORIZON_WEEKS = 52;

export const FORECAST_FREQUENCY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
] as const;

export const DEFAULT_FORECAST_FREQUENCY: ForecastFrequency = "daily";

/** Daily forecasts use business days: five steps per calendar week. */
export const STEPS_PER_WEEK: Record<ForecastFrequency, number> = {
  daily: 5,
  weekly: 1,
};

export const HISTORY_SHOWN_OPTIONS = [
  { label: "6 months", value: 26 },
  { label: "1 year", value: 52 },
  { label: "3 years", value: 156 },
] as const;

export const DEFAULT_HISTORY_SHOWN_WEEKS = 52;

export const DEFAULT_FORECAST_SERIES_KEY: ForecastSeriesKey = "gold_inr_per_gram";

export type ForecastSeriesOption = {
  key: ForecastSeriesKey;
  label: string;
  unit: string;
};

export const FORECAST_SERIES_OPTIONS: ForecastSeriesOption[] = [
  { key: "gold_inr_per_gram", label: "Gold in INR per gram", unit: "INR/g" },
  { key: "gold_usd_per_ounce", label: "Gold in USD per ounce", unit: "USD/oz" },
  { key: "inr_per_usd", label: "USD/INR exchange rate", unit: "INR per USD" },
];
