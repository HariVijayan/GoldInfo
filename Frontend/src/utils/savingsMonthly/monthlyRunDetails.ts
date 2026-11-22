import type { RunDetailItem } from "../../types/shared/artifactTypes";
import type { MonthlyResult } from "../../types/savingsMonthly/savingsMonthlyTypes";
import { formatLongDate } from "../shared/chartDates";
import { formatRupees } from "../shared/formatters";
import { describeInterest, formatPlainNumber, formatYears } from "../savingsShared/savingsFormatters";
import { describeBuyRule } from "./savingsMonthlyFormatters";

export function buildMonthlyRunDetails(monthlyResult: MonthlyResult): RunDetailItem[] {
  const { request } = monthlyResult;
  const originalSummary = monthlyResult.views.original.summary;
  return [
    { label: "Run ID", value: monthlyResult.run_id },
    { label: "Generated at", value: monthlyResult.generated_at },
    { label: "Monthly investment", value: formatRupees(request.monthly_investment_inr) },
    {
      label: "First payment",
      value:
        request.requested_start_date && request.requested_start_date !== request.first_deposit_date
          ? `${formatLongDate(request.first_deposit_date)} (asked for ${formatLongDate(request.requested_start_date)})`
          : formatLongDate(request.first_deposit_date),
    },
    { label: "Valued on", value: formatLongDate(request.end_date) },
    { label: "Installments", value: String(originalSummary.installment_count) },
    { label: "Holding period", value: formatYears(originalSummary.holding_years) },
    { label: "RD interest", value: describeInterest(request.annual_interest_rate_pct, request.compounding) },
    { label: "Gold bought on", value: `${describeBuyRule(request.buy_rule)} (${request.buy_window})` },
    { label: "Retail charge", value: `${formatPlainNumber(request.retail_charge_pct)}%` },
    {
      label: "Market data fetched",
      value: monthlyResult.data_range.is_stale
        ? `${monthlyResult.data_range.data_fetched_at} (saved copy)`
        : monthlyResult.data_range.data_fetched_at,
    },
  ];
}
