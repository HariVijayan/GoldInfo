import {
  MAXIMUM_ANNUAL_INTEREST_RATE_PCT,
  MAXIMUM_GOLD_GRAMS,
  MAXIMUM_INR_SAVINGS_AMOUNT,
} from "../config/savingsConfig";
import type {
  SavingsDataRange,
  SavingsFormErrors,
  SavingsFormValues,
  SavingsRequestParams,
} from "../types/savingsTypes";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts "2,50,000" as well as "250000". Returns null when not a number. */
function parseNumberText(numberText: string): number | null {
  const cleanedText = numberText.trim().replace(/,/g, "");
  if (cleanedText === "") return null;
  const parsedNumber = Number(cleanedText);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

export type SavingsFormCheck = {
  errors: SavingsFormErrors;
  /** Present only when there are no errors. */
  requestParams: SavingsRequestParams | null;
};

/**
 * Checks everything the backend would reject, so mistakes are explained next
 * to the field instead of after a round trip. The backend still validates.
 */
export function validateSavingsForm(
  formValues: SavingsFormValues,
  dataRange: SavingsDataRange | null,
  retailChargePct: number
): SavingsFormCheck {
  const errors: SavingsFormErrors = {};

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

  const goldGrams = parseNumberText(formValues.goldGrams);
  if (goldGrams === null || goldGrams <= 0 || goldGrams > MAXIMUM_GOLD_GRAMS) {
    errors.goldGrams = `Enter grams above 0 and up to ${MAXIMUM_GOLD_GRAMS.toLocaleString("en-IN")}.`;
  }

  let inrSavingsAmount: number | null = null;
  if (formValues.inrSavingsAmount.trim() !== "") {
    inrSavingsAmount = parseNumberText(formValues.inrSavingsAmount);
    if (
      inrSavingsAmount === null ||
      inrSavingsAmount <= 0 ||
      inrSavingsAmount > MAXIMUM_INR_SAVINGS_AMOUNT
    ) {
      errors.inrSavingsAmount = "Enter an amount above 0, or leave it empty to match the gold.";
    }
  }

  const annualInterestRatePct = parseNumberText(formValues.annualInterestRatePct);
  if (
    annualInterestRatePct === null ||
    annualInterestRatePct < 0 ||
    annualInterestRatePct > MAXIMUM_ANNUAL_INTEREST_RATE_PCT
  ) {
    errors.annualInterestRatePct = `Enter a rate from 0 to ${MAXIMUM_ANNUAL_INTEREST_RATE_PCT}.`;
  }

  if (Object.keys(errors).length > 0 || goldGrams === null || annualInterestRatePct === null) {
    return { errors, requestParams: null };
  }

  return {
    errors,
    requestParams: {
      startDate: startDateText === "" ? null : startDateText,
      goldGrams,
      inrSavingsAmount,
      annualInterestRatePct,
      compounding: formValues.compounding,
      retailChargePct,
    },
  };
}
