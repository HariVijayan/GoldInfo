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
  thirty_day_change_pct: number | null;
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

export type AgentResult = {
  run_id: string;
  request: { goal: string; period: string; [key: string]: unknown };
  analysis: AnalysisMetrics;
  interpretation: string;
  processed_data: Record<string, unknown>;
  metadata?: RunMetadata;
  status: "success" | "error";
};

export type ChangeTone = "positive" | "negative" | "neutral";
