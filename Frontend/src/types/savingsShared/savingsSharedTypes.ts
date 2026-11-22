export type CompoundingMode = "simple" | "monthly" | "quarterly" | "half_yearly" | "yearly";

export type DatedValue = { date: string; value: number };

export type SavingsDataRange = {
  status: "success";
  earliest_date: string;
  latest_date: string;
  aligned_observations: number;
  data_fetched_at: string;
  is_stale: boolean;
};
