import { MAXIMUM_ANNUAL_INTEREST_RATE_PCT } from "../config/savingsConfig";
import { MAXIMUM_MONTHLY_INVESTMENT_INR } from "../config/savingsMonthlyConfig";
import type {
  MonthlyFormErrors,
  MonthlyFormValues,
  MonthlyRequestParams,
} from "../types/savingsMonthlyTypes";
import type { SavingsDataRange } from "../types/savingsTypes";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts "25,000" as well as "25000". Returns null when not a number. */
function parseNumberText(numberText: string): number | null {
  const cleanedText = numberText.trim().replace(/,/g, "");
  if (cleanedText === "") return null;
  const parsedNumber = Number(cleanedText);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

export type MonthlyFormCheck = {
  errors: MonthlyFormErrors;
  /** Present only when there are no errors. */
  requestParams: MonthlyRequestParams | null;
};

/**
 * Checks everything the backend would reject, so mistakes are explained next
 * to the field. The backend still validates, and also decides whether any
 * month has a finished buying window.
 */
export function validateMonthlyForm(
  formValues: MonthlyFormValues,
  dataRange: SavingsDataRange | null,
  retailChargePct: number
): MonthlyFormCheck {
  const errors: MonthlyFormErrors = {};

  const startDateText = formValues.startDate.trim();
  if (startDateText !== "") {
    if (!ISO_DATE_PATTERN.test(startDateText)) {
      errors.startDate = "Choose a valid date.";
    } else if (dataRange && startDateText < dataRange.earliest_date) {
      errors.startDate = `Data begins on ${dataRange.earliest_date}.`;
    } else if (dataRange && startDateText >= dataRange.latest_date) {
      errors.startDate = `Choose a date before ${dataRange.latest_date}.`;
    }
  }

  const monthlyInvestmentInr = parseNumberText(formValues.monthlyInvestmentInr);
  if (
    monthlyInvestmentInr === null ||
    monthlyInvestmentInr <= 0 ||
    monthlyInvestmentInr > MAXIMUM_MONTHLY_INVESTMENT_INR
  ) {
    errors.monthlyInvestmentInr = "Enter a monthly amount above 0.";
  }

  const annualInterestRatePct = parseNumberText(formValues.annualInterestRatePct);
  if (
    annualInterestRatePct === null ||
    annualInterestRatePct < 0 ||
    annualInterestRatePct > MAXIMUM_ANNUAL_INTEREST_RATE_PCT
  ) {
    errors.annualInterestRatePct = `Enter a rate from 0 to ${MAXIMUM_ANNUAL_INTEREST_RATE_PCT}.`;
  }

  if (
    Object.keys(errors).length > 0 ||
    monthlyInvestmentInr === null ||
    annualInterestRatePct === null
  ) {
    return { errors, requestParams: null };
  }

  return {
    errors,
    requestParams: {
      startDate: startDateText === "" ? null : startDateText,
      monthlyInvestmentInr,
      annualInterestRatePct,
      compounding: formValues.compounding,
      buyRule: formValues.buyRule,
      retailChargePct,
    },
  };
}
