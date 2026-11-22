import type { RunDetailItem } from "../../types/shared/artifactTypes";
import type { SavingsResult } from "../../types/savings/savingsTypes";
import { formatLongDate } from "../shared/chartDates";
import { describeInterest, formatPlainNumber, formatYears } from "../savingsShared/savingsFormatters";

export function buildSavingsRunDetails(savingsResult: SavingsResult): RunDetailItem[] {
  const { request } = savingsResult;
  return [
    { label: "Run ID", value: savingsResult.run_id },
    { label: "Generated at", value: savingsResult.generated_at },
    {
      label: "Purchase date",
      value:
        request.requested_start_date && request.requested_start_date !== request.effective_start_date
          ? `${formatLongDate(request.effective_start_date)} (asked for ${formatLongDate(request.requested_start_date)})`
          : formatLongDate(request.effective_start_date),
    },
    { label: "Compared up to", value: formatLongDate(request.end_date) },
    { label: "Holding period", value: formatYears(savingsResult.views.original.summary.holding_years) },
    { label: "Retail charge", value: `${formatPlainNumber(request.retail_charge_pct)}%` },
    {
      label: "Savings amount",
      value:
        request.inr_principal_source === "matched_to_gold_cost"
          ? "Matched to the gold's cost"
          : "Entered by you",
    },
    {
      label: "Interest",
      value: describeInterest(request.annual_interest_rate_pct, request.compounding),
    },
    {
      label: "Market data fetched",
      value: savingsResult.data_range.is_stale
        ? `${savingsResult.data_range.data_fetched_at} (saved copy)`
        : savingsResult.data_range.data_fetched_at,
    },
  ];
}
