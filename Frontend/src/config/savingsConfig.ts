import type { CompoundingMode, SavingsFormValues } from "../types/savingsTypes";

/** Keep these limits identical to the ones in Backend/savings_service.py. */
export const MAXIMUM_GOLD_GRAMS = 1_000_000;
export const MAXIMUM_INR_SAVINGS_AMOUNT = 1_000_000_000_000;
export const MAXIMUM_ANNUAL_INTEREST_RATE_PCT = 50;

export const COMPOUNDING_OPTIONS: { value: CompoundingMode; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "simple", label: "Simple (no compounding)" },
];

/** Quick picks only: they are typical ballpark rates, not data. */
export const INTEREST_RATE_PRESETS_PCT = [3, 4, 6.5, 7.5] as const;

export const DEFAULT_SAVINGS_FORM_VALUES: SavingsFormValues = {
  startDate: "",
  goldGrams: "1",
  inrSavingsAmount: "",
  annualInterestRatePct: "6.5",
  compounding: "quarterly",
};

/** Charts keep this many points: more adds weight but no visible detail. */
export const SAVINGS_CHART_MAXIMUM_POINTS = 700;
