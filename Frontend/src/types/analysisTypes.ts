export type AgentEvent = {
  type: string;
  message: string;
  timestamp?: string;
};

export type ArtifactFile = {
  filename: string;
  media_type: string;
  description: string;
  row_count: number | null;
  content: string;
};

export type RunMetadata = {
  generated_at?: string;
  file_count: number;
  files: ArtifactFile[];
};

export type AnalysisState = "idle" | "running" | "success" | "error";

export type AnalysisMetrics = {
  unit: string;
  latest_price: number;
  latest_observation_date: string;
  previous_price: number | null;
  previous_observation_date: string | null;
  one_session_change_pct: number | null;
  seven_day_change_pct: number | null;
  seven_day_reference_date: string | null;
  thirty_day_change_pct: number | null;
  thirty_day_reference_date: string | null;
  historical_high: number;
  historical_high_date: string;
  historical_low: number;
  historical_low_date: string;
  range_position_pct: number | null;
  distance_below_high_pct: number | null;
  observation_count: number;
  period_start: string;
  period_end: string;
};

export type DatasetMetadata = {
  name: string;
  source: string;
  ticker: string;
  unit: string;
  requested_period: string;
  first_observation_date: string;
  last_observation_date: string;
  observation_count: number;
};

/** The aligned datasets the backend converts before analysing them. */
export type ProcessedGoldData = {
  gold_usd_per_ounce: { date: string; gold_usd_per_ounce: number }[];
  usd_inr: { date: string; inr_per_usd: number }[];
  gold_inr_per_ounce: {
    date: string;
    gold_usd_per_ounce: number;
    inr_per_usd: number;
    gold_inr_per_ounce: number;
  }[];
  gold_inr_per_gram: { date: string; gold_inr_per_ounce: number; gold_inr_per_gram: number }[];
  metadata: Record<string, DatasetMetadata>;
};

/** The retail-priced twin of the analysis, interpretation, and INR datasets. */
export type AnalysisRetailView = {
  retail_charge_pct: number;
  multiplier: number;
  analysis: AnalysisMetrics;
  interpretation: string;
  processed_data: Pick<ProcessedGoldData, "gold_inr_per_ounce" | "gold_inr_per_gram" | "metadata">;
};

export type AgentResult = {
  run_id: string;
  request: { goal: string; period: string; [key: string]: unknown };
  analysis: AnalysisMetrics;
  interpretation: string;
  processed_data: ProcessedGoldData | null;
  retail?: AnalysisRetailView | null;
  metadata?: RunMetadata;
  status: "success" | "error";
};

export type ChangeTone = "positive" | "negative" | "neutral";
