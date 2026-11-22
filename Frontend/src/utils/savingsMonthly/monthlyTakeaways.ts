/** Plain-language findings for the monthly savings result, written only from numbers the server returned. */
import { GOLD_LABEL } from "../../config/shared/displayLabels";
import { formatLongDate } from "../shared/chartDates";
import { formatRupees } from "../shared/formatters";
import type { MonthlyViewedResult } from "./monthlyPriceView";
import { describeInterest, formatGrams, formatPlainNumber, formatRate, formatSignedPercent } from "../savingsShared/savingsFormatters";
import { formatMonthLabel, formatSignedRupees } from "./savingsMonthlyFormatters";

/** Plain-language findings, written only from numbers the server returned. */
export function buildMonthlyTakeaways(monthlyResult: MonthlyViewedResult): string[] {
  const { summary, request } = monthlyResult;
  const { gold, inr_rd: rd, comparison } = summary;
  const firstMonth = formatMonthLabel(summary.first_deposit_date.slice(0, 7));
  const lastMonth = formatMonthLabel(summary.last_deposit_date.slice(0, 7));
  const paidRetail = gold.purchase_charge_pct > 0;
  const takeaways: string[] = [];

  takeaways.push(
    `${formatRupees(request.monthly_investment_inr)} a month for ${summary.installment_count} months (${firstMonth} to ${lastMonth}) put ${formatRupees(
      summary.total_invested_inr
    )} into each option.`
  );

  takeaways.push(
    `${GOLD_LABEL} bought ${formatGrams(gold.total_grams)} g at an average ${formatRupees(gold.average_cost_per_gram)} a gram${
      paidRetail ? ` (retail, +${formatPlainNumber(gold.purchase_charge_pct)}%)` : ""
    }. At ${formatRupees(gold.current_price_per_gram)} a gram on ${formatLongDate(request.end_date)}${
      paidRetail ? " (the original price)" : ""
    } that is ${formatRupees(gold.current_value_inr)}: ${formatSignedPercent(gold.return_pct)} overall, ${formatRate(
      gold.xirr_pct
    )} a year.`
  );

  takeaways.push(
    `The RD at ${describeInterest(request.annual_interest_rate_pct, request.compounding)} grew to ${formatRupees(
      rd.maturity_value_inr
    )}: ${formatSignedPercent(rd.return_pct)} overall, ${formatRate(rd.xirr_pct)} a year.`
  );

  if (comparison.leader === "tie") {
    takeaways.push("Gold and the RD ended level.");
  } else {
    takeaways.push(
      `${comparison.leader === "gold" ? "Gold" : "The RD"} finished ahead by ${formatRupees(
        Math.abs(comparison.final_value_gap_inr)
      )} (${formatPlainNumber(Math.abs(comparison.gap_pct_of_invested ?? 0))}% of the money paid in).`
    );
  }

  if (comparison.break_even_rd_rate_pct !== null) {
    takeaways.push(`To match gold, the RD would have needed about ${formatRate(comparison.break_even_rd_rate_pct)} a year.`);
  }

  takeaways.push(
    `Each month's gold beat that month's RD instalment in ${comparison.share_of_installments_gold_ahead_pct.toFixed(0)}% of months. The gold portfolio was ahead of the RD on ${
      comparison.share_of_days_gold_ahead_pct === null ? "N/A" : comparison.share_of_days_gold_ahead_pct.toFixed(0)
    }% of days.`
  );

  if (request.buy_rule === "lowest_in_window" && gold.timing_edge_pct !== null) {
    takeaways.push(
      `Buying on the cheapest day of each window got ${formatSignedPercent(
        gold.timing_edge_pct
      )} more gold than buying on the first trading day.`
    );
  }

  takeaways.push(
    `Gold was furthest ahead on ${formatLongDate(comparison.max_gold_lead.date)} (${formatSignedRupees(
      comparison.max_gold_lead.value
    )}) and furthest behind on ${formatLongDate(comparison.max_gold_shortfall.date)} (${formatSignedRupees(
      comparison.max_gold_shortfall.value
    )}).`
  );

  return takeaways;
}
