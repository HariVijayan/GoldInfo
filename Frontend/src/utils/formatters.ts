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

export function formatPercent(percentValue: number | null | undefined): string {
  if (percentValue == null || !Number.isFinite(percentValue)) {
    return NOT_AVAILABLE_LABEL;
  }
  return `${percentValue > 0 ? "+" : ""}${percentValue.toFixed(2)}%`;
}

export function formatDate(dateValue: string | null | undefined): string {
  return dateValue || NOT_AVAILABLE_LABEL;
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
