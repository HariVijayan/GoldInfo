import { formatLongDate } from "../../utils/chartDates";
import { formatRupees, formatShare, getChangeTone } from "../../utils/formatters";
import type { MonthlyViewedResult } from "../../utils/priceViewSelectors";
import { formatMultiple, formatRate, formatSignedPercent, formatYears } from "../../utils/savingsFormatters";
import { formatSignedRupees } from "../../utils/savingsMonthlyFormatters";
import { MetricCard } from "../common/MetricCard";

export function MonthlyStatsGrid({ monthlyResult }: { monthlyResult: MonthlyViewedResult }) {
  const { summary, request } = monthlyResult;
  const { gold, inr_rd: rd, comparison } = summary;
  const usesCheapestDay = request.buy_rule === "lowest_in_window";

  return (
    <section className="metrics-grid" aria-label="Key statistics">
      <MetricCard
        metricTitle="Money paid in"
        metricValue={formatRupees(summary.total_invested_inr)}
        metricCaption={`${summary.installment_count} × ${formatRupees(request.monthly_investment_inr)}`}
      />
      <MetricCard
        metricTitle="Holding period"
        metricValue={formatYears(summary.holding_years)}
        metricCaption="first payment to last date"
      />
      <MetricCard
        metricTitle="Rate the RD needed"
        metricValue={formatRate(comparison.break_even_rd_rate_pct)}
        metricCaption="a year, to match gold"
      />
      <MetricCard
        metricTitle="Gold's growth vs RD"
        metricValue={formatMultiple(comparison.gold_to_rd_value_ratio)}
        metricCaption="final gold value ÷ final RD value"
      />
      <MetricCard
        metricTitle="Months gold beat the RD"
        metricValue={formatShare(comparison.share_of_installments_gold_ahead_pct, 0)}
        metricCaption="each installment vs its RD twin"
      />
      <MetricCard
        metricTitle="Days gold was ahead"
        metricValue={formatShare(comparison.share_of_days_gold_ahead_pct, 0)}
        metricCaption="portfolio vs RD balance"
      />
      <MetricCard
        metricTitle="Cheapest purchase"
        metricValue={`${formatRupees(gold.cheapest_purchase.price_per_gram)} /g`}
        metricCaption={formatLongDate(gold.cheapest_purchase.date)}
      />
      <MetricCard
        metricTitle="Priciest purchase"
        metricValue={`${formatRupees(gold.priciest_purchase.price_per_gram)} /g`}
        metricCaption={formatLongDate(gold.priciest_purchase.date)}
      />
      <MetricCard
        metricTitle="Gold's biggest lead"
        metricValue={formatSignedRupees(comparison.max_gold_lead.value)}
        metricCaption={formatLongDate(comparison.max_gold_lead.date)}
        changeTone={getChangeTone(comparison.max_gold_lead.value)}
      />
      <MetricCard
        metricTitle="Gold's biggest shortfall"
        metricValue={formatSignedRupees(comparison.max_gold_shortfall.value)}
        metricCaption={formatLongDate(comparison.max_gold_shortfall.date)}
        changeTone={getChangeTone(comparison.max_gold_shortfall.value)}
      />
      <MetricCard
        metricTitle="Cheapest-day edge"
        metricValue={usesCheapestDay ? formatSignedPercent(gold.timing_edge_pct) : "Not used"}
        metricCaption={
          usesCheapestDay ? "more gold than buying on the first day" : "gold bought on the first trading day"
        }
      />
      <MetricCard
        metricTitle="RD interest earned"
        metricValue={formatRupees(rd.interest_earned_inr)}
        metricCaption={`${formatRate(rd.xirr_pct)} a year on the money in`}
        changeTone="positive"
      />
    </section>
  );
}
