import type { RunMetadata } from "./analysisTypes";
import type { PricePoint, PriceSeriesKey, PriceSeriesValues } from "./priceSeriesTypes";

export type ForecastSeriesKey = PriceSeriesKey;

export type ForecastFrequency = "daily" | "weekly";

export type ForecastSeriesValues = PriceSeriesValues;

export type ForecastBounds = { lower: number; upper: number };

export type ForecastPoint = ForecastSeriesValues & {
  step: number;
  date: string;
  bounds: Record<ForecastSeriesKey, ForecastBounds>;
};

export type HistoryPoint = PricePoint;

export type EndOfHorizonSummary = {
  latest: number;
  forecast: number;
  change_pct: number;
  lower: number;
  upper: number;
};

export type BacktestHorizonResult = {
  horizon_steps: number;
  horizon_label: string;
  model_mape_pct: number;
  naive_mape_pct: number;
  model_beats_naive: boolean;
};

export type BacktestSummary = {
  origin_count: number;
  step_periods: number;
  period_unit: string;
  results: Record<ForecastSeriesKey, BacktestHorizonResult[]>;
};

export type ForecastModelSeriesDetails = {
  selected_alpha?: number;
  training_rows?: number;
  one_step_residual_std: number;
  derived_from?: string;
};

export type ForecastModelDetails = {
  approach: string;
  frequency: ForecastFrequency;
  pipeline: string[];
  target: string;
  features: string[];
  interval_method: string;
  series: Record<ForecastSeriesKey, ForecastModelSeriesDetails>;
  backtest: BacktestSummary | null;
};

export type ForecastResult = {
  status: "success";
  run_id: string;
  generated_at: string;
  request: { horizon_weeks: number; frequency: ForecastFrequency; history_period: string };
  data_summary: {
    history_period_requested: string;
    aligned_daily_observations: number;
    training_frequency: ForecastFrequency;
    observations_used: number;
    history_start: string;
    history_end: string;
    latest_values: ForecastSeriesValues;
  };
  forecast: {
    frequency: ForecastFrequency;
    horizon_weeks: number;
    steps: number;
    interval_level: number;
    start_date: string;
    end_date: string;
    points: ForecastPoint[];
    end_of_horizon: Record<ForecastSeriesKey, EndOfHorizonSummary>;
  };
  history: { points: HistoryPoint[] };
  model: ForecastModelDetails;
  warnings: string[];
  metadata: RunMetadata;
};

export type ForecastState = "idle" | "running" | "success" | "error";

export type ChartPoint = {
  date: string;
  historyValue?: number;
  forecastValue?: number;
  band?: [number, number];
};
