import type { SavingsResult } from "../../types/savingsTypes";
import { formatLongDate } from "../../utils/chartDates";
import { formatRupees, formatShare, getChangeTone } from "../../utils/formatters";
import {
  formatGrams,
  formatMultiple,
  formatRate,
  formatSignedPercent,
  formatYears,
} from "../../utils/savingsFormatters";
import { MetricCard } from "../common/MetricCard";

export function SavingsStatsGrid({ savingsResult }: { savingsResult: SavingsResult }) {
  const { summary } = savingsResult;
  const { gold, inr_savings: savings, comparison } = summary;

  return (
    <section className="metrics-grid" aria-label="Key statistics">
      <MetricCard
        metricTitle="Holding period"
        metricValue={formatYears(summary.holding_years)}
        metricCaption={`${summary.holding_days.toLocaleString("en-IN")} days`}
      />
      <MetricCard
        metricTitle="Rate savings needed"
        metricValue={formatRate(comparison.break_even_annual_rate_pct)}
        metricCaption="a year, to match gold"
      />
      <MetricCard
        metricTitle="Days gold was ahead"
        metricValue={formatShare(comparison.share_of_days_gold_ahead_pct, 0)}
        metricCaption="by growth since the start"
      />
      <MetricCard
        metricTitle="Savings in gold terms"
        metricValue={`${formatGrams(comparison.gold_equivalent_grams_now)} g`}
        metricCaption={`${formatGrams(comparison.gold_equivalent_grams_at_start)} g at the start`}
        changeTone={getChangeTone(comparison.gold_purchasing_power_change_pct)}
      />
      <MetricCard
        metricTitle="Gold's worst fall"
        metricValue={formatSignedPercent(gold.max_drawdown_pct)}
        metricCaption={`${formatLongDate(gold.peak_date)} to ${formatLongDate(gold.trough_date)}`}
        changeTone="negative"
      />
      <MetricCard
        metricTitle="Gold volatility"
        metricValue={formatShare(gold.annualized_volatility_pct)}
        metricCaption="a year, from daily moves"
      />
      <MetricCard
        metricTitle="Gold's highest value"
        metricValue={formatRupees(gold.highest_value.value)}
        metricCaption={formatLongDate(gold.highest_value.date)}
      />
      <MetricCard
        metricTitle="Gold's lowest value"
        metricValue={formatRupees(gold.lowest_value.value)}
        metricCaption={formatLongDate(gold.lowest_value.date)}
      />
      <MetricCard
        metricTitle="Interest earned"
        metricValue={formatRupees(savings.interest_earned_inr)}
        metricCaption={
          savings.effective_annual_yield_pct === null
            ? "simple interest"
            : `${formatRate(savings.effective_annual_yield_pct)} effective yearly yield`
        }
        changeTone="positive"
      />
      <MetricCard
        metricTitle="Gold's growth vs savings"
        metricValue={formatMultiple(comparison.gold_to_savings_growth_ratio)}
        metricCaption="gold's multiple divided by savings' multiple"
      />
    </section>
  );
}
