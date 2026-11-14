import { COMPOUNDING_OPTIONS } from "./savingsConfig";
import type { BuyRule, MonthlyFormValues } from "../types/savingsMonthlyTypes";

/** Keep this limit identical to Backend/monthly_savings_service.py. */
export const MAXIMUM_MONTHLY_INVESTMENT_INR = 1_000_000_000;

/** A recurring deposit adds interest to the balance, so "simple" is left out. */
export const MONTHLY_COMPOUNDING_OPTIONS = COMPOUNDING_OPTIONS.filter(
  (option) => option.value !== "simple"
);

/** The buying window is the 1st to the 10th of each month (Backend: BUY_WINDOW_LAST_DAY). */
export const BUY_RULE_OPTIONS: { value: BuyRule; label: string }[] = [
  { value: "lowest_in_window", label: "Cheapest day, 1st to 10th" },
  { value: "first_trading_day", label: "First trading day" },
];

export const DEFAULT_MONTHLY_FORM_VALUES: MonthlyFormValues = {
  startDate: "",
  monthlyInvestmentInr: "5000",
  annualInterestRatePct: "6.5",
  compounding: "quarterly",
  buyRule: "lowest_in_window",
};
