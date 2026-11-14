import type { RunMetadata } from "./analysisTypes";
import type { PriceView } from "./retailPricingTypes";
import type { CompoundingMode, DatedValue, SavingsDataRange } from "./savingsTypes";

/** Cheapest trading day of the 1st to 10th, or the first trading day. */
export type BuyRule = "lowest_in_window" | "first_trading_day";

/** What the form hands to the API client, already parsed and checked. */
export type MonthlyRequestParams = {
  /** Null means the oldest date with data. */
  startDate: string | null;
  monthlyInvestmentInr: number;
  annualInterestRatePct: number;
  compounding: CompoundingMode;
  buyRule: BuyRule;
  retailChargePct: number;
};

/** What the user has typed, before it is checked. */
export type MonthlyFormValues = {
  startDate: string;
  monthlyInvestmentInr: string;
  annualInterestRatePct: string;
  compounding: CompoundingMode;
  buyRule: BuyRule;
};

export type MonthlyFormField = "startDate" | "monthlyInvestmentInr" | "annualInterestRatePct";
export type MonthlyFormErrors = Partial<Record<MonthlyFormField, string>>;

export type MonthlyGoldSummary = {
  total_grams: number;
  average_cost_per_gram: number;
  current_price_per_gram: number;
  purchase_charge_pct: number;
  current_value_inr: number;
  gain_inr: number;
  return_pct: number | null;
  xirr_pct: number | null;
  cheapest_purchase: { date: string; price_per_gram: number };
  priciest_purchase: { date: string; price_per_gram: number };
  /** Extra grams the chosen rule bought versus the first trading day. */
  timing_edge_pct: number | null;
};

export type MonthlyRdSummary = {
  total_deposited_inr: number;
  maturity_value_inr: number;
  interest_earned_inr: number;
  return_pct: number | null;
  xirr_pct: number | null;
};

export type MonthlyComparison = {
  leader: "gold" | "inr_rd" | "tie";
  final_value_gap_inr: number;
  gap_pct_of_invested: number | null;
  gold_to_rd_value_ratio: number | null;
  xirr_gap_points: number | null;
  break_even_rd_rate_pct: number | null;
  share_of_installments_gold_ahead_pct: number;
  share_of_days_gold_ahead_pct: number | null;
  max_gold_lead: DatedValue;
  max_gold_shortfall: DatedValue;
};

export type MonthlySummary = {
  installment_count: number;
  total_invested_inr: number;
  first_deposit_date: string;
  last_deposit_date: string;
  holding_years: number;
  gold: MonthlyGoldSummary;
  inr_rd: MonthlyRdSummary;
  comparison: MonthlyComparison;
};

export type MonthlyInstallmentRow = {
  month: string;
  rd_deposit_date: string;
  gold_buy_date: string;
  market_price_per_gram: number;
  price_paid_per_gram: number;
  grams_bought: number;
  gold_value_now: number;
  rd_value_now: number;
  gold_ahead: boolean;
};

export type MonthlyYearEndRow = {
  year: number;
  as_of_date: string;
  invested_inr: number;
  gold_value: number;
  rd_value: number;
  lead_inr: number;
  gold_ahead: boolean;
};

export type MonthlyTimelinePoint = {
  date: string;
  gold_price_per_gram: number;
  invested_inr: number;
  rd_value: number;
  grams_held: number;
  gold_value: number;
  average_cost_per_gram: number | null;
};

/** Everything that depends on how the gold is priced. */
export type MonthlyViewData = {
  summary: MonthlySummary;
  installments: MonthlyInstallmentRow[];
  year_end_rows: MonthlyYearEndRow[];
  timeline: { points: MonthlyTimelinePoint[] };
};

export type MonthlySkippedMonth = {
  month: string;
  reason: "window_already_passed" | "window_not_finished" | "no_data_in_window";
};

export type MonthlyResult = {
  status: "success";
  run_id: string;
  generated_at: string;
  request: {
    requested_start_date: string | null;
    effective_start_date: string;
    first_deposit_date: string;
    end_date: string;
    monthly_investment_inr: number;
    annual_interest_rate_pct: number;
    compounding: CompoundingMode;
    buy_rule: BuyRule;
    buy_window: string;
    retail_charge_pct: number;
  };
  data_range: Omit<SavingsDataRange, "status">;
  views: Record<PriceView, MonthlyViewData>;
  skipped_months: MonthlySkippedMonth[];
  warnings: string[];
  metadata: RunMetadata;
};

export type MonthlyState = "idle" | "running" | "success" | "error";
