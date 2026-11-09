import type { RunMetadata } from "./analysisTypes";

export type CompoundingMode = "simple" | "monthly" | "quarterly" | "half_yearly" | "yearly";

/** What the form hands to the API client, already parsed and checked. */
export type SavingsRequestParams = {
  /** Null means the oldest date with data. */
  startDate: string | null;
  goldGrams: number;
  /** Null means "the same money the gold cost on the start date". */
  inrSavingsAmount: number | null;
  annualInterestRatePct: number;
  compounding: CompoundingMode;
};

export type SavingsDataRange = {
  status: "success";
  earliest_date: string;
  latest_date: string;
  aligned_observations: number;
  data_fetched_at: string;
  is_stale: boolean;
};

export type DatedValue = { date: string; value: number };

export type GoldHoldingSummary = {
  grams: number;
  start_price_per_gram: number;
  end_price_per_gram: number;
  invested_inr: number;
  current_value_inr: number;
  gain_inr: number;
  change_pct: number | null;
  cagr_pct: number | null;
  highest_value: DatedValue;
  lowest_value: DatedValue;
  max_drawdown_pct: number;
  peak_date: string;
  trough_date: string;
  annualized_volatility_pct: number | null;
};

export type InrSavingsSummary = {
  principal_inr: number;
  final_value_inr: number;
  interest_earned_inr: number;
  change_pct: number | null;
  cagr_pct: number | null;
  effective_annual_yield_pct: number | null;
};

export type SavingsLeader = "gold" | "inr_savings" | "tie";

export type SavingsComparison = {
  leader: SavingsLeader;
  change_gap_points: number | null;
  final_value_gap_inr: number;
  gold_to_savings_growth_ratio: number | null;
  break_even_annual_rate_pct: number | null;
  share_of_days_gold_ahead_pct: number | null;
  gold_equivalent_grams_at_start: number;
  gold_equivalent_grams_now: number;
  gold_purchasing_power_change_pct: number | null;
};

export type SavingsSummary = {
  holding_days: number;
  holding_years: number;
  same_budget: boolean;
  gold: GoldHoldingSummary;
  inr_savings: InrSavingsSummary;
  comparison: SavingsComparison;
};

export type CurrencyEffect = {
  start_gold_usd_per_ounce: number;
  end_gold_usd_per_ounce: number;
  start_inr_per_usd: number;
  end_inr_per_usd: number;
  gold_usd_change_pct: number | null;
  usd_inr_change_pct: number | null;
  gold_inr_change_pct: number | null;
};

export type CalendarYearRow = {
  year: number;
  period_start: string;
  period_end: string;
  is_partial_year: boolean;
  gold_change_pct: number | null;
  inr_savings_change_pct: number | null;
  gold_beat_savings: boolean;
};

export type HoldingPeriodOutcome = {
  years: number;
  window_count: number;
  gold_gain_share_pct: number;
  gold_beat_savings_share_pct: number;
  median_gold_cagr_pct: number | null;
  worst_gold_cagr_pct: number | null;
  best_gold_cagr_pct: number | null;
};

export type SavingsTimelinePoint = {
  date: string;
  gold_price_per_gram: number;
  gold_value: number;
  inr_value: number;
};

export type SavingsResult = {
  status: "success";
  run_id: string;
  generated_at: string;
  request: {
    requested_start_date: string | null;
    effective_start_date: string;
    end_date: string;
    gold_grams: number;
    inr_savings_amount: number;
    inr_principal_source: "matched_to_gold_cost" | "user_provided";
    annual_interest_rate_pct: number;
    compounding: CompoundingMode;
  };
  data_range: Omit<SavingsDataRange, "status">;
  summary: SavingsSummary;
  currency_effect: CurrencyEffect;
  calendar_years: CalendarYearRow[];
  holding_period_outcomes: HoldingPeriodOutcome[];
  timeline: { points: SavingsTimelinePoint[] };
  warnings: string[];
  metadata: RunMetadata;
};

export type SavingsState = "idle" | "running" | "success" | "error";

/** What the user has typed, before it is checked. */
export type SavingsFormValues = {
  startDate: string;
  goldGrams: string;
  inrSavingsAmount: string;
  annualInterestRatePct: string;
  compounding: CompoundingMode;
};

export type SavingsFormField = "startDate" | "goldGrams" | "inrSavingsAmount" | "annualInterestRatePct";

export type SavingsFormErrors = Partial<Record<SavingsFormField, string>>;
