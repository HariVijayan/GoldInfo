import type { AnalysisMetrics } from "../../types/analysisTypes";
import {
  calculatePercentChange,
  formatDate,
  formatPercent,
  formatRupees,
  formatShare,
  getChangeTone,
} from "../../utils/formatters";
import { MetricCard } from "../common/MetricCard";

export function KeyMetricsGrid({ metrics }: { metrics: AnalysisMetrics }) {
  const aboveHistoricalLowPct = calculatePercentChange(metrics.latest_price, metrics.historical_low);

  return (
    <section className="metrics-grid" aria-label="Key metrics">
      <MetricCard
        metricTitle="1-session change"
        metricValue={formatPercent(metrics.one_session_change_pct)}
        metricCaption={
          metrics.previous_observation_date
            ? `vs ${formatDate(metrics.previous_observation_date)}`
            : undefined
        }
        changeTone={getChangeTone(metrics.one_session_change_pct)}
      />
      <MetricCard
        metricTitle="7-day change"
        metricValue={formatPercent(metrics.seven_day_change_pct)}
        metricCaption={
          metrics.seven_day_reference_date
            ? `vs ${formatDate(metrics.seven_day_reference_date)}`
            : undefined
        }
        changeTone={getChangeTone(metrics.seven_day_change_pct)}
      />
      <MetricCard
        metricTitle="30-day change"
        metricValue={formatPercent(metrics.thirty_day_change_pct)}
        metricCaption={
          metrics.thirty_day_reference_date
            ? `vs ${formatDate(metrics.thirty_day_reference_date)}`
            : undefined
        }
        changeTone={getChangeTone(metrics.thirty_day_change_pct)}
      />
      <MetricCard
        metricTitle="Previous price"
        metricValue={formatRupees(metrics.previous_price)}
        metricCaption={formatDate(metrics.previous_observation_date)}
      />
      <MetricCard
        metricTitle="Below historical high"
        metricValue={formatShare(metrics.distance_below_high_pct, 2)}
        metricCaption={formatDate(metrics.historical_high_date)}
      />
      <MetricCard
        metricTitle="Above historical low"
        metricValue={formatShare(aboveHistoricalLowPct, 2)}
        metricCaption={formatDate(metrics.historical_low_date)}
      />
    </section>
  );
}
