import type { SavingsFormValues } from "../../types/savings/savingsTypes";

/** Keep these limits identical to the ones in Backend/savings_service.py. */
export const MAXIMUM_GOLD_GRAMS = 1_000_000;
export const MAXIMUM_INR_SAVINGS_AMOUNT = 1_000_000_000_000;

export const DEFAULT_SAVINGS_FORM_VALUES: SavingsFormValues = {
  startDate: "",
  goldGrams: "1",
  inrSavingsAmount: "",
  annualInterestRatePct: "6.5",
  compounding: "quarterly",
};
