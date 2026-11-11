import {
  MAXIMUM_RETAIL_CHARGE_PCT,
  MINIMUM_RETAIL_CHARGE_PCT,
} from "../config/retailPricingConfig";

export type RetailChargeCheck =
  | { isValid: true; retailChargePct: number }
  | { isValid: false; errorMessage: string };

export function describeRetailChargeRule(): string {
  return `Enter a number from ${MINIMUM_RETAIL_CHARGE_PCT} to ${MAXIMUM_RETAIL_CHARGE_PCT}.`;
}

export function isValidRetailChargePct(candidate: unknown): candidate is number {
  return (
    typeof candidate === "number" &&
    Number.isFinite(candidate) &&
    candidate >= MINIMUM_RETAIL_CHARGE_PCT &&
    candidate <= MAXIMUM_RETAIL_CHARGE_PCT
  );
}

/** Checks the text a user typed. Nothing is committed unless it is valid. */
export function checkRetailChargeText(typedText: string): RetailChargeCheck {
  const trimmedText = typedText.trim();
  if (trimmedText === "") {
    return { isValid: false, errorMessage: describeRetailChargeRule() };
  }

  const parsedNumber = Number(trimmedText);
  if (!isValidRetailChargePct(parsedNumber)) {
    return { isValid: false, errorMessage: describeRetailChargeRule() };
  }

  return { isValid: true, retailChargePct: parsedNumber };
}
