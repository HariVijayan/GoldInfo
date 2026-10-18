export const ANALYSIS_STREAM_URL = "http://127.0.0.1:8000/api/analyze/stream";

export const DEFAULT_ANALYSIS_GOAL =
  "Analyze historical gold prices and describe the observed movement.";

export const PERIOD_OPTIONS = [
  { label: "1 month", value: "1mo" },
  { label: "3 months", value: "3mo" },
  { label: "6 months", value: "6mo" },
  { label: "1 year", value: "1y" },
  { label: "2 years", value: "2y" },
  { label: "5 years", value: "5y" },
  { label: "10 years", value: "10y" },
] as const;

export const DEFAULT_PERIOD_VALUE = "1y";
