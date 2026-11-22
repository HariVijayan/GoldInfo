import type { CompoundingMode } from "../../types/savingsShared/savingsSharedTypes";

/** Keep this limit identical to Backend/savings_service.py. */
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

/** Charts keep this many points: more adds weight but no visible detail. */
export const SAVINGS_CHART_MAXIMUM_POINTS = 700;
