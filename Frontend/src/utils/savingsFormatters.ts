import { COMPOUNDING_OPTIONS } from "../config/savingsConfig";
import type { CompoundingMode } from "../types/savingsTypes";

const NOT_AVAILABLE_LABEL = "N/A";

export function formatGrams(grams: number): string {
  return grams.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function formatYears(years: number): string {
  return `${years.toFixed(1)} years`;
}

export function formatMultiple(multiple: number | null | undefined): string {
  if (multiple == null || !Number.isFinite(multiple)) return NOT_AVAILABLE_LABEL;
  return `${multiple.toLocaleString("en-IN", { maximumFractionDigits: 2 })}×`;
}

/** A change with a sign and thousands separators, such as "+1,674.6%". */
export function formatSignedPercent(percentValue: number | null | undefined): string {
  if (percentValue == null || !Number.isFinite(percentValue)) return NOT_AVAILABLE_LABEL;
  const formattedMagnitude = Math.abs(percentValue).toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (percentValue > 0) return `+${formattedMagnitude}%`;
  if (percentValue < 0) return `−${formattedMagnitude}%`;
  return `${formattedMagnitude}%`;
}

/** A plain rate with no sign, such as "7.25%". */
export function formatRate(percentValue: number | null | undefined): string {
  if (percentValue == null || !Number.isFinite(percentValue)) return NOT_AVAILABLE_LABEL;
  return `${percentValue.toFixed(2)}%`;
}

/** Indian short form for chart axes: ₹25K, ₹4.5L, ₹1.2Cr. */
export function formatCompactRupees(rupeeValue: number): string {
  const magnitude = Math.abs(rupeeValue);
  const sign = rupeeValue < 0 ? "−" : "";
  const withOneDecimal = (scaled: number) => scaled.toFixed(1).replace(/\.0$/, "");

  if (magnitude >= 1e7) return `${sign}₹${withOneDecimal(magnitude / 1e7)}Cr`;
  if (magnitude >= 1e5) return `${sign}₹${withOneDecimal(magnitude / 1e5)}L`;
  if (magnitude >= 1e3) return `${sign}₹${withOneDecimal(magnitude / 1e3)}K`;
  return `${sign}₹${magnitude.toFixed(0)}`;
}

export function describeInterest(
  annualInterestRatePct: number,
  compounding: CompoundingMode
): string {
  if (compounding === "simple") return `${annualInterestRatePct}% simple interest`;

  const compoundingLabel =
    COMPOUNDING_OPTIONS.find((option) => option.value === compounding)?.label ?? compounding;
  return `${annualInterestRatePct}% compounded ${compoundingLabel.toLowerCase()}`;
}
