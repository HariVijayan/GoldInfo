/** Plain-language findings for the lumpsum savings result, written only from numbers the server returned. */
import { GOLD_LABEL, RUPEE_SYMBOL } from "../../config/shared/displayLabels";
import type { SavingsViewedResult } from "./savingsPriceView";
import { formatLongDate } from "../shared/chartDates";
import { formatRupees } from "../shared/formatters";
import { describeInterest, formatGrams, formatMultiple, formatPlainNumber, formatRate, formatSignedPercent } from "../savingsShared/savingsFormatters";

/** Plain-language findings, written only from numbers the server returned. */
export function buildTakeaways(savingsResult: SavingsViewedResult): string[] {
  const { summary, request, currency_effect: currencyEffect } = savingsResult;
  const { gold, inr_savings: savings, comparison } = summary;
  const startDate = formatLongDate(request.effective_start_date);
  const endDate = formatLongDate(request.end_date);
  const takeaways: string[] = [];

  const paidRetail = gold.purchase_charge_pct > 0;
  takeaways.push(
    `${formatGrams(gold.grams)} g of ${GOLD_LABEL} bought on ${startDate}${
      paidRetail ? ` at the retail price (+${formatPlainNumber(gold.purchase_charge_pct)}%)` : ""
    } for ${formatRupees(gold.invested_inr)} was worth ${formatRupees(gold.current_value_inr)} on ${endDate}${
      paidRetail ? ", valued at the original price" : ""
    }: ${formatSignedPercent(gold.change_pct)}, or ${formatRate(gold.cagr_pct)} a year.`
  );

  if (paidRetail && currencyEffect.retail_cost_effect_pct !== null) {
    takeaways.push(
      `The retail charge alone costs ${formatSignedPercent(
        currencyEffect.retail_cost_effect_pct
      )} on day one, because the gold is worth the original price, not what was paid.`
    );
  }

  takeaways.push(
    `${formatRupees(savings.principal_inr)} in savings at ${describeInterest(
      request.annual_interest_rate_pct,
      request.compounding
    )} grew to ${formatRupees(savings.final_value_inr)}: ${formatSignedPercent(
      savings.change_pct
    )}, or ${formatRate(savings.cagr_pct)} a year.`
  );

  const gapText = Math.abs(comparison.change_gap_points ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });
  const basisNote = summary.same_budget
    ? ""
    : " (compared by percentage growth, because the starting amounts differ)";
  if (comparison.leader === "tie") {
    takeaways.push(`Gold and savings ended level${basisNote}.`);
  } else {
    takeaways.push(
      `${comparison.leader === "gold" ? "Gold" : "Savings"} finished ahead by ${gapText} percentage points${basisNote}.`
    );
  }

  if (comparison.break_even_annual_rate_pct !== null) {
    takeaways.push(
      `To match gold, the savings would have needed about ${formatRate(
        comparison.break_even_annual_rate_pct
      )} a year.`
    );
  }

  takeaways.push(
    `Measured in gold, the savings would buy ${formatGrams(
      comparison.gold_equivalent_grams_now
    )} g today against ${formatGrams(comparison.gold_equivalent_grams_at_start)} g at the start (${formatSignedPercent(
      comparison.gold_purchasing_power_change_pct
    )}).`
  );

  if (
    currencyEffect.gold_usd_change_pct !== null &&
    currencyEffect.usd_inr_change_pct !== null
  ) {
    const rupeeDirection = currencyEffect.usd_inr_change_pct >= 0 ? "weakened" : "strengthened";
    takeaways.push(
      `In US dollars gold moved ${formatSignedPercent(
        currencyEffect.gold_usd_change_pct
      )} while the rupee ${rupeeDirection} by ${Math.abs(
        currencyEffect.usd_inr_change_pct
      ).toLocaleString("en-IN", { maximumFractionDigits: 1 })}% against the dollar. Together they gave the ${RUPEE_SYMBOL} price its ${formatSignedPercent(
        currencyEffect.gold_inr_change_pct
      )}.`
    );
  }

  if (comparison.share_of_days_gold_ahead_pct !== null) {
    takeaways.push(
      `Gold's growth was ahead of the savings on ${comparison.share_of_days_gold_ahead_pct.toFixed(
        0
      )}% of days (by the end its growth was ${formatMultiple(comparison.gold_to_savings_growth_ratio)} the savings' growth).`
    );
  }

  return takeaways;
}
