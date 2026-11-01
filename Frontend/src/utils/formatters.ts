import { RUPEE_SYMBOL } from "../config/displayLabels";
import type { PriceSeriesOption } from "../config/priceSeriesConfig";
import type { ChangeTone } from "../types/analysisTypes";

const NOT_AVAILABLE_LABEL = "N/A";

export function formatPrice(priceValue: number | null | undefined): string {
  if (priceValue == null || !Number.isFinite(priceValue)) {
    return NOT_AVAILABLE_LABEL;
  }
  return priceValue.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** A price in rupees, for example "₹7,512.34". */
export function formatRupees(priceValue: number | null | undefined): string {
  const formattedPrice = formatPrice(priceValue);
  return formattedPrice === NOT_AVAILABLE_LABEL
    ? NOT_AVAILABLE_LABEL
    : `${RUPEE_SYMBOL}${formattedPrice}`;
}

/** A value of one series with its currency symbol when it has one. */
export function formatSeriesValue(
  seriesOption: PriceSeriesOption,
  priceValue: number | null | undefined
): string {
  const formattedPrice = formatPrice(priceValue);
  return formattedPrice === NOT_AVAILABLE_LABEL
    ? NOT_AVAILABLE_LABEL
    : `${seriesOption.valuePrefix}${formattedPrice}`;
}

/**
 * The backend names units in plain ASCII. This maps the ones the UI shows to
 * wording that carries the rupee symbol, and passes unknown units through.
 */
const BACKEND_UNIT_LABELS: Record<string, string> = {
  "INR/gram": "INR (₹) per gram",
};

export function formatBackendUnitLabel(backendUnit: string): string {
  return BACKEND_UNIT_LABELS[backendUnit] ?? backendUnit;
}

export function formatPercent(percentValue: number | null | undefined): string {
  if (percentValue == null || !Number.isFinite(percentValue)) {
    return NOT_AVAILABLE_LABEL;
  }
  return `${percentValue > 0 ? "+" : ""}${percentValue.toFixed(2)}%`;
}

/** A share between 0 and 100, with no plus sign. */
export function formatShare(percentValue: number | null | undefined, fractionDigits = 1): string {
  if (percentValue == null || !Number.isFinite(percentValue)) {
    return NOT_AVAILABLE_LABEL;
  }
  return `${percentValue.toFixed(fractionDigits)}%`;
}

export function formatDate(dateValue: string | null | undefined): string {
  return dateValue || NOT_AVAILABLE_LABEL;
}

export function calculatePercentChange(
  currentValue: number | null | undefined,
  baseValue: number | null | undefined
): number | null {
  if (
    currentValue == null ||
    baseValue == null ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(baseValue) ||
    baseValue === 0
  ) {
    return null;
  }
  return ((currentValue - baseValue) / baseValue) * 100;
}

export function getChangeTone(percentValue: number | null | undefined): ChangeTone {
  if (percentValue == null || !Number.isFinite(percentValue) || percentValue === 0) {
    return "neutral";
  }
  return percentValue > 0 ? "positive" : "negative";
}

export function clampPercent(percentValue: number | null | undefined): number {
  if (percentValue == null || !Number.isFinite(percentValue)) {
    return 0;
  }
  return Math.min(100, Math.max(0, percentValue));
}

/** Shows only as many decimals as the gap between ticks needs. */
export function createAxisTickFormatter(
  tickStep: number,
  valuePrefix: string
): (tickValue: number) => string {
  const fractionDigits = tickStep >= 1 ? 0 : tickStep >= 0.1 ? 1 : 2;
  return (tickValue: number) =>
    `${valuePrefix}${tickValue.toLocaleString("en-IN", { maximumFractionDigits: fractionDigits })}`;
}
