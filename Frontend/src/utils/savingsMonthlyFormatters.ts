import { BUY_RULE_OPTIONS } from "../config/savingsMonthlyConfig";
import type { BuyRule } from "../types/savingsMonthlyTypes";
import { formatRupees } from "./formatters";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2010-06" becomes "Jun 2010". Anything else is returned unchanged. */
export function formatMonthLabel(monthText: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthText);
  if (!match) return monthText;
  const monthName = MONTH_NAMES[Number(match[2]) - 1];
  return monthName ? `${monthName} ${match[1]}` : monthText;
}

/** A rupee amount with an explicit sign, such as "+₹1,25,000". */
export function formatSignedRupees(rupeeValue: number | null | undefined): string {
  if (rupeeValue == null || !Number.isFinite(rupeeValue)) return "N/A";
  const formattedMagnitude = formatRupees(Math.abs(rupeeValue));
  if (rupeeValue > 0) return `+${formattedMagnitude}`;
  if (rupeeValue < 0) return `−${formattedMagnitude}`;
  return formattedMagnitude;
}

export function describeBuyRule(buyRule: BuyRule): string {
  return BUY_RULE_OPTIONS.find((option) => option.value === buyRule)?.label ?? buyRule;
}

